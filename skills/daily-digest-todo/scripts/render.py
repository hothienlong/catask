#!/usr/bin/env python3
"""Render a daily digest JSON into the HTML template.

Usage: python3 -I render.py <digest.json> <out.html>
Validates the minimal schema so a malformed run fails loudly instead of
publishing a blank page.
"""
import json
import re
import sys
from pathlib import Path

TEMPLATE = Path(__file__).resolve().parent.parent / "assets" / "digest-template.html"
TITLES = {"vi": "Bản tin tối", "en": "Evening digest"}
TIERS = {"now", "week", "watch"}
SOURCES = {"teams", "outlook", "calendar", "jira", "other"}
PRIORITIES = {"P0", "P1", "P2", "P3"}
QUOTE_MAX = 500
KINDS = {"ask", "question", "promise", "review", "deadline", "prep", "followup"}
SIGNALS = {
    "gaslighting", "silent_treatment", "passive_aggressive", "scope_creep",
    "false_urgency", "last_minute", "after_hours", "blame_shifting", "hot_potato",
    "micromanaging", "vague_ask", "credit_taking", "public_callout", "kudos",
}


def check_signals(where, sigs, errs):
    for j, s in enumerate(sigs or []):
        if s.get("type") not in SIGNALS:
            errs.append(f"{where}.signals[{j}].type must be one of {sorted(SIGNALS)}")
        if not s.get("note"):
            errs.append(f"{where}.signals[{j}] needs a note (the evidence)")


def check_quote(where, t, errs):
    if "quote" not in t or t["quote"] is None:
        return
    q = t["quote"]
    if not isinstance(q, dict):
        errs.append(f"{where}.quote must be an object {{from, time, text, at}}")
        return
    text = q.get("text")
    if not isinstance(text, str) or not text.strip():
        errs.append(f"{where}.quote.text must be a non-empty string")
    elif len(text) > QUOTE_MAX:
        errs.append(f"{where}.quote.text is {len(text)} chars; max {QUOTE_MAX}")
    for k in ("from", "time", "at"):
        if k in q and not isinstance(q[k], str):
            errs.append(f"{where}.quote.{k} must be a string")


# Structured pointer to the source item (ids only, never content). Required id key(s) per source.
REF_KEYS = {
    "teams": (("chatId", "messageId"), ("replyToId",)),
    "outlook": (("mailId",), ("conversationId",)),
    "jira": (("issueKey",), ("commentId",)),
    "calendar": (("eventId",), ()),
}
REF_ID_MAX = 512
JIRA_KEY = re.compile(r"^[A-Z][A-Z0-9]+-\d+$")


def check_ref(where, t, errs):
    if "ref" not in t or t["ref"] is None:
        return
    r = t["ref"]
    if not isinstance(r, dict):
        errs.append(f"{where}.ref must be an object like {{source, ...ids}}")
        return
    src = r.get("source")
    if src not in REF_KEYS:
        errs.append(f"{where}.ref.source must be one of {sorted(REF_KEYS)}")
        return
    need, opt = REF_KEYS[src]
    for k in need:
        if not isinstance(r.get(k), str) or not r[k].strip():
            errs.append(f"{where}.ref.{k} must be a non-empty string for source {src}")
    for k in opt:
        if k in r and r[k] is not None and not isinstance(r[k], str):
            errs.append(f"{where}.ref.{k} must be a string")
    extra = set(r) - {"source", *need, *opt}
    if extra:
        errs.append(f"{where}.ref has unknown keys {sorted(extra)} (ids only, no content)")
    for k, v in r.items():
        if isinstance(v, str) and len(v) > REF_ID_MAX:
            errs.append(f"{where}.ref.{k} is too long ({len(v)} chars); ids only")


def validate(d):
    errs = []
    for k in ("date", "dateLabel", "weekday", "todos"):
        if k not in d:
            errs.append(f"missing top-level key: {k}")
    if d.get("language") not in (None, "vi", "en"):
        errs.append('language must be "vi" or "en"')
    ids = set()
    for i, t in enumerate(d.get("todos", [])):
        for k in ("id", "title", "tier", "source"):
            if not t.get(k):
                errs.append(f"todos[{i}] missing {k}")
        if t.get("tier") not in TIERS:
            errs.append(f"todos[{i}].tier must be one of {sorted(TIERS)}")
        if t.get("source") not in SOURCES:
            errs.append(f"todos[{i}].source must be one of {sorted(SOURCES)}")
        if t.get("kind") not in KINDS:
            errs.append(f"todos[{i}].kind must be one of {sorted(KINDS)}")
        if "priority" in t and t["priority"] not in PRIORITIES:
            errs.append(f"todos[{i}].priority must be one of {sorted(PRIORITIES)}")
        for flag in ("vip", "keyChat"):
            if flag in t and not isinstance(t[flag], bool):
                errs.append(f"todos[{i}].{flag} must be true or false")
        check_quote(f"todos[{i}]", t, errs)
        check_ref(f"todos[{i}]", t, errs)
        # Bare Jira key seen in a chat/mail (e.g. "APP-123" without a link): the key only, no content.
        if t.get("jiraKey") is not None and not (isinstance(t["jiraKey"], str) and JIRA_KEY.match(t["jiraKey"])):
            errs.append(f"todos[{i}].jiraKey must be a Jira key like APP-123")
        # A new task that came out of an open one (e.g. the Jira check found the next step is mine).
        if t.get("followsUp") is not None and not (isinstance(t["followsUp"], str) and t["followsUp"].strip()):
            errs.append(f"todos[{i}].followsUp must be the id of the original todo")
        if isinstance(t.get("followsUp"), str) and t["followsUp"] == t.get("id"):
            errs.append(f"todos[{i}].followsUp can't point at itself")
        check_signals(f"todos[{i}]", t.get("signals"), errs)
        if t.get("id") in ids:
            errs.append(f"duplicate todo id {t.get('id')}")
        ids.add(t.get("id"))
    for i, h in enumerate(d.get("highlights", [])):
        check_signals(f"highlights[{i}]", h.get("signals"), errs)
    for i, x in enumerate(d.get("done", [])):
        if not x.get("title"):
            errs.append(f"done[{i}] missing title")
    for tid in d.get("top3", []):
        if tid not in ids:
            errs.append(f"top3 references unknown todo id {tid}")
    sug = d.get("suggested", [])
    if not isinstance(sug, list) or not all(isinstance(x, str) and x for x in sug):
        errs.append("suggested must be a list of todo ids (strings)")
    return errs


def main():
    if len(sys.argv) == 2 and sys.argv[1] in ("-h", "--help"):
        print(__doc__)
        return
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    data = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    errs = validate(data)
    if errs:
        sys.exit("Invalid digest JSON:\n- " + "\n- ".join(errs))
    title = f"{TITLES.get(data.get('language'), TITLES['en'])} {data['dateLabel']}"
    # Escape "</" so message text can never close the <script> block.
    blob = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
    html = TEMPLATE.read_text(encoding="utf-8").replace("__TITLE__", title).replace("__DATA__", blob)
    Path(sys.argv[2]).write_text(html, encoding="utf-8")
    print(f"wrote {sys.argv[2]} ({len(data['todos'])} todos)")


if __name__ == "__main__":
    main()
