#!/usr/bin/env python3
"""Token usage of recent digest runs, from Claude Code transcripts.

Usage: python3 -I run_tokens.py [--days 14] [--title-prefix "Evening digest"] [--config PATH]

Finds top-level sessions under ~/.claude/projects whose custom title starts with
the prefix (default: either "Evening digest" or "Bản tin tối", the two task names
the README suggests), sums the usage of every assistant call (main session + its
subagents, each API message counted once), and prints a JSON list, newest first:
  {"runId", "date", "start", "end", "minutes", "model", "calls", "subagents",
   "subagentModels", "main": {...}, "sub": {...}, "total": {...}, "equivInput"}
"subagentModels" maps each model the subagents ran on to its API call count
(e.g. {"claude-sonnet-4-5": 42}); {} when the run had no subagents.
Each usage block is {"input", "cacheRead", "cacheWrite", "output"}.
"equivInput" weights tokens by their relative price versus fresh input
(cache read 0.1x, cache write 1.25x, output 5x) so runs can be compared.
A run still in progress is reported with what it has logged so far ("partial": true).
Dates/times use the timezone from ~/.catask/config.json (default Asia/Ho_Chi_Minh).
"""
import json
import sys
import time
from datetime import datetime, timedelta, timezone
import os
from pathlib import Path

ROOT = Path.home() / ".claude" / "projects"
def _state_dir():
    """catask state dir: env override, else ~/.catask, else the legacy ~/Documents/daily-digest."""
    for var in ("CATASK_STATE_DIR", "CATASK_DIGEST_DIR"):
        if os.environ.get(var):
            return Path(os.environ[var]).expanduser()
    new = Path.home() / ".catask"
    if (new / "config.json").exists() or (new / "artifact-url.txt").exists():
        return new
    legacy = Path.home() / "Documents" / "daily-digest"
    try:
        if (legacy / "config.json").exists():
            return legacy
    except OSError:  # macOS privacy (EPERM) on ~/Documents
        pass
    return new


STATE_DIR = _state_dir()


def load_config(argv):
    """User config (~/.catask/config.json, or --config PATH). Missing file = defaults."""
    path = Path(argv[argv.index("--config") + 1]).expanduser() if "--config" in argv else STATE_DIR / "config.json"
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def config_tz(cfg):
    """Timezone from config: IANA name via zoneinfo, else utcOffsetHours, else UTC+7."""
    name = cfg.get("timezone") or "Asia/Ho_Chi_Minh"
    try:
        from zoneinfo import ZoneInfo
        return ZoneInfo(name)
    except Exception:
        return timezone(timedelta(hours=float(cfg.get("utcOffsetHours", 7))))
DEFAULT_PREFIXES = ("Evening digest", "Bản tin tối")
WEIGHTS = {"input": 1.0, "cacheRead": 0.1, "cacheWrite": 1.25, "output": 5.0}


def empty():
    return {"input": 0, "cacheRead": 0, "cacheWrite": 0, "output": 0}


def add_usage(acc, u):
    acc["input"] += u.get("input_tokens", 0) or 0
    acc["cacheRead"] += u.get("cache_read_input_tokens", 0) or 0
    acc["cacheWrite"] += u.get("cache_creation_input_tokens", 0) or 0
    acc["output"] += u.get("output_tokens", 0) or 0


def scan(path, acc, seen, meta, models=None):
    with path.open(encoding="utf-8", errors="replace") as fh:
        for line in fh:
            if '"type"' not in line:
                continue
            try:
                rec = json.loads(line)
            except ValueError:
                continue
            t = rec.get("type")
            if meta is not None and t == "custom-title":
                meta["title"] = rec.get("customTitle") or meta.get("title")
            if t != "assistant":
                continue
            ts = rec.get("timestamp")
            if meta is not None and ts:
                meta.setdefault("first", ts)
                meta["last"] = ts
            msg = rec.get("message") or {}
            if meta is not None and msg.get("model"):
                meta["model"] = msg["model"]
            mid, u = msg.get("id"), msg.get("usage")
            if not u or mid in seen:
                continue
            seen.add(mid)
            if models is not None and msg.get("model") and not msg["model"].startswith("<"):
                models[msg["model"]] = models.get(msg["model"], 0) + 1
            meta_calls = meta if meta is not None else None
            if meta_calls is not None:
                meta["calls"] = meta.get("calls", 0) + 1
            add_usage(acc, u)


def main(argv):
    if "-h" in argv or "--help" in argv:
        print(__doc__)
        return
    tz = config_tz(load_config(argv))
    days = int(argv[argv.index("--days") + 1]) if "--days" in argv else 14
    prefixes = [argv[argv.index("--title-prefix") + 1]] if "--title-prefix" in argv else list(DEFAULT_PREFIXES)
    cutoff = time.time() - days * 86400
    runs = []
    for path in ROOT.glob("*/*.jsonl"):
        try:
            if path.stat().st_mtime < cutoff:
                continue
            head = path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        if not any('"customTitle":"' + p in head or '"customTitle": "' + p in head for p in prefixes):
            continue
        meta, main_acc, seen = {}, empty(), set()
        scan(path, main_acc, seen, meta)
        if not meta.get("title", "").startswith(tuple(prefixes)) or "first" not in meta:
            continue
        sub_acc, sub_files, sub_models = empty(), sorted((path.parent / path.stem / "subagents").glob("*.jsonl")), {}
        for sf in sub_files:
            scan(sf, sub_acc, seen, None, sub_models)
        total = {k: main_acc[k] + sub_acc[k] for k in main_acc}
        first = datetime.fromisoformat(meta["first"].replace("Z", "+00:00")).astimezone(tz)
        last = datetime.fromisoformat(meta["last"].replace("Z", "+00:00")).astimezone(tz)
        runs.append({
            "runId": path.stem, "date": first.strftime("%Y-%m-%d"),
            "start": first.strftime("%H:%M"), "end": last.strftime("%H:%M"),
            "minutes": max(1, round((last - first).total_seconds() / 60)),
            "model": meta.get("model", ""), "calls": meta.get("calls", 0), "subagents": len(sub_files),
            "subagentModels": sub_models,
            "main": main_acc, "sub": sub_acc, "total": total,
            "equivInput": round(sum(total[k] * WEIGHTS[k] for k in total)),
            "partial": time.time() - path.stat().st_mtime < 120,
        })
    runs.sort(key=lambda r: (r["date"], r["start"]), reverse=True)
    print(json.dumps(runs, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main(sys.argv[1:])
