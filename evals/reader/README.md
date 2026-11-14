# Reader eval (catask digest, Step 2 chat reader)

Tests the chat-READER subagent of `skills/daily-digest-todo/SKILL.md`: given a few Teams chats (as `read_resource` returns them) it must return the candidate messages the main run turns into todos. All data is synthetic: fictional people, chats, company ("NovaID"), `example.com` addresses.

## Files

| file | what |
|---|---|
| `build_cases.py` | Source of the dataset. Writes `cases.json` (messages + gold) and `prompt.md` (what the reader sees, no gold). |
| `cases.json` | `meta` (user, window, keys, open todos) + `cases[]`: `id, chat, chatId, from, time (UTC), timeLocal, text, gold{keep, type, forUser, mentionsUser, sentByUser, category}` |
| `prompt.md` | The SKILL.md Step 2 reader brief, copied verbatim at build time, + run parameters + the chats as JSON (newest first, UTC times, system messages, image-only messages with `attachments`). |
| `runs/<model>-<trial>.json` | Reader output (JSON array of candidates). |
| `runs/usage.json` | `subagent_tokens` / `duration_ms` from each Agent task notification. |
| `score.py` | Scorer (stdlib). `python3 -I score.py` → prints and writes `report.md`. |

## Scenario

User "Mèo Mun", mobile engineer on eKYC / lending, Jira prefix `LD-`. Window 2026-11-13 08:00–20:00 (UTC+7). 10 chats: squad group, release group, partner integration group, BE-mobile sync (tense), large all-hands, lunch banter group, four 1:1s. 111 messages, 47 gold keep=true.

## Categories (`gold.category`)

Keep (gold `keep: true`):
- `direct_ask` (7) – asks addressed to Mun ("Mun review giúp anh MR…", "ông gửi tui file config…").
- `indirect_ask` (7) – "khi nào rảnh thì xem giúp", "nhờ em xem giúp", "có ai biết…" on his area, "bên mobile ai rảnh check hộ", soft suggestions.
- `mention_question` (6) – "@Mèo Mun" + a question.
- `promise` (6) – Mun's own commitments ("để em check", "mai em gửi").
- `done` (7) – Mun's done-evidence: fixed, approved MR, merged, sent, answers he gave.
- `deadline_decision` (6) – deadlines / decisions in chats he is in.
- `tension` (6) – passive-aggressive or repeated nudges (incl. Mun's own tense reply).
- `thanks` (2) – thanks to Mun.

Traps (gold `keep: false`):
- `trap_other_ask` (6), `trap_other_mention` (6) – asks / @mentions aimed at someone else.
- `trap_group_wide` (6) – "mn ơi…" not about his work (uniforms, Kafka, room booking, lunch vote).
- `trap_banter` (7) – jokes, football, coffee, incl. Mun's own banter.
- `trap_system` (8) – pins, member added, meeting started, renames, image/GIF-only messages.
- `trap_out_of_window` (6) – real asks to Mun but before 08:00 / after 20:00 / the day before.
- `noise` (25) – "ok", "👍", "dạ", replies between others.

Note: the brief says "when unsure, include it", so a trap false positive is cheap by design; recall matters most, precision is secondary.

## Scoring (`score.py`)

Each output item is matched to a gold message by `messageId`, else `chatId + createdDateTime + from`, else text similarity ≥ 0.6 within the chat. `noActivity` items are ignored; duplicates count once; unmatched items count against precision.

Per run, then mean (min–max) over trials per model:
- **recall** on keep=true, overall and per category.
- **precision** = matched keep=true / items returned. **trap FP** = share of trap messages returned (also per trap type); **noise FP** likewise.
- **mention-flag acc** on returned items, two golds: *name* (`gold.mentionsUser`: @mention or addressed by name) and *@-only* (text has a literal "@Mèo Mun"). `mentionsLong`/`sentByLong` are accepted as aliases. **sentBy acc** likewise.
- **type acc** on matched keep=true items: strict, and loose (ask≈question, decision≈deadline).
- **forUser misses** = keep=true & forUser=true messages not returned.
- **cost** = reported total tokens × 90% input / 10% output at $/1M: opus 4/20, sonnet 2/10, haiku 0.10/0.50. The totals include the general-purpose agent's own system prompt and tool schemas (~100k), so they overstate the reader's payload cost but compare models on equal footing.

Threshold under test: switch the default reader to Haiku only if recall on `indirect_ask` and `mention_question` ≥ 95% and mention-flag accuracy ≥ 95%.

## Re-running

1. Edit `build_cases.py`, run `python3 -I build_cases.py`.
2. For each model/trial, spawn a general-purpose Agent with `model` = opus|sonnet|haiku and prompt: read `evals/reader/prompt.md` (and nothing else), follow it, write the JSON array to `runs/<model>-<n>.json`. Copy `subagent_tokens` from each notification into `runs/usage.json`.
3. `python3 -I score.py`.
