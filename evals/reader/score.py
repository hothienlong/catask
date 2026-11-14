#!/usr/bin/env python3
"""Score reader runs against cases.json. Stdlib only.

Usage: python3 -I score.py [--runs runs] [--out report.md]
Reads runs/<model>-<trial>.json (a JSON array of candidates) and runs/usage.json,
prints a summary and writes report.md.
"""
import argparse
import difflib
import json
import re
import statistics
from pathlib import Path

HERE = Path(__file__).resolve().parent
PRICES = {"opus": (4.0, 20.0), "sonnet": (2.0, 10.0), "haiku": (0.10, 0.50)}  # $ per 1M input / output
INPUT_SHARE = 0.9  # only total tokens are known
KEEP_CATS = ["direct_ask", "indirect_ask", "mention_question", "promise", "done",
             "deadline_decision", "tension", "thanks"]
TRAP_CATS = ["trap_other_ask", "trap_other_mention", "trap_group_wide", "trap_banter",
             "trap_system", "trap_out_of_window"]
THRESHOLD_CATS = ["indirect_ask", "mention_question"]
TYPE_GROUPS = {"ask": "ask", "question": "ask", "decision": "decision", "deadline": "decision"}


def load_json_lenient(path: Path):
    raw = path.read_text(encoding="utf-8").strip()
    raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        start, end = raw.find("["), raw.rfind("]")
        return json.loads(raw[start:end + 1])


def norm(s):
    return re.sub(r"\s+", " ", (s or "")).strip().lower()


def flag(item, key):
    # accept the old field names too (mentionsLong / sentByLong)
    for k in (key, key.replace("User", "Long")):
        if k in item:
            return bool(item[k])
    return None


def match(item, cases, by_id):
    mid = str(item.get("messageId") or item.get("id") or "")
    if mid in by_id:
        return by_id[mid]
    chat_id, t = item.get("chatId"), item.get("createdDateTime")
    frm = norm(item.get("from") if isinstance(item.get("from"), str) else json.dumps(item.get("from")))
    same_chat = [c for c in cases if c["chatId"] == chat_id] or cases
    for c in same_chat:
        if c["time"] == t and (not c["from"] or norm(c["from"]) in frm or frm in norm(c["from"])):
            return c
    text = norm(item.get("text"))
    if text:
        best, score = None, 0.0
        for c in same_chat:
            r = difflib.SequenceMatcher(None, text, norm(c["text"])).ratio()
            if r > score:
                best, score = c, r
        if score >= 0.6:
            return best
    return None


def score_run(items, cases):
    by_id = {c["id"]: c for c in cases}
    returned, unmatched = {}, 0
    for it in items:
        if not isinstance(it, dict) or it.get("noActivity"):
            continue
        c = match(it, cases, by_id)
        if c is None:
            unmatched += 1
        elif c["id"] not in returned:
            returned[c["id"]] = it
    keep = [c for c in cases if c["gold"]["keep"]]
    hit = [c for c in keep if c["id"] in returned]
    n_ret = len(returned) + unmatched
    traps = [c for c in cases if c["gold"]["category"] in TRAP_CATS]
    noise = [c for c in cases if c["gold"]["category"] == "noise"]
    ret_cases = [by_id[i] for i in returned]

    mflags = [(flag(returned[c["id"]], "mentionsUser"), c["gold"]["mentionsUser"]) for c in ret_cases]
    aflags = [(flag(returned[c["id"]], "mentionsUser"), "@minh trần" in norm(c["text"])) for c in ret_cases]
    sflags = [(flag(returned[c["id"]], "sentByUser"), c["gold"]["sentByUser"]) for c in ret_cases]
    types = [(str(returned[c["id"]].get("type", "")).lower(), c["gold"]["type"]) for c in hit]
    per_cat = {}
    for cat in KEEP_CATS:
        g = [c for c in keep if c["gold"]["category"] == cat]
        per_cat[cat] = sum(c["id"] in returned for c in g) / len(g) if g else None
    per_trap = {}
    for cat in TRAP_CATS:
        g = [c for c in cases if c["gold"]["category"] == cat]
        per_trap[cat] = sum(c["id"] in returned for c in g) / len(g)
    missed = [c for c in keep if c["id"] not in returned]
    flag_wrong = [c["id"] for c in ret_cases if flag(returned[c["id"]], "mentionsUser") != c["gold"]["mentionsUser"]]
    return {
        "recall": len(hit) / len(keep),
        "precision": len(hit) / n_ret if n_ret else 0.0,
        "returned": n_ret,
        "unmatched": unmatched,
        "trap_fp": sum(c["id"] in returned for c in traps) / len(traps),
        "noise_fp": sum(c["id"] in returned for c in noise) / len(noise),
        "flag_acc": sum(p == g for p, g in mflags) / len(mflags) if mflags else 0.0,
        "flag_acc_at": sum(p == g for p, g in aflags) / len(aflags) if aflags else 0.0,
        "sent_acc": sum(p == g for p, g in sflags) / len(sflags) if sflags else 0.0,
        "type_acc": sum(p == g for p, g in types) / len(types) if types else 0.0,
        "type_acc_loose": sum(TYPE_GROUPS.get(p, p) == TYPE_GROUPS.get(g, g) for p, g in types) / len(types) if types else 0.0,
        "forUser_miss": sum(c["gold"]["forUser"] for c in missed),
        "per_cat": per_cat,
        "per_trap": per_trap,
        "missed": [c["id"] for c in missed],
        "flag_wrong": flag_wrong,
    }


def cost(model, tokens):
    pin, pout = PRICES[model]
    return tokens * INPUT_SHARE * pin / 1e6 + tokens * (1 - INPUT_SHARE) * pout / 1e6


def agg(vals):
    vals = [v for v in vals if v is not None]
    if not vals:
        return "n/a"
    return vals, statistics.mean(vals), min(vals), max(vals)


def pct(vals):
    _, m, lo, hi = agg(vals)
    return f"{m*100:.0f}% ({lo*100:.0f}–{hi*100:.0f})"


def num(vals, fmt="{:.1f}"):
    _, m, lo, hi = agg(vals)
    return f"{fmt.format(m)} ({fmt.format(lo)}–{fmt.format(hi)})"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--runs", default=str(HERE / "runs"))
    ap.add_argument("--out", default=str(HERE / "report.md"))
    a = ap.parse_args()
    data = json.loads((HERE / "cases.json").read_text(encoding="utf-8"))
    cases = data["cases"]
    runs_dir = Path(a.runs)
    usage = json.loads((runs_dir / "usage.json").read_text(encoding="utf-8")) if (runs_dir / "usage.json").exists() else {}

    results = {}
    for f in sorted(runs_dir.glob("*-*.json")):
        m = re.match(r"(opus|sonnet|haiku)-(\d+)$", f.stem)
        if not m:
            continue
        r = score_run(load_json_lenient(f), cases)
        tok = (usage.get(f.stem) or {}).get("subagent_tokens")
        r["tokens"] = tok
        r["cost"] = cost(m.group(1), tok) if tok else None
        results.setdefault(m.group(1), {})[f.stem] = r

    models = [m for m in ("opus", "sonnet", "haiku") if m in results]
    n_keep = sum(c["gold"]["keep"] for c in cases)
    lines = ["# Reader eval report", "",
             f"{len(cases)} messages, {n_keep} gold keep=true, {len(results.get(models[0], {})) if models else 0} trials per model. "
             "Cells: mean (min–max over trials). Cost assumes 90% input / 10% output of the reported total tokens.", "",
             "| model | recall | precision | trap FP | noise FP | mention-flag acc (name / @-only) | sentBy acc | type acc (strict / loose) | forUser misses | returned | tokens | $/run |",
             "|---|---|---|---|---|---|---|---|---|---|---|---|"]
    for m in models:
        rs = list(results[m].values())
        g = lambda k: [r[k] for r in rs]
        lines.append(f"| {m} | {pct(g('recall'))} | {pct(g('precision'))} | {pct(g('trap_fp'))} | {pct(g('noise_fp'))} | "
                     f"{pct(g('flag_acc'))} / {pct(g('flag_acc_at'))} | {pct(g('sent_acc'))} | {pct(g('type_acc'))} / {pct(g('type_acc_loose'))} | "
                     f"{num(g('forUser_miss'))} | {num(g('returned'), '{:.0f}')} | {num(g('tokens'), '{:.0f}')} | "
                     f"{num(g('cost'), '${:.3f}')} |")

    lines += ["", "## Recall per category (keep=true)", "",
              "| category | n | " + " | ".join(models) + " |", "|---|---|" + "---|" * len(models)]
    for cat in KEEP_CATS:
        n = sum(1 for c in cases if c["gold"]["category"] == cat)
        lines.append(f"| {cat} | {n} | " + " | ".join(pct([r['per_cat'][cat] for r in results[m].values()]) for m in models) + " |")
    lines += ["", "## Trap false-positive rate per category (lower is better)", "",
              "| trap | n | " + " | ".join(models) + " |", "|---|---|" + "---|" * len(models)]
    for cat in TRAP_CATS:
        n = sum(1 for c in cases if c["gold"]["category"] == cat)
        lines.append(f"| {cat} | {n} | " + " | ".join(pct([r['per_trap'][cat] for r in results[m].values()]) for m in models) + " |")

    by_id = {c["id"]: c for c in cases}
    lines += ["", "## Misses and flag errors (message ids, count over trials)", ""]
    for m in models:
        from collections import Counter
        miss = Counter(i for r in results[m].values() for i in r["missed"])
        fw = Counter(i for r in results[m].values() for i in r["flag_wrong"])
        fmt = lambda cnt: "; ".join(f"{by_id[i]['gold']['category']} `{by_id[i]['text'][:50]}` ×{k}" for i, k in cnt.most_common()) or "none"
        lines.append(f"- **{m}** missed: {fmt(miss)}")
        lines.append(f"- **{m}** mention-flag wrong: {fmt(fw)}")

    verdict = []
    for m in models:
        rs = list(results[m].values())
        worst = {cat: min(r["per_cat"][cat] for r in rs) for cat in THRESHOLD_CATS}
        fl = statistics.mean(r["flag_acc"] for r in rs)
        fl_at = statistics.mean(r["flag_acc_at"] for r in rs)
        rec_ok = all(statistics.mean(r["per_cat"][c] for r in rs) >= 0.95 for c in THRESHOLD_CATS)
        verdict.append((m, rec_ok and fl >= 0.95, rec_ok and fl_at >= 0.95, worst, fl, fl_at))
    lines += ["", "## Verdict", "",
              "Threshold: switch the default to Haiku only if mean recall on indirect asks and on @mention+question are each ≥ 95% "
              "and mean mention-flag accuracy ≥ 95%.", ""]
    lines.append("Mention-flag gold has two readings: **name** = the user is @mentioned or addressed by name "
                 "(\"Mun ơi…\", \"Anh Mun gửi…\"); **@-only** = the text has a literal @mention.")
    lines.append("")
    for m, ok, ok_at, worst, fl, fl_at in verdict:
        lines.append(f"- {m}: name-gold {'PASS' if ok else 'fail'}, @-only gold {'PASS' if ok_at else 'fail'} "
                     f"(worst-trial recall indirect {worst['indirect_ask']*100:.0f}%, @mention+q {worst['mention_question']*100:.0f}%; "
                     f"mean flag acc {fl*100:.0f}% name / {fl_at*100:.0f}% @-only)")
    Path(a.out).write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
