# catask

**Nothing slips through.**

English · [Tiếng Việt](README.vi.md)

[![Install with Claude](https://img.shields.io/badge/🤖_Install_with_Claude-copy_the_prompt-2a80d2?style=for-the-badge)](#-install-with-claude) [![llms.txt](https://img.shields.io/badge/llms.txt-for_AI_agents-13305a?style=for-the-badge)](llms.txt)

<sub>catask = **cat** + **task** + **ask**: a cat that keeps watch over every task and every ask.</sub>

## 🤖 Install with Claude

Copy this into Claude Code (or the Code tab of the Claude desktop app):

```text
Install the catask plugin for me: run `claude plugin marketplace add hothienlong/catask`, then `claude plugin install catask@catask` (if my organization has catask in its plugin library, use `claude plugin install catask@claudeai-organization-library` instead). Then run /catask:setup to set it up. If the new commands don't load in this session, tell me to open a new session and type /catask:setup.
```

![catask — Today board (demo data)](docs/screenshots/hom-nay.png)

<table>
  <tr>
    <td width="33%"><img src="docs/screenshots/theo-nguoi.png" alt="People tab"><br><sub><b>People</b>: what you owe each person and what they owe you</sub></td>
    <td width="33%"><img src="docs/screenshots/ngay.png" alt="Day tab"><br><sub><b>Day</b>: timeline of meetings, AI sessions and finished work</sub></td>
    <td width="33%"><img src="docs/screenshots/chi-phi.png" alt="Cost tab"><br><sub><b>Cost</b>: token cost of each scheduled run</sub></td>
  </tr>
  <tr>
    <td width="33%"><img src="docs/screenshots/xem-tin.png" alt="View message dialog"><br><sub><b>View message</b>: short snapshot of the source message, with a link to the original</sub></td>
    <td width="33%"><img src="docs/screenshots/cai-dat.png" alt="Settings drawer"><br><sub><b>Settings</b>: language, channels, work hours, important people, right on the page</sub></td>
    <td width="33%"><img src="docs/screenshots/giao-ai.png" alt="Hand to AI dialog"><br><sub><b>Hand to AI</b>: pick what AI should do; on a Jira ticket, 💻 Write code works in your local repo</sub></td>
  </tr>
  <tr>
    <td width="33%"><img src="docs/screenshots/ai-review.png" alt="Code review panel"><br><sub><b>Review code</b>: plan, checks and diff from the AI branch; you approve before push + draft MR</sub></td>
    <td width="33%"></td>
    <td width="33%"></td>
  </tr>
</table>

<sub>Screenshots use the built-in demo data. No real messages or people.</sub>

> **In one line:** every working day at your digest time (default: end of working hours + 1 h), Claude reads your Microsoft Teams and Outlook, collects every ask, every question waiting on you and every promise you made, and puts them on **one private catask page** so tomorrow morning you know what to do first. Output in **Vietnamese or English**.

## What it does

- ✅ **Prioritized TODO list**: asks addressed to you, unanswered questions, your own promises, deadlines (including HR/Admin mail), MR reviews, meeting prep.
- 🚦 **P0–P3 badges** (how critical it is, separate from when it's due): P0 critical (prod incident, blocking others, security, escalation), P1 important (anything your important people ask), P2 normal, P3 nice-to-have/FYI. You can change a todo's P on the page and Claude won't override it.
- ↕️ **Sort order**: overdue / due today → tasks with a real due date (earliest first, so a P2 due tomorrow beats a P1 with no date) → P0→P3 → oldest first. The top 3 uses the same order.
- 🔁 **Carry-over**: unfinished items stay. **AI suggests, you confirm**: when there's evidence a task is done (your "done/fixed", an MR link, an answer, a Jira Done mail, a merged MR, even in another chat that clearly matches the same task), the card shows **Looks done?** with the evidence and a link; you tap **✓ Done** or **✗ Not yet**. Nothing is closed without you.
- 🧩 **Done somewhere else? Claude asks.** After each digest, catask saves a short list of your open tasks (titles and Jira keys) on your Mac. When you work with Claude Code in any other project and finish something that clearly matches one (same Jira key, or the request is plainly that task), Claude asks **Mark catask#ID · title done?** before ending its turn. Only a **Yes** closes it. Turn off with `crossSessionDone: false` or in ⚙ Settings.
- 🏆 **Done today**: only recorded when there's real evidence in messages or mail.
- 🗂 **The ledger page** (a private Artifact): Today / Tomorrow / Waiting / Done board (drag and drop), plus People, Week, Day (timeline) and Cost tabs. **Mark done from anywhere**: any tab, including Day timeline items. Every status or priority change shows a small bar with **Undo** (or Ctrl/Cmd+Z) for about 6 seconds.
- ⚙ **Settings on the page**: change language, channels, working hours, important people, key chats and skipped chats (remove), keywords, role/current work, and the privacy switches from the ⚙ Settings button instead of editing `config.json`. Page edits take effect on the next digest run; language and signals change on the page right away.
- 💬 **View message**: open a short snapshot (≤500 characters) of the message that created a todo, right on the page, with a link to the original. Turn off with `storeQuotes: false`.
- ⭐ **Key chats and important people**: chats you pick are always read first; asks from your boss/PO/lead are bumped to at least P1.
- 📨 **Sends the link** to your own Teams notes chat (only to you, never to anyone else).
- 🌐 **Vietnamese or English**: chosen on first run; the page UI follows the same setting.
- 🧭 Optional: **communication signals** (false urgency, scope creep, kudos…). **Off by default.**
- 🤖 Optional: **Hand to AI** (beta). Click a button on a task and Claude drafts a reply, a summary or a Jira description / estimate for you to review; it never sends anything, and a Jira field changes only when you approve it on the page. **Off by default** (⚙ Settings).

> **🔒 Your data stays yours**
> - No catask server, no telemetry, no analytics. Nothing is sent to the plugin author or any third party.
> - Everything lives in your own claude.ai Artifact (an owner-only database) and in `~/Documents/daily-digest/` on your machine.
> - Teams, Outlook and Jira are read through **your own** Claude connectors, in your own Claude session. That content is processed by Claude under your account, like any other Claude chat.
> - Nothing is sent or posted on your behalf, except one link message to your own Teams notes chat. Code is pushed to **your** git remote only after you click approve.

## Requirements

| What | Required? | Notes |
|---|---|---|
| Claude desktop app | Yes | Runs the evening scheduled task at your digest time |
| Microsoft 365 connector | Yes | Settings → Connectors → Microsoft 365. Read access is enough; chat-send permission is optional |
| Artifacts with `db` | Yes | The ledger page stores its data in its own private store |
| Python 3 (3.9+) | Yes | Scripts use the standard library only and run with `python3 -I` |
| `get_usage` (session management) | No | If present, the Cost tab also records weekly-quota %; otherwise skipped |

## Install

**From GitHub** (anyone, in Claude Code or the Claude desktop app's Code tab):

```
/plugin marketplace add hothienlong/catask
/plugin install catask@catask
```

**Update** (GitHub installs):

- In a session: `/plugin marketplace update catask`, then `/reload-plugins`. Or run **`/catask:update`** and Claude does it for you and tells you the old → new version.
- From Terminal (works with the `claude` CLI or the one bundled with the Claude desktop app):

  ```
  C="$(command -v claude || ls -d "$HOME/Library/Application Support/Claude/claude-code"/*/*/claude.app/Contents/MacOS/claude | sort | tail -1)"; "$C" plugin marketplace update catask && "$C" plugin update catask@catask
  ```

  Then run `/reload-plugins` in an open session, or start a new one.
- **Automatic updates**: installs from your organization library update by themselves when Claude Code restarts. GitHub installs can turn on auto-update once: `/plugin` → **Marketplaces** → **catask** → **Enable auto-update** (off by default for GitHub marketplaces), or answer yes when `/catask:setup` offers it.

After installing, run **`/catask:setup`**: the setup interview, your digest schedule and (for developers) the runner, without running a digest yet. Or just say "evening digest" to set up and run the first one right away.

**From your organization's plugin library** (when published there):

```
/plugin install catask@claudeai-organization-library
```

**From the public plugin directory**: the install line will be added here once the plugin is approved and listed.

**Manually** (skill only):

```bash
mkdir -p ~/.claude/skills
cp -R skills/daily-digest-todo ~/.claude/skills/
```

## First run (about 5 minutes)

1. Connect the **Microsoft 365 connector** in the Claude app.
2. Type in Claude: `evening digest` (or `did anyone ask me for anything today?`).
3. Claude runs a short **setup interview** (3–4 rounds of multiple-choice questions, each with a free-text "Other", about 2 minutes) to create `~/Documents/daily-digest/config.json`: **"Tiếng Việt hay English?"** first, then which channels to watch, your **key chats** (picked from your ~15 most recent chats), chats to **skip** (e.g. social or team-bonding groups, optional), your **important people** (boss, PO, lead…), your working hours, your role and what you're working on now, keywords/ticket prefixes (e.g. `MOB-`), communication signals on/off, and whether to store message quotes. Your name and email come from Microsoft 365. Last, Claude offers to **create the evening schedule** right away (end of your working hours + ~1h, default 19:00, your working days): answer *Yes*, pick another time, or *Not now*. Nothing is scheduled without your Yes.
4. Claude publishes your **catask** page (private, yours), opens it for you, saves the link to `~/Documents/daily-digest/artifact-url.txt` and puts it at the top of its final message. The first run always ends with the page published; if publishing fails, Claude says why — just say `evening digest` again.
5. Pin the page. Done.

To change your answers later, say **`update my profile`** (or `cập nhật hồ sơ`). Claude asks the same questions with your current values preselected and merges the answers into your config (other fields are kept).

## Schedule it at your digest time

Claude offers to create this task for you in the setup interview (or say `update digest schedule` later). To do it by hand:

1. Claude app → **Scheduled → New task**.
2. Name: start with **`Evening digest`** (e.g. `Evening digest · catask`, or with your time: `Evening digest 18:30`) — or `Bản tin tối` if you prefer. The Cost tab uses these prefixes to find the runs.
3. Schedule: **your digest time, on your working days**. Default: end of working hours + 1 h, rounded to :00/:30, on your `workHours.days` (09:00–18:00 Mon–Fri → 19:00 Mon–Fri, cron `0 19 * * 1-5`). Pick your own time with `digestTime` (⚙ Settings). The first run suggests the time for you.
4. Prompt: paste the block from [`skills/daily-digest-todo/schedule-prompt.md`](skills/daily-digest-todo/schedule-prompt.md).

Note: the task only runs while the Claude app is open; if your computer is off at that time, it catches up when you open the app. After changing working hours or the digest time, say **`update digest schedule`** (or `đổi giờ bản tin theo cài đặt`) and Claude updates the task (after you confirm); the digest also reminds you when the schedule no longer matches your settings. If the scheduled run finds no config, it never stops to ask: it creates one with defaults (`"language": "en"`, all channels, 09:00–18:00 Mon–Fri) and leaves a warning suggesting `update my profile`.

## Hand to AI (optional, beta — off by default)

Let Claude draft a reply or a nudge, summarize a thread or ticket, prepare a meeting, or propose a Jira description, acceptance criteria or story-point estimate. **AI only drafts: it never sends, posts, replies or changes anything outside the ledger.** You read the result on the page and copy it — or, for a Jira proposal, approve it on the page and the page itself updates that one field with your own Atlassian connection.

1. **Turn it on**: page → ⚙ Settings → *AI assistant (beta)* → *Allow handing tasks to AI* → Save. Turning it off only hides the buttons; requests and results already stored are kept.
2. **Hand a task over**: click **🤖 Hand to AI** on an open task (board card, top 3, People row, or the View message dialog). The form shows the task and a collapsible **AI already knows** block (why, quote, source, ticket/link, priority, due), so you don't retype any of it. Then:
   - **What should AI do?** Chips depend on the task: Jira → *Write the description*, *Write acceptance criteria*, *Estimate story points*, *Summarize the ticket*; Teams/Outlook → *Draft a reply*, *Summarize the thread*, *Draft a nudge*; Calendar → *Prepare for the meeting*; always *Other…*. A chip prefills a short **Instruction** (≤300, editable; required for *Other…*).
   - **Extra context** (≤2000): paste the partner's request, SDK doc links, the scope of the change…
   - **Output**: *Draft only* (default), or — for the three Jira chips on a task with a Jira key — *Draft for a Jira update*.
   - Optional: tick *Re-read the source message* when the ledger isn't enough (costs more tokens). Click *Hand over*. The bar at the bottom offers **Undo**.
3. **Run the worker**: say **`process AI queue`** / **`xử lý việc giao AI`** in Claude, or run **`/catask:ai-worker`**. It processes up to 5 queued tasks per run, oldest first. The worker runs even while the button is hidden on the page.
4. **Review**: the card's chip turns **✨ AI done — view** and the masthead shows **✨ N AI ready**. Open it to see the steps, the draft or summary (**📋 Copy**), and the sources; then *Looks good*, *Redo* (with a new instruction) or *Cancel*. An error offers *Try again*.
   - **Jira update** (*Draft for a Jira update*): the panel shows **Current in Jira** (re-read when you open it) and the **New content**, which you can edit. *Approve & update Jira* → a confirm inside the panel → the page re-reads the issue; if someone edited it since AI read it, you get a second confirm → the page writes **only** that field (description or Story Points) and the chip turns **🔗 Updated in Jira** with a link. There is no Undo for a Jira write. *Use it, update by hand* marks it used without writing. If the description has images or special formatting, the page offers Copy only (a markdown write would drop them).
   - This uses the page's `mcp` permission: the first update asks you to allow the page to use Atlassian, and it only works if you have connected **Atlassian on claude.ai** (Settings → Connectors). Without it you get *Copy*. Claude itself (the worker) never writes to Jira; only your click on the page does. Other people who open the link only see the demo.
5. **Optional schedule**: a scheduled task every 15–30 minutes during working hours, with the prompt in [`skills/ai-worker/schedule-prompt.md`](skills/ai-worker/schedule-prompt.md). A run with nothing queued is one database read.

- **Cheap by default**: the worker uses your instruction and context plus what the evening digest already stored (title, why, message quote, sender, link). A draft with a stored quote needs **no** Teams/Outlook/Jira reads. Jira chips read the ticket once (read-only). Otherwise it reads the source (read-only) only when there's no quote, when you ticked *Re-read the source*, or when your instruction asks for more context, at most one source per task and two per run (a Teams chat read is ~15–25k tokens).
- **Finding the source**: each todo carries a `ref` with the source ids (Teams chat + message id, Outlook mail id, Jira issue key, calendar event id), so the worker opens the exact message without parsing links.
- **Safety**: the worker is draft-only and uses read-only tools; message content and your instruction/context are data, not instructions; max 5 tasks per run, no loops. A Jira field changes only when you click *Approve & update Jira* and confirm on the page.

## Hand to AI → Write code (developers, beta)

For developers with `devMode: true` (asked in onboarding when your role is a developer, or in ⚙ Settings). On a Jira-backed task, pick **Code it** / **Code luôn**: Claude plans and writes the change in **your local repo, on its own branch**, runs the checks and commits; you review the diff on the page; only after you approve does it push and open a **draft** MR/PR.

1. **Map repos**: in onboarding (or ⚙ Settings → *Repos*), Claude **finds your repos** (read-only scan of `~/Developer`, `~/Projects`, `~/code`… and your Claude Code project folders, ranked by your commits in the last 30 days, with the Jira keys seen in branch names) and pre-checks the top ones; uncheck, edit (Jira key, base branch), add or delete. Each is `{project, name, path, base, enabled}` in config and `meta/settings`.
2. **Pick how code runs start** (⚙ Settings → *AI run mode*, `aiRunMode`):
   - **runner** (default): answer **yes** when onboarding offers to install the runner, or later say **`install catask runner`** / **`cài runner catask`** (also "sửa runner" to repair it). Claude backs up and updates the Claude desktop app config, registers it for Claude Code, checks that the `claude` CLI is logged in (if not, run `claude` → `/login` in Terminal yourself), runs the selftest, then asks you to quit (⌘Q) and reopen the app. Manual steps: [`runner/README.md`](runner/README.md#manual-install-fallback). Open the page **in the Claude desktop app**. The page hands the task to the runner, which starts a headless Claude run; progress and results come back through the page (the headless run has no ledger access, so the page is the bridge). Details: [`runner/README.md`](runner/README.md).
   - Handing a code task over from a **browser** opens the page in the Claude desktop app automatically, and it starts the run from there. Open the page in the app at least once first.
   - **desktop**: say "enable desktop mode" / "bật chế độ desktop cho AI code" and Claude creates a desktop scheduled task (after you confirm) that checks the queue every ~2 minutes during working hours (cron from your working hours, e.g. 09:00–18:00 Mon–Fri → `*/2 9-17 * * 1-5`; the app can't go below 1 minute and adds a few minutes of jitter). Every run costs some tokens even when idle.
   - Either way you can also paste `catask#<id>` into Claude (or say "làm task SF-3102").
3. **Flow**: plan (shown for approval unless it is small: ≤3 files, low risk, no questions) → code on `feature/<KEY>-<title>` (or the existing branch for that key; base = your hint, else the matching `sprint/*`/`release/*`, else the default branch) → checks (`flutter analyze`/tests, `yarn typecheck`/`lint`…) → commit `<KEY>: <summary>` → **review the diff** → *Approve push* (draft MR/PR) or *Request changes* (a new round, new commit). When the MR is merged, the evening digest asks **Looks done?** on the card; you confirm.
- **Safety**: the repo must be clean (it never stashes); it never commits to main/master/develop/sprint/release, never force-pushes, never merges, never writes to Jira; at most 10 files per round; one code run at a time; your checkout is switched back to the branch you were on.

## Configuration (`~/Documents/daily-digest/config.json`)

Example: [`config.example.json`](config.example.json).

| Field | Default | Meaning |
|---|---|---|
| `displayName`, `email` | from `get_me` | Who you are in Microsoft 365 |
| `mentionName` | = `displayName` | Your name as it renders in Teams @mentions, e.g. `Nguyễn Văn A (Software Engineer)` |
| `timezone` | `Asia/Ho_Chi_Minh` | Time zone for display and day boundaries |
| `utcOffsetHours` | `7` | Fallback when `timezone` can't be read |
| `language` | asked on first run (`en` when unattended) | Output language: **`vi`** (Vietnamese) or **`en`** (English). Applies to the digest text, Teams message, chat reply and the page UI |
| `defaultProject` | `work` | Default project for items from Teams/Outlook |
| `projects` | `[{id:"work",label:"Work"}]` | List of `{id, label, match}`; `match` holds folder-name/keyword hints that map Claude Code hours and items to a project |
| `focusAreas` | `[]` | Areas you own; group questions touching them go to "watch" |
| `notifyChat` | `48:notes` | Your own Teams notes chat |
| `signals` | `false` | Turn communication-signal badges on/off |
| `aiAgent` | `false` | Show the page's "🤖 Hand to AI" button, AI chips and "✨ AI ready" count. Off only hides them; stored requests are kept. Also in ⚙ Settings |
| `devMode` | `false` | You write code: enables *Hand to AI → Write code* on Jira-backed tasks. Asked in onboarding for developer roles; also in ⚙ Settings |
| `repos` | `[]` | `[{project, name, path, base, enabled}]`: Jira project key → local repo (absolute `path`, optional base branch, `enabled` default `true`). Found for you in onboarding. Used by code tasks and the runner |
| `aiRunMode` | `"runner"` | How code tasks start: `"runner"` (local `catask-runner` MCP, via the page) or `"desktop"` (Claude desktop scheduled task every ~2 min) |
| `runner` | absent | Optional `{claudePath, allowedTools, extraPath}` for the local `catask-runner` MCP ([`runner/README.md`](runner/README.md)) |
| `subagentChatsPerAgent` | `5` | Chats read per subagent |
| `maxChats` | `40` | Max chats scanned per run |
| `skipChatsOverMembers` | `40` | Skip chats bigger than this (unless you're tagged) |
| `channels` | all five | Sources to read: `teamsChats`, `teamsChannelMentions`, `outlookMail`, `jiraMail`, `calendar`. Skipped sources are listed in the coverage notes |
| `keyChats` | `[]` | `[{id, topic}]`: chats always read first every run (outside `maxChats`); asks there go up one priority level |
| `excludeChats` | `[]` | `[{id, topic}]`: chats never read (e.g. social or team-bonding groups); dropped before the busiest `maxChats` are picked. A chat that is also a key chat is still read. Remove in ⚙ Settings; add via `update my profile`. Hand-written entries may also be a chat name or a `19:…` chat id (for both lists); Claude matches names to your chats and saves them back as `[{id, topic}]` |
| `vipPeople` | `[]` | `[{name, email?, why?}]`: boss, PO, lead…; their asks are at least P1. Names and "why" also show in the page's ⚙ Settings (owner-only store); emails stay in your local config only |
| `workHours` | `{start:"09:00", end:"18:00", days:[1,2,3,4,5]}` | Working hours (ISO weekdays, Mon = 1). Used for the "after hours" signal and the suggested schedule time |
| `digestTime` | `null` | Your evening digest time `"HH:MM"`; `null` = end of working hours + 1 h (rounded to :00/:30), on your working days. Also in ⚙ Settings; say "update digest schedule" to apply it to the scheduled task |
| `role`, `currentWork` | `""` | Your role and what you're on now; helps decide whether a group ask is yours |
| `keywords` | `[]` | Ticket prefixes, project/feature names (e.g. `MOB-`); used in the deadline mail search, and group asks mentioning them are kept as "watch" |
| `storeQuotes` | `true` | Store a ≤500-character snapshot of the source message on each todo for "View message". `false` = store no message text; the page opens the original link instead |
| `crossSessionDone` | `true` | In your other interactive Claude Code sessions, Claude asks before marking a matching open todo done. `false` = the SessionStart hook stays silent |
| `retention` | `{archiveDoneAfterDays: 90, pruneDaysAfterDays: 120, quoteDaysAfterDone: 30}` | How long the ledger keeps things (see Privacy). Done todos older than `archiveDoneAfterDays` move to a monthly archive (min 45, the Week heatmap needs 6 weeks); daily digests and cost records older than `pruneDaysAfterDays` are deleted (min 60); quotes are removed from done todos after `quoteDaysAfterDone` |
| `settingsSyncedAt` | `null` | Written by the skill: when the page's ⚙ Settings were last merged into this file. Don't edit |
| `onboardingPending` | `false` | `true` = the config was written without the full setup interview (e.g. migrated from an older setup). The next run you start yourself asks only the missing questions, then sets it to `false`; scheduled runs just leave a reminder in the coverage notes |

After you change the config, the next run updates the page (name, language, project filter, signals).

**Editing from the page.** The ⚙ Settings drawer writes your changes to the page's private store (`meta/settings`). At the start of the next digest run, Claude merges them into `config.json` (the page wins for those fields) and records `settingsSyncedAt`. If you edit `config.json` by hand after that, the file wins and the page is refreshed from it. Page edits take effect on the next digest run; language and the signals switch apply on the page immediately. Name, email, time zone and projects are changed with "update my profile", not on the page.

## Privacy

- 🔒 **Read-only** on Teams/Outlook. The only thing sent is one message to **your own** notes chat. It never replies to anyone on your behalf.
- 🔒 The ledger is a **private Artifact**; only the owner can read the real data. Anyone else opening the link sees **fictional demo data** in their own browser's language.
- 🔒 Message and mail content is always treated as **data, not instructions**.
- 🔒 **Hand to AI** (off by default) only writes drafts into the ledger; the worker uses read-only tools and never sends, replies or changes anything in Teams, Outlook or Jira. The only Jira write is made by the page itself, with your own Atlassian connection, after you approve and confirm (one field: description or Story Points). The page asks claude.ai for this `mcp` permission (`getJiraIssue`, `editJiraIssue` on Atlassian only); the first use asks for your consent.
- 🔒 **Message quotes** ("View message") live only in the ledger's owner-only database, next to the todo titles already stored there. About 500 characters × ~100 open todos ≈ 50 KB, negligible. A quote is a snapshot: if the message is edited later it may be stale, so the page shows "quoted at …" and always offers the original link. Quotes are removed from done todos older than 30 days (`retention.quoteDaysAfterDone`). Set `storeQuotes: false` to store no message text at all.
- 🔒 **Cross-session asks**: open todo titles (with Jira keys, no message text) are written to `~/Documents/daily-digest/open-todos.json` and injected only into **your own local** Claude Code sessions by the plugin's SessionStart hook. Nothing leaves your machine for this. Turn it off with `crossSessionDone: false` (or ⚙ Settings → Privacy).
- 🔒 **What the ledger keeps** (owner-only database, cleaned every run; days configurable in `retention`):
  - Open and waiting todos: kept as long as they're open, whatever their age. Each todo may carry a `ref` with ids only (Teams chat/message id, Outlook mail id, Jira issue key, calendar event id), never message text, and, if you used Hand to AI, an `ai` field with your request and the draft (≤2000 characters).
  - Done todos: kept in full for 90 days after they were done, so the Week tab and heatmap work. After that they move to a monthly archive (`archive/<YYYY-MM>`) with only id, title, done date, person, project, priority, kind and source; the full todo (why, link, quote) is deleted. A todo you changed on the page in the last 7 days is never moved that run.
  - Daily digests (`days/…`) and cost records (`runs/…`) older than 120 days are deleted. Your settings and profile (`meta/…`) and the archive are never deleted.
  - At most 200 docs are removed per run; the rest go on the next run. The coverage notes say what was cleaned.
  - The per-day JSON files in `~/Documents/daily-digest/` stay on your disk; the skill never deletes them.
- 🔒 The "work with AI" timeline reads only **session titles + times** from local Claude Code transcripts, never content. The Cost tab reads **token counts** only.
- 🔒 **Sharing**: the page link may be visible to your organization, but the database rules are owner-only (read and write), so others only see demo data. Never give anyone edit rights to the page.
- 🔒 **Runner** (developers only): `catask-runner` is a local MCP server on your machine. It accepts only a task id and a task snapshot, never free-text commands. It runs `claude -p` locally, only in repos you enabled in Settings; it refuses repos with uncommitted changes, never stashes, never merges or force-pushes, and never commits to main/sprint branches. It writes logs and task files only under `~/Documents/daily-digest/runner/`.
- 🔒 **Page permissions** (`mcp`): Atlassian `getJiraIssue` / `editJiraIssue`, and the `catask-runner` tools on your machine. claude.ai asks you before each grant, and you can revoke them in the artifact's Permissions menu.
- 🔒 The dispatcher heartbeat (`meta/dispatcher`) stores only an opaque instance id and timestamps.
- 🔒 State files live in `~/Documents/daily-digest/` on your machine. `config.json` holds no passwords or tokens. Don't commit that folder.

## Layout

```
.claude-plugin/plugin.json
LICENSE
config.example.json
skills/daily-digest-todo/
  SKILL.md                 # the full procedure
  schedule-prompt.md       # prompt for the scheduled task
  scripts/render.py        # JSON schema check + offline HTML backup
  scripts/ai_milestones.py # Claude Code work blocks (titles + times)
  scripts/run_tokens.py    # token usage of the scheduled runs
  assets/catask.html       # the ledger page (Artifact), vi + en UI — GENERATED, see Develop
  assets/digest-template.html
  assets/mascot/*.svg
  assets/peeps/*.svg       # Open Peeps, CC0 (see LICENSE.txt)
skills/ai-worker/
  SKILL.md                 # "Hand to AI" worker: drafts, summaries, Jira proposals (read-only); code tasks
  schedule-prompt.md       # optional prompt for a scheduled worker
commands/ai-worker.md      # /catask:ai-worker
commands/setup.md          # /catask:setup
commands/update.md         # /catask:update
page-src/catask.src.html   # readable source of the page (edit this)
scripts/build-page.mjs     # builds assets/catask.html from it
tests/smoke.js             # page smoke test (fake DOM)
runner/
  catask-runner.mjs       # local stdio MCP: page↔headless bridge for code runs, repo discovery
  selftest.mjs             # node runner/selftest.mjs
hooks/
  hooks.json               # SessionStart: list open todos in your other sessions
  catask-context.mjs       # reads ~/Documents/daily-digest/open-todos.json
  selftest.mjs             # node hooks/selftest.mjs
```

## Develop

The shipped page `skills/daily-digest-todo/assets/catask.html` is generated (minified, so it is cheap for Claude to read before publishing). Don't edit it by hand:

1. Edit `page-src/catask.src.html`.
2. Run `node scripts/build-page.mjs` (Node 22; downloads the pinned `esbuild` via `npx` the first time). It minifies the inline `<style>`/`<script>`, strips HTML comments, keeps lines short, and checks ids, `data-*` attributes, the `<title>` and `node --check`. `node scripts/build-page.mjs --check` fails if the built file is stale.
3. Test both: `for f in page-src/catask.src.html skills/daily-digest-todo/assets/catask.html; do for l in vi en; do for m in demo owner; do FAKE=2026-11-11 node tests/smoke.js $f $l $m | tail -1; done; done; done` → `ALL PASS` ×8.
4. Commit both files. SVGs in `assets/peeps/` and `assets/mascot/` are already optimized (`npx -y svgo@4.0.0 --multipass -p 0` for peeps, `-p 1` for mascots); the page loads them as published supporting files.

## Releasing a new version

GitHub is the source of truth; the copy in the company's **Organization library** does not update by itself. Every release:

1. Bump `version` in **both** `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` (keep them equal), commit and push to `main`.
2. Republish to the Organization library: ask Claude Code *"đẩy catask lên thư viện công ty"* (or republish it from the Plugins page). It replaces the existing entry, so colleagues who click **+** get the new version.
3. Check: the Organization library entry shows the same version as `plugin.json`.

## Credits

People illustrations: [Open Peeps](https://www.openpeeps.com/) by Pablo Stanley, CC0 1.0 (see `skills/daily-digest-todo/assets/peeps/LICENSE.txt`).

## License

MIT — see [`LICENSE`](LICENSE). © 2026 Hồ Thiên Long.
