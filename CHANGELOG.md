# Changelog

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
