#!/usr/bin/env python3
"""Compare A/B shadow digest runs with the real evening digest (stdlib only).

Usage: python3 -I ab_compare.py [--state-dir DIR] [--projects-dir DIR] [--config PATH] [--out FILE]

For every <state>/ab/<date>-<model>.json (written by the skill's "Shadow run"
mode) it loads the real <state>/<date>.json and compares the todos:
  - matching: ref ids / message id / Jira key / url first, else accent-insensitive
    title similarity (difflib ratio >= 0.6);
  - the shadow run never carries todos over, so recall is measured on the real
    digest's NEW todos (carried false); a shadow todo that matches a real carried
    one is counted apart, not as an extra;
  - priority agreement on matched pairs.
Cost: the real digest run is found in the local Claude Code transcripts with
run_tokens.py logic. Each shadow file is matched to its own shadow session: a
top-level transcript whose first prompt says "Unattended A/B shadow run for
catask" and whose prompt carries `shadow <model> <date>` (fallback: title
"catask A/B · <Model> ..." with the date, then closest start to startedAt).
Its cost = main transcript + every subagents/**/*.jsonl, deduped by
(message.id, requestId), each call priced by its own model. Tokens are split main
vs subagents per model, and priced per 1M tokens (input/output/cache read;
cache write = input x 1.25):
  opus 4/20/0.20, sonnet 2/10/0.10, haiku 0.10/0.50/0.01 (model ids matched by substring).
Quota: 5-hour and weekly % deltas from the shadow file, and from the real digest
JSON when it has weeklyBefore/weeklyAfter (else "n/a"). Quota % is 1%-granular
and shared with everything else running at the same time.
Writes <state>/ab/report.md (or --out) and prints it. Works with 0..n nights.
"""
import difflib
import importlib.util
import json
import re
import sys
import unicodedata
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
PRICES = {  # USD per 1M tokens: input, output, cacheRead
    "opus": (4.0, 20.0, 0.20),
    "sonnet": (2.0, 10.0, 0.10),
    "haiku": (0.10, 0.50, 0.01),
}
TITLE_RATIO = 0.6
AB_NAME = re.compile(r"^(\d{4}-\d{2}-\d{2})-([a-z0-9]+)\.json$")


def load_run_tokens():
    spec = importlib.util.spec_from_file_location("catask_run_tokens", HERE / "run_tokens.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def arg(argv, name, default=None):
    if name in argv:
        i = argv.index(name)
        if i + 1 < len(argv):
            return argv[i + 1]
    return default


def read_json(path):
    try:
        return json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


# ---------- todo matching ----------

def norm_title(s):
    s = unicodedata.normalize("NFKD", str(s or "")).replace("đ", "d").replace("Đ", "D")
    s = "".join(c for c in s if not unicodedata.combining(c)).lower()
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", s)).strip()


def norm_url(u):
    u = str(u or "").strip()
    if not u:
        return None
    u = re.sub(r"^https?://", "", u).rstrip("/")
    return u.lower()


def keys_of(todo):
    """Strong identity keys of a todo (ids, Jira key, url)."""
    keys = set()
    ref = todo.get("ref") if isinstance(todo.get("ref"), dict) else {}
    for f in ("messageId", "mailId", "eventId", "commentId"):
        if ref.get(f):
            keys.add(f"{f}:{ref[f]}")
    jira = ref.get("issueKey") or todo.get("jiraKey")
    if jira and not ref.get("commentId"):
        keys.add(f"jira:{str(jira).upper()}")
    elif jira:
        keys.add(f"jira:{str(jira).upper()}#{ref['commentId']}")
    url = norm_url(todo.get("url"))
    if url:
        keys.add(f"url:{url}")
        m = re.search(r"/l/message/[^/]+/(\d+)", url)
        if m:
            keys.add(f"messageId:{m.group(1)}")
    return keys


def match(real, shadow):
    """Greedy match: strong keys first, then title similarity. Returns [(ri, si, how)]."""
    pairs, used_r, used_s = [], set(), set()
    rkeys = [keys_of(t) for t in real]
    skeys = [keys_of(t) for t in shadow]
    for i, rk in enumerate(rkeys):
        for j, sk in enumerate(skeys):
            if j not in used_s and rk & sk:
                pairs.append((i, j, "id"))
                used_r.add(i)
                used_s.add(j)
                break
    cands = []
    for i, r in enumerate(real):
        if i in used_r:
            continue
        rt = norm_title(r.get("title"))
        for j, s in enumerate(shadow):
            if j in used_s:
                continue
            ratio = difflib.SequenceMatcher(None, rt, norm_title(s.get("title"))).ratio()
            if ratio >= TITLE_RATIO:
                cands.append((ratio, i, j))
    for ratio, i, j in sorted(cands, reverse=True):
        if i in used_r or j in used_s:
            continue
        pairs.append((i, j, f"title {ratio:.2f}"))
        used_r.add(i)
        used_s.add(j)
    return pairs


def compare_todos(real_todos, shadow_todos):
    real_new = [t for t in real_todos if not t.get("carried")]
    real_old = [t for t in real_todos if t.get("carried")]
    pairs = match(real_new, shadow_todos)
    used_s = {j for _, j, _ in pairs}
    rest = [(j, t) for j, t in enumerate(shadow_todos) if j not in used_s]
    old_pairs = match(real_old, [t for _, t in rest])
    used_old = {rest[j][0] for _, j, _ in old_pairs}
    matched_r = {i for i, _, _ in pairs}
    prio_same = sum(1 for i, j, _ in pairs
                    if (real_new[i].get("priority") or "") == (shadow_todos[j].get("priority") or ""))
    return {
        "realAll": len(real_todos), "realNew": len(real_new), "shadow": len(shadow_todos),
        "matched": len(pairs), "matchedCarried": len(old_pairs), "prioSame": prio_same,
        "missed": [t.get("title", "?") for i, t in enumerate(real_new) if i not in matched_r],
        "extra": [t.get("title", "?") for j, t in enumerate(shadow_todos) if j not in used_s and j not in used_old],
    }


# ---------- cost ----------

def price_of(model):
    m = str(model or "").lower()
    for k, p in PRICES.items():
        if k in m:
            return k, p
    return None, None


def usd(by_model):
    total, unknown = 0.0, 0
    for model, u in (by_model or {}).items():
        _, p = price_of(model)
        tok = sum((u or {}).get(k, 0) for k in ("input", "output", "cacheRead", "cacheWrite"))
        if not p:
            unknown += tok
            continue
        inp, out, cr = p
        total += (u.get("input", 0) * inp + u.get("output", 0) * out
                  + u.get("cacheRead", 0) * cr + u.get("cacheWrite", 0) * inp * 1.25) / 1e6
    return total, unknown


def models_label(by_model):
    names = sorted({price_of(m)[0] or m for m, u in (by_model or {}).items() if sum((u or {}).values())})
    return "+".join(names) or "-"


def tokens(by_model):
    return sum(sum((u or {}).values()) for u in (by_model or {}).values())


def parse_iso(s):
    try:
        return datetime.fromisoformat(str(s).replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None


def pick_run(runs, kind, date, near):
    """The run of `kind` on `date` whose time is closest to `near` (else the latest)."""
    cand = [r for r in runs if r.get("kind") == kind and r.get("date") == date]
    if not cand:
        return None
    t = parse_iso(near)
    if t:
        def dist(r):
            a, b = parse_iso(r.get("startIso")), parse_iso(r.get("endIso"))
            if not a or not b:
                return float("inf")
            if a <= t <= b:
                return 0
            return min(abs((t - a).total_seconds()), abs((t - b).total_seconds()))
        return min(cand, key=dist)
    return cand[0]


SHADOW_MARK = "Unattended A/B shadow run for catask"
SHADOW_ARGS = re.compile(r"\bshadow (haiku|sonnet|opus) (\d{4}-\d{2}-\d{2})\b")


def _prompt_text(content):
    """Text the user typed (string or text blocks); '' for tool results."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "\n".join(b.get("text", "") for b in content
                         if isinstance(b, dict) and b.get("type") == "text")
    return ""


def _scan_usage(path, seen, by_model, meta=None):
    with path.open(encoding="utf-8", errors="replace") as fh:
        for line in fh:
            try:
                rec = json.loads(line)
            except ValueError:
                continue
            if not isinstance(rec, dict):
                continue
            t = rec.get("type")
            if meta is not None:
                if t == "custom-title":
                    meta["title"] = rec.get("customTitle") or meta.get("title")
                elif t == "user" and not rec.get("isMeta"):
                    txt = _prompt_text((rec.get("message") or {}).get("content"))
                    if txt:
                        meta.setdefault("firstPrompt", txt)
                        if "args" not in meta:
                            m = SHADOW_ARGS.search(txt)
                            if m:
                                meta["args"] = (m.group(1), m.group(2))
                if rec.get("timestamp"):
                    meta.setdefault("first", rec["timestamp"])
            if t != "assistant":
                continue
            msg = rec.get("message") or {}
            u = msg.get("usage")
            if not u:
                continue
            key = (msg.get("id"), rec.get("requestId"))
            if key in seen:
                continue
            seen.add(key)
            acc = by_model.setdefault(msg.get("model") or "unknown",
                                      {"input": 0, "cacheRead": 0, "cacheWrite": 0, "output": 0})
            acc["input"] += u.get("input_tokens", 0) or 0
            acc["cacheRead"] += u.get("cache_read_input_tokens", 0) or 0
            acc["cacheWrite"] += u.get("cache_creation_input_tokens", 0) or 0
            acc["output"] += u.get("output_tokens", 0) or 0


def shadow_sessions(root, since_days):
    """Top-level sessions started by the unattended A/B shadow prompt."""
    import time
    root = Path(root).expanduser()
    cutoff = time.time() - since_days * 86400
    out = []
    for path in root.glob("*/*.jsonl"):
        try:
            if path.stat().st_mtime < cutoff:
                continue
            with path.open(encoding="utf-8", errors="replace") as fh:
                if SHADOW_MARK not in fh.read():
                    continue
        except OSError:
            continue
        meta, seen, main = {}, set(), {}
        _scan_usage(path, seen, main, meta)
        if SHADOW_MARK not in meta.get("firstPrompt", ""):
            continue
        sub = {}
        sub_dir = path.parent / path.stem / "subagents"
        for sf in sorted(sub_dir.rglob("*.jsonl")) if sub_dir.is_dir() else []:
            _scan_usage(sf, seen, sub)
        out.append({"runId": path.stem, "title": meta.get("title") or "",
                    "args": meta.get("args"), "startIso": meta.get("first"),
                    "byModel": {"main": main, "sub": sub}})
    return out


def pick_shadow(sessions, date, model, started):
    """The shadow session of (date, model): prompt args, else title + date, else time."""
    model = (model or "").lower()
    exact = [s for s in sessions if s.get("args") == (model, date)]
    if not exact:
        exact = [s for s in sessions if not s.get("args")
                 and s["title"].lower().startswith(f"catask a/b · {model}") and date in s["title"]]
    if not exact:
        exact = [s for s in sessions if not s.get("args")
                 and s["title"].lower().startswith(f"catask a/b · {model}")]
    if not exact:
        return None
    t = parse_iso(started)
    if not t or len(exact) == 1:
        return exact[0]

    def dist(s):
        a = parse_iso(s.get("startIso"))
        return abs((t - a).total_seconds()) if a else float("inf")
    return min(exact, key=dist)


def run_cost(run):
    if not run:
        return None
    bm = run.get("byModel") or {}
    main_usd, _ = usd(bm.get("main"))
    sub_usd, _ = usd(bm.get("sub"))
    return {"main": main_usd, "sub": sub_usd, "total": main_usd + sub_usd,
            "mainModels": models_label(bm.get("main")), "subModels": models_label(bm.get("sub")),
            "subTokens": tokens(bm.get("sub")), "runId": run.get("runId")}


# ---------- quota ----------

def pct(d, *names):
    if not isinstance(d, dict):
        return None
    for n in names:
        v = d.get(n)
        if isinstance(v, (int, float)):
            return v
        if isinstance(v, dict) and isinstance(v.get("percentUsed"), (int, float)):
            return v["percentUsed"]
    return None


def delta(a, b):
    return None if a is None or b is None else b - a


def quota_shadow(sf):
    b, a = sf.get("usageBefore"), sf.get("usageAfter")
    five = ("fiveHour", "5-hour limit", "fiveHourPercent", "5h")
    week = ("weekly", "Weekly · all models", "weeklyPercent", "weeklyAll")
    return delta(pct(b, *five), pct(a, *five)), delta(pct(b, *week), pct(a, *week))


def quota_real(real):
    if not isinstance(real, dict):
        return None, None
    wb, wa = real.get("weeklyBefore"), real.get("weeklyAfter")
    fb, fa = real.get("fiveHourBefore"), real.get("fiveHourAfter")
    num = lambda v: v if isinstance(v, (int, float)) else None
    return delta(num(fb), num(fa)), delta(num(wb), num(wa))


# ---------- report ----------

def fmt_usd(v):
    return "n/a" if v is None else f"${v:.2f}"


def fmt_pp(v):
    return "n/a" if v is None else f"{v:+g}%"


def fmt_pct(a, b):
    return "n/a" if not b else f"{100 * a / b:.0f}%"


def build(state, projects_dir, cfg_path):
    ab_dir = state / "ab"
    files = []
    if ab_dir.is_dir():
        for p in sorted(ab_dir.glob("*.json")):
            m = AB_NAME.match(p.name)
            if m:
                files.append((m.group(1), m.group(2), p))
    rows, runs, shadows = [], [], []
    if files:
        try:
            rt = load_run_tokens()
            argv = ["--config", cfg_path] if cfg_path else []
            if not cfg_path and (state / "config.json").exists():
                argv = ["--config", str(state / "config.json")]
            tz = rt.config_tz(rt.load_config(argv))
            oldest = min(d for d, _, _ in files)
            days = (datetime.now().date() - datetime.strptime(oldest, "%Y-%m-%d").date()).days + 3
            runs = rt.collect_runs(tz, max(days, 3), list(rt.DEFAULT_PREFIXES), projects_dir)
            shadows = shadow_sessions(projects_dir or rt.ROOT, max(days, 3))
        except Exception as e:  # cost is best-effort
            print(f"(cost lookup failed: {e})", file=sys.stderr)
            runs, shadows = [], []
    for date, model, path in files:
        sf = read_json(path) or {}
        real = read_json(state / f"{date}.json")
        sh_todos = sf.get("todos") if isinstance(sf.get("todos"), list) else []
        re_todos = real.get("todos") if isinstance(real, dict) and isinstance(real.get("todos"), list) else []
        sh_todos = [t for t in sh_todos if isinstance(t, dict)]
        re_todos = [t for t in re_todos if isinstance(t, dict)]
        cmp = compare_todos(re_todos, sh_todos)
        real_run = pick_run(runs, "digest", date, (real or {}).get("generatedAt"))
        ab_run = pick_shadow(shadows, date, sf.get("model") or model, sf.get("startedAt"))
        rows.append({
            "date": date, "model": sf.get("model") or model, "hasReal": real is not None,
            "candidates": sf.get("candidates"), "cmp": cmp,
            "realCost": run_cost(real_run), "abCost": run_cost(ab_run),
            "qShadow": quota_shadow(sf), "qReal": quota_real(real),
        })
    return rows


def render(rows):
    out = ["# catask A/B: shadow vs bản tin thật", ""]
    if not rows:
        out += ["Chưa có lần chạy shadow nào (`ab/<date>-<model>.json`).", ""]
        return "\n".join(out)
    out += ["## Chất lượng todo (theo đêm)", "",
            "Recall = khớp / việc mới của bản thật (bản shadow không mang việc cũ sang).", "",
            "| Ngày | Model | Thật (mới/tổng) | Shadow | Khớp | Recall | Khớp việc cũ | Thừa | Cùng priority | Ứng viên |",
            "|---|---|---|---|---|---|---|---|---|---|"]
    tot = {"realNew": 0, "shadow": 0, "matched": 0, "extra": 0, "prioSame": 0, "matchedCarried": 0}
    for r in rows:
        c = r["cmp"]
        real_txt = f"{c['realNew']}/{c['realAll']}" if r["hasReal"] else "thiếu file"
        out.append(f"| {r['date']} | {r['model']} | {real_txt} | {c['shadow']} | {c['matched']} | "
                   f"{fmt_pct(c['matched'], c['realNew'])} | {c['matchedCarried']} | {len(c['extra'])} | "
                   f"{fmt_pct(c['prioSame'], c['matched'])} | {r['candidates'] if r['candidates'] is not None else 'n/a'} |")
        for k in ("realNew", "shadow", "matched", "prioSame", "matchedCarried"):
            tot[k] += c[k]
        tot["extra"] += len(c["extra"])
    n = len(rows)
    out.append(f"| **Tổng ({n} đêm)** | | {tot['realNew']} | {tot['shadow']} | {tot['matched']} | "
               f"**{fmt_pct(tot['matched'], tot['realNew'])}** | {tot['matchedCarried']} | {tot['extra']} | "
               f"{fmt_pct(tot['prioSame'], tot['matched'])} | |")
    out.append("")

    out += ["## Shadow bỏ sót / thêm thừa", ""]
    any_diff = False
    for r in rows:
        c = r["cmp"]
        if not (c["missed"] or c["extra"]):
            continue
        any_diff = True
        out.append(f"**{r['date']} · {r['model']}**")
        out += [f"- Bỏ sót: {t}" for t in c["missed"]]
        out += [f"- Thừa: {t}" for t in c["extra"]]
        out.append("")
    if not any_diff:
        out += ["Không có.", ""]

    out += ["## Chi phí ước tính (USD, theo giá API)", "",
            "| Ngày | Thật: main | Thật: subagent | Thật: tổng | Shadow: main | Shadow: subagent | Shadow: tổng | Subagent shadow/thật |",
            "|---|---|---|---|---|---|---|---|"]
    sums = {"rs": 0.0, "as": 0.0, "rt": 0.0, "at": 0.0, "n": 0}
    for r in rows:
        rc, ac = r["realCost"], r["abCost"]
        lab = lambda c, part: "n/a" if not c else f"{fmt_usd(c[part])} ({c[part + 'Models']})"
        ratio = "n/a"
        if rc and ac and rc["sub"]:
            ratio = f"{100 * ac['sub'] / rc['sub']:.0f}%"
            sums["rs"] += rc["sub"]
            sums["as"] += ac["sub"]
            sums["rt"] += rc["total"]
            sums["at"] += ac["total"]
            sums["n"] += 1
        out.append(f"| {r['date']} | {lab(rc, 'main')} | {lab(rc, 'sub')} | {fmt_usd(rc and rc['total'])} | "
                   f"{lab(ac, 'main')} | {lab(ac, 'sub')} | {fmt_usd(ac and ac['total'])} | {ratio} |")
    if sums["n"]:
        k = sums["n"]
        out.append(f"| **TB/đêm ({k} đêm đủ số)** | | {fmt_usd(sums['rs'] / k)} | {fmt_usd(sums['rt'] / k)} | | "
                   f"{fmt_usd(sums['as'] / k)} | {fmt_usd(sums['at'] / k)} | **{fmt_pct(sums['as'], sums['rs'])}** |")
    out += ["", "Giá/1M token (input/output/cache read; cache write = input×1.25): opus 4/20/0.20, sonnet 2/10/0.10, haiku 0.10/0.50/0.01. "
            "Shadow bỏ các bước ghi (đồng bộ sổ, timeline, gửi tin) nên tổng của nó thấp hơn bản thật; so phần subagent là công bằng nhất.", ""]

    out += ["## Quota (điểm %)", "",
            "| Ngày | Shadow 5 giờ | Shadow tuần | Thật 5 giờ | Thật tuần |", "|---|---|---|---|---|"]
    for r in rows:
        (s5, sw), (r5, rw) = r["qShadow"], r["qReal"]
        out.append(f"| {r['date']} | {fmt_pp(s5)} | {fmt_pp(sw)} | {fmt_pp(r5)} | {fmt_pp(rw)} |")
    out += ["", "Quota % chỉ chính xác tới 1% và dùng chung với mọi việc khác chạy cùng lúc, nên chỉ xem như tham khảo.", ""]
    return "\n".join(out)


def main(argv):
    if "-h" in argv or "--help" in argv:
        print(__doc__)
        return 0
    sd = arg(argv, "--state-dir")
    if sd:
        state = Path(sd).expanduser()
    else:
        try:
            state = load_run_tokens().STATE_DIR
        except Exception:
            state = Path.home() / ".catask"
    report = render(build(state, arg(argv, "--projects-dir"), arg(argv, "--config")))
    out = Path(arg(argv, "--out") or (state / "ab" / "report.md")).expanduser()
    try:
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(report + "\n", encoding="utf-8")
    except OSError as e:
        print(f"(couldn't write {out}: {e})", file=sys.stderr)
    print(report)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
