# Changelog

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
