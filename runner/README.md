# catask-runner

[English](#english) · [Tiếng Việt](#tiếng-việt)

## English

A small local MCP server (Node ≥ 18, no dependencies) that lets the catask page run the `ai-worker` for **one code task** ("Hand to AI → Code it") on your machine, without you typing anything in Claude. Used when ⚙ Settings → *AI run mode* is **runner** (the default). The other mode, **desktop**, uses a Claude desktop scheduled task instead (see [`skills/ai-worker/schedule-prompt.md`](../skills/ai-worker/schedule-prompt.md)).

**Install**: say **`install catask runner`** / **`cài runner catask`** to Claude (or answer yes when developer onboarding offers it; "sửa runner" repairs it). Claude finds the absolute `node` and runner paths, backs up and merges the entry into the Claude desktop app config, registers it for Claude Code, checks the `claude` CLI login, runs the selftest and reports a table. Two things only you can do: `/login` in Terminal if the CLI isn't logged in, and quit (⌘Q) + reopen the app. Manual steps: [Manual install (fallback)](#manual-install-fallback).

The read-only tools (`listPending`, `taskStatus`, `discoverRepos`) are annotated `readOnlyHint: true` so the page can call them on load without a confirmation prompt; `startTask`, `cancelTask`, `ackTask` may ask you to confirm.

Check it: `node runner/selftest.mjs` (never starts a real run; the repo scan is read-only).

### The page is the bridge

A headless `claude -p` has the Skill, Atlassian (`mcp__claude_ai_Atlassian__*`) and GitLab MCP tools, but **not** `ArtifactData`, so it can't read or write the ledger. Instead:

1. The page calls `startTask({todoId, task})` with a snapshot of the todo (`{id, title, ref, url, quote, why, due, priority, ai}`, ≤ 60 KB). The runner stores it as `~/Documents/daily-digest/runner/tasks/<id>.in.json` (data only — never put into the prompt or a command line) and starts `claude -p` detached with a fixed prompt naming the in/out files.
2. The worker (file mode) writes every progress step and its result to `<id>.out.json` (`{todoId, round, updatedAt, ai: {...changed fields}, todo?: {...}}`), atomically.
3. The page polls `taskStatus` while it's open and calls `listPending` when it opens, to pick up results produced while it was closed. It copies `out.ai` into its database, then calls `ackTask({todoId, updatedAt})`, which archives the files to `tasks/done/` (last 50 kept).

### Tools

The page declares this list in its manifest: `startTask`, `taskStatus`, `cancelTask`, `listPending`, `ackTask`, `discoverRepos`. The page calls them as `host:catask-runner`, which only works when it's opened **in the Claude desktop app**.

| Tool | Returns |
|---|---|
| `startTask({todoId, task})` | `{started, pid, log}` or `{started: false, reason}` |
| `taskStatus({todoId})` | `{running, pid, startedAt, logTail (20 lines), out}` |
| `cancelTask({todoId})` | `{cancelled, pid?}` — kills the run's process group |
| `listPending({})` | `[{todoId, running, outUpdatedAt}]` (`structuredContent.tasks`) |
| `ackTask({todoId, updatedAt})` | `{acked}` — only when the run ended and `updatedAt` matches |
| `discoverRepos({})` | Up to 30 `[{name, path, remote, lastCommitAt, myCommits30d, projectKeys, source}]` (`structuredContent.repos`), read-only: git repos up to depth 3 under `~/Developer`, `~/Projects`, `~/projects`, `~/code`, `~/src`, `~/work`, `~/Documents`, `~/repos`, plus folders from `~/.claude/projects`. No file contents. |

`claude -p` runs in `~/Documents/daily-digest` with `--permission-mode acceptEdits`, `--allowedTools` from config `runner.allowedTools` (default: `Read, Edit, Write, Glob, Grep, Bash(git/flutter/dart/yarn/npm/glab/gh:*)`, `mv -f` inside the tasks dir, `Skill`, `ToolSearch`, read-only Jira tools `mcp__claude_ai_Atlassian__getJiraIssue`/`listJiraIssueComments`/`searchJiraIssuesUsingJql`/`getAccessibleAtlassianResources`, and `mcp__GitLab__create_merge_request`), and `--add-dir` for every enabled `repos[].path`. Logs: `~/Documents/daily-digest/runner/logs/`.

Optional config: `runner.claudePath`, `runner.allowedTools` (array or comma list), `runner.extraPath` (absolute dirs added to `PATH`, e.g. your Flutter SDK `bin`).

### Safety

- Accepts only a todo id matching `^[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9-]{1,40}$` and a JSON snapshot that is stored as a file. The prompt, flags, paths and tools are built by the runner.
- One run per task, at most one run at a time.
- The worker never stashes, never commits to main/master/develop/sprint/release, never force-pushes, never merges, never writes to Jira; it pushes and opens a **draft** MR only after you approve on the page. Anything in `runner.allowedTools` runs without asking, so keep it small.
- Uninstall: `claude mcp remove -s user catask-runner`.

### Manual install (fallback)

**Install** (once). For Claude Code (user scope):

```bash
claude mcp add -s user catask-runner -- node /ABSOLUTE/PATH/TO/catask/runner/catask-runner.mjs
```

**For the page (Claude desktop app)** — the page reaches the runner through the desktop app, which reads its own config, not Claude Code's. Add the server to `~/Library/Application Support/Claude/claude_desktop_config.json` (merge into an existing `mcpServers`), with **absolute** paths — GUI apps don't see your nvm/shell `PATH`, so use the full node path (`which node`):

```json
{
  "mcpServers": {
    "catask-runner": {
      "command": "/ABSOLUTE/PATH/TO/node",
      "args": ["/ABSOLUTE/PATH/TO/catask/runner/catask-runner.mjs"]
    }
  }
}
```

Then quit the app completely (⌘Q) and reopen it.

Windows: `%APPDATA%\Claude\claude_desktop_config.json`; Linux: `~/.config/Claude/claude_desktop_config.json`.

## Tiếng Việt

MCP server nhỏ chạy trên máy (Node ≥ 18, không cần thư viện), để trang catask chạy `ai-worker` cho **một việc code** ("Giao AI → Code luôn") trên máy bạn mà không cần gõ gì trong Claude. Dùng khi ⚙ Cài đặt → *Chế độ chạy AI* là **runner** (mặc định). Chế độ còn lại, **desktop**, dùng scheduled task của app Claude desktop (xem [`skills/ai-worker/schedule-prompt.md`](../skills/ai-worker/schedule-prompt.md)).

**Cài**: nói **`cài runner catask`** với Claude (hoặc trả lời có khi thiết lập cho dev hỏi; "sửa runner" để sửa). Claude tự tìm đường dẫn `node` và runner, sao lưu rồi gộp mục vào cấu hình app Claude desktop, đăng ký cho Claude Code, kiểm tra đăng nhập `claude` CLI, chạy selftest và báo bảng kết quả. Hai việc chỉ bạn làm được: `/login` trong Terminal nếu CLI chưa đăng nhập, và thoát hẳn (⌘Q) rồi mở lại app. Làm tay: [Cài tay (dự phòng)](#cài-tay-dự-phòng).

Kiểm tra: `node runner/selftest.mjs`.

**Trang là cầu nối**: `claude -p` chạy nền không có `ArtifactData`, nên trang gửi ảnh chụp của việc (`startTask`), runner lưu thành `runner/tasks/<id>.in.json` (chỉ là dữ liệu, không bao giờ ghép vào prompt hay dòng lệnh) rồi chạy `claude -p` với prompt cố định. Worker ghi tiến độ và kết quả vào `<id>.out.json`. Trang đọc qua `taskStatus` / `listPending` (cả kết quả có trong lúc trang đóng), chép vào sổ rồi gọi `ackTask` để cất file vào `tasks/done/`. `discoverRepos` quét (chỉ đọc) các repo git trên máy để gợi ý khi khai báo repo. Trang gọi `host:catask-runner`, chỉ chạy khi mở trang **trong app Claude desktop**.

**An toàn**: chỉ nhận mã việc đúng mẫu và một ảnh chụp JSON ≤ 60 KB lưu thành file; prompt, cờ, đường dẫn và tool do runner tự dựng; mỗi lúc một lần chạy. Worker không stash, không commit thẳng vào main/master/develop/sprint/release, không force-push, không merge, không ghi Jira; chỉ push và mở MR **nháp** sau khi bạn duyệt. Tool nào có trong `runner.allowedTools` sẽ chạy không hỏi, nên giữ danh sách ngắn. Gỡ: `claude mcp remove -s user catask-runner`.

### Cài tay (dự phòng)

**Cài** (một lần). Cho Claude Code: `claude mcp add -s user catask-runner -- node /DUONG/DAN/TUYET/DOI/catask/runner/catask-runner.mjs`.

**Cho trang (app Claude desktop)** — trang gọi runner qua app desktop, app này đọc config riêng chứ không phải của Claude Code. Thêm server vào `~/Library/Application Support/Claude/claude_desktop_config.json` (gộp vào `mcpServers` nếu đã có), dùng đường dẫn **tuyệt đối** — app giao diện không thấy `PATH` của nvm/shell, nên ghi đủ đường dẫn node (`which node`):

```json
{
  "mcpServers": {
    "catask-runner": {
      "command": "/DUONG/DAN/TUYET/DOI/node",
      "args": ["/DUONG/DAN/TUYET/DOI/catask/runner/catask-runner.mjs"]
    }
  }
}
```

Rồi thoát hẳn app (⌘Q) và mở lại.

Windows: `%APPDATA%\Claude\claude_desktop_config.json`; Linux: `~/.config/Claude/claude_desktop_config.json`.
