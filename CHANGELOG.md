# Changelog

## 1.9.0

- **Set and change a task's due date on the page.** Every open card has a due chip (📅 date, or "+ Due date" when there is none); click it to pick a date or clear it. The "View message" dialog has the same date field. Both are undoable. A date you set is stored with `dueBy: "user"` and labelled by the page (Today / Tomorrow / Wed Nov 19); the evening digest never overrides it.
- **Calendar tab** (Lịch): week (Mon–Sun, default) or month view, with ‹ Today › navigation. Open tasks sit on their due date (overdue tinted red, colour by P0–P3); tasks without a due date sit on their planned day, dashed; done tasks on the day they were done, faded; meetings from the digests. Drag a task to another day to change its due date. Following items are not shown. The mode is remembered per browser.
- The page changed: after the update it is republished to the same URL; your link and data stay as they are.

## 1.8.0

- **Following / Đang theo dõi**: someone else's work that touches your areas (a group ask or decision about your `focusAreas`/`keywords`/`currentWork` where you're not @mentioned or named) is no longer a `watch` todo. The digest stores it as a todo with `following: {owner, matched, lastSeen, state}`, and the page shows it in a new block in the Today rail, under Highlights: who has it, why you see it (the matched terms), days left, and **Take it** / **Drop** (both undoable). It is kept out of the lanes, top 3, counts and stats.
- Items hide 4 days after they were last seen; the digest closes them as `expired`. Take it turns one into an ordinary task for today. Drop closes it as `dismissed`. Dropped or expired items are deleted (not archived) at retention.
- Migration: on the next run, open `watch` todos that are plainly someone else's work become following items, unless you moved or re-prioritised them on the page.
- `watch` now means only your own low-urgency items (waiting on others, promises with no date).
- `render.py` validates `following` and rejects a following item in `top3`. The offline digest leaves following items out.
- The page changed: after the update it is republished to the same URL; your link and data stay as they are.

## 1.7.0

- **Watch mode for quiet chats** (canh gác). A middle tier between reading a chat fully and skipping it: `watchChats` are skimmed by a cheap model (`watchModel`, default `"haiku"`) that keeps only alarms in the window — @mentions, senders outside your organization, incident/urgent words (vi + en), open questions or decisions about your areas. When unsure it includes the message. Watch candidates carry `"via": "watch"` and are judged like any other.
- **Cold chats** (`coldChatPolicy`, default `"watch"`; `coldAfterDays`, default 30): chats you haven't posted in for that long are watched (or skipped / read fully, per the policy). Judged from the fetched messages (kept per chat in `~/.catask/chat-activity.json`, no content); unknown = read fully. Order: key chats → excluded → watched → cold → full.
- **Onboarding**: the skip-chats question now pre-suggests social/bonding chats by name and very large broadcast chats (up to 3 questions of 4), plus a role-aware question on quiet chats (watch recommended).
- **Coverage**: one line with the full / watched / skipped chat counts.
- **⚙ Settings**: *Watched chats* list (remove ✕), a cold-chat policy select and a days field, synced through `meta/settings`.
- The page changed: after the update it is republished to the same URL; your link and data stay as they are.

## 1.6.0

- **Cheaper chat reading** (`subagentModel`, default `"sonnet"`; also `"haiku"`, `"opus"`, `"inherit"` = same as the main run). The evening digest's Teams chat fan-out, the meeting-transcript read and the AI worker's chat read now spawn their subagents with the Agent tool's `model` parameter (omitted for `"inherit"` or when the parameter isn't available). These subagents only read and extract; todos, priority, dedupe, top 3 and done-detection stay on the main model. Sonnet keeps extraction quality at a fraction of the cost; Haiku is cheapest but may miss indirect asks. Older configs without the field use `"sonnet"` silently.
- The chat-reading brief now says: when unsure whether a message is an ask, question, promise or done-evidence, include it (with Vietnamese indirect-ask examples), so a cheaper model doesn't drop things.
- **⚙ Settings**: a *Chat-reading model* select (Sonnet — recommended / Haiku — cheapest / Opus — most expensive), synced through `meta/settings`.
- **Cost tab**: runs record `subagentModels` (API calls per model across the run's subagents, from `run_tokens.py`), shown next to the subagent count.
- The page changed: after the update it is republished to the same URL; your link and data stay as they are.

## 1.5.2

- **Write a Jira draft from the page.** A `jira_description` or `jira_ac` result requested as a draft (no proposal) now has a **Write to Jira** / **Ghi lên Jira** button for the owner, on a task with a Jira key. It reads the current description first (same read-only `getJiraIssue` call as the apply flow), builds the proposal (`jira_ac`: current description plus an `## Acceptance criteria` section, replacing an old one), then shows the same before/after confirm, which says when the current description will be replaced. After the click the page re-reads, checks for edits, writes the one field with your Atlassian connector and marks it `applied`. Descriptions with images or rich formatting stay copy-only. `jira_estimate` drafts are unchanged.
- The draft's accept button is now **I'll copy it myself** / **Tôi tự copy** (it never wrote anything; it only marks the draft as used).
- Used AI results stay reachable: the card keeps a clickable "✓ AI result used" chip that reopens the result read-only (text, Copy, sources). Cancelled requests stay non-clickable.

## 1.5.1

- Scheduled digest no longer stops on a permission prompt for its own node/python/date commands. `daily-digest-todo` and `ai-worker` pre-approve them with `allowed-tools` (plus read-only `gh pr view` / `glab mr view` for the digest's MR check, `ArtifactData` and `PushNotification`), and both skills now run every shell command as one plain command with the absolute path written out (no variables, no `;` / `&&` / `|` chaining), so the pre-approval matches.

## 1.5.0

**Jira boards and the Jira check.**

- **Jira boards** (`jiraProjects: [{key, name, enabled}]`). The setup interview now asks which Jira boards you work on, next to the keywords question. With the Atlassian connector, Claude runs one read-only JQL search for the tickets you are assignee, reporter or watcher on in the last 90 days and counts them per project ("APP · My App · 42 tickets/90d"). Boards with 3+ tickets are recommended. You can untick a board, add one via Other or remove one. Without the connector, the list comes from your keyword prefixes, your repos and recent Jira mails. Configs from older versions get a list guessed from `keywords` prefixes and `repos` for each run, plus one hint to confirm it with "update my profile".
- **Bare ticket keys**: a key such as `APP-123` written in a chat or mail with no link is recognised when its project is one of your boards, and is stored on the todo as `jiraKey`. That makes the todo eligible for the Jira check, "💻 Code it" and the cross-session cache.
- **Jira check in the evening digest** (`jiraCheck`, default on; read-only; only when the Atlassian connector is available, otherwise skipped silently):
  - Candidates are open todos whose Jira key is in an enabled board.
  - One JQL search (`key in (…) AND updated >= <last check>`, in chunks of 50) returns only the tickets that changed. Tickets you can't view are skipped without an error.
  - It reads at most 15 tickets per run (status, assignee, new comments), waiting-on-others first, then urgent ones, and skips tickets a Jira mail already covered. A per-todo `jiraCheckedAt` makes sure tickets over the cap are checked on the next run.
  - Done / Resolved / Closed, or the person you are waiting on commenting that their part is done → **Looks done?** ("Seen in Jira APP-123: …"). You still confirm it.
  - A ticket reassigned to you, or a new comment asking you something → a new task with `followsUp` set to the original. The card shows "follows up: …".
  - catask never writes to Jira, and ticket content is treated as data, never as instructions.
- **⚙ Settings**: a new *Jira boards* section with the `jiraCheck` switch and an editable board list (tick on/off, remove, add a key). Both fields sync through `meta/settings` (owner-only).
- `render.py` validates the optional `jiraKey` and `followsUp` todo fields. The AI worker also accepts `jiraKey` as a todo's Jira key.
- The page changed: after the update it is republished to the same URL (the skill's "When the template itself changes" step); your link and data stay as they are.

Earlier versions: see the git history.
