#!/usr/bin/env python3
"""Work milestones from Claude Code sessions: title + time span only, never content.

Usage: python3 -I ai_milestones.py <YYYY-MM-DD> [--tz-offset 7] [--gap-min 45] [--config PATH]

Scans ~/.claude/projects/*/*.jsonl (top-level sessions, not subagents),
keeps user/assistant message timestamps that fall on the given local day,
and splits each session into active blocks wherever there is a gap longer
than --gap-min minutes. Prints a JSON list of blocks:
  {"title", "project", "group", "start": "HH:MM", "end": "HH:MM", "minutes", "sessionId"}
"project" is the session's folder name; "group" is the id of the first project in
config.json whose "match" hints appear (case-insensitive) in the session's folder path (else the
config's defaultProject when no projects are configured, else "khac").
The timezone comes from config.json ("timezone"); --tz-offset overrides it.
Fallback labels ("Unknown", "No folder", "Untitled session") follow config.json "language" ("vi" | "en", default "en").
Message text is never read into the output: only titles set by the app.
"""
import json
import sys
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


def parse_args(argv):
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__)
        sys.exit(0 if argv else 2)
    day = argv[0]
    cfg = load_config(argv)
    tz, gap = config_tz(cfg), 45
    if "--tz-offset" in argv:
        tz = timezone(timedelta(hours=float(argv[argv.index("--tz-offset") + 1])))
    if "--gap-min" in argv:
        gap = int(argv[argv.index("--gap-min") + 1])
    return day, tz, timedelta(minutes=gap), cfg


def project_group(cwd, cfg):
    """Map a session folder to a configured project id using its "match" hints."""
    projects = cfg.get("projects") or []
    low = (cwd or "").lower()
    for proj in projects:
        pid = str(proj.get("id") or "")
        hints = list(proj.get("match") or [])
        if pid and low and any(h and str(h).lower() in low for h in hints):
            return pid
    if not projects:
        return cfg.get("defaultProject") or "work"
    return "khac"


LABELS = {
    "vi": {"unknown": "Không rõ", "noFolder": "Không thư mục", "untitled": "Session không tên"},
    "en": {"unknown": "Unknown", "noFolder": "No folder", "untitled": "Untitled session"},
}


def labels(cfg):
    return LABELS.get(cfg.get("language"), LABELS["en"])


def project_label(cwd, lab):
    if not cwd:
        return lab["unknown"]
    if "scratch-workspaces" in cwd:
        return lab["noFolder"]
    return Path(cwd).name


def scan(path, day, tz, lab):
    title, ai_title, cwd, sid, stamps = None, None, None, path.stem, []
    try:
        with path.open(encoding="utf-8", errors="replace") as fh:
            for line in fh:
                if '"type"' not in line:
                    continue
                try:
                    rec = json.loads(line)
                except ValueError:
                    continue
                t = rec.get("type")
                if t == "custom-title":
                    title = rec.get("customTitle") or title
                elif t == "ai-title":
                    ai_title = rec.get("aiTitle") or rec.get("title") or ai_title
                elif t in ("user", "assistant") and not rec.get("isSidechain"):
                    ts = rec.get("timestamp")
                    cwd = cwd or rec.get("cwd")
                    sid = rec.get("sessionId") or sid
                    if ts:
                        local = datetime.fromisoformat(ts.replace("Z", "+00:00")).astimezone(tz)
                        if local.strftime("%Y-%m-%d") == day:
                            stamps.append(local)
    except OSError:
        return None
    if not stamps:
        return None
    return {"title": title or ai_title or lab["untitled"], "project": project_label(cwd, lab),
            "cwd": cwd, "sessionId": sid, "stamps": sorted(stamps)}


def blocks(sess, gap, group):
    out, start, prev = [], sess["stamps"][0], sess["stamps"][0]
    for s in sess["stamps"][1:] + [None]:
        if s is None or s - prev > gap:
            out.append({"title": sess["title"], "project": sess["project"], "group": group,
                        "sessionId": sess["sessionId"],
                        "start": start.strftime("%H:%M"), "end": prev.strftime("%H:%M"),
                        "minutes": max(1, round((prev - start).total_seconds() / 60))})
            if s is not None:
                start = s
        if s is not None:
            prev = s
    return out


def main():
    day, tz, gap, cfg = parse_args(sys.argv[1:])
    since = datetime.fromisoformat(day).replace(tzinfo=tz) - timedelta(days=1)
    result = []
    for path in ROOT.glob("*/*.jsonl"):
        try:
            if datetime.fromtimestamp(path.stat().st_mtime, tz) < since:
                continue
        except OSError:
            continue
        sess = scan(path, day, tz, labels(cfg))
        if sess:
            result.extend(blocks(sess, gap, project_group(sess["cwd"], cfg)))
    # Drop blips (opening a session for a minute) so the timeline shows real work blocks.
    result = [b for b in result if b["minutes"] >= 3]
    result.sort(key=lambda b: b["start"])
    print(json.dumps(result, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
