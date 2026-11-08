# Sổ việc (plugin `so-viec`)

[English](#english) · [Tiếng Việt](#tiếng-việt)

![Sổ việc — Today board (demo data)](docs/screenshots/hom-nay.png)

<table>
  <tr>
    <td width="33%"><img src="docs/screenshots/theo-nguoi.png" alt="People tab"><br><sub><b>Theo người / People</b>: what you owe each person and what they owe you</sub></td>
    <td width="33%"><img src="docs/screenshots/ngay.png" alt="Day tab"><br><sub><b>Ngày / Day</b>: timeline of meetings, AI sessions and finished work</sub></td>
    <td width="33%"><img src="docs/screenshots/chi-phi.png" alt="Cost tab"><br><sub><b>Chi phí / Cost</b>: token cost of each scheduled run</sub></td>
  </tr>
  <tr>
    <td width="33%"><img src="docs/screenshots/xem-tin.png" alt="View message dialog"><br><sub><b>Xem tin / View message</b>: short snapshot of the source message, with a link to the original</sub></td>
    <td width="33%"><img src="docs/screenshots/cai-dat.png" alt="Settings drawer"><br><sub><b>Cài đặt / Settings</b>: language, channels, work hours, important people, right on the page</sub></td>
    <td width="33%"></td>
  </tr>
</table>

<sub>Screenshots use the built-in demo data ("View as others"). No real messages or people. · Ảnh chụp từ bản demo dữ liệu mẫu ("Xem như người khác"), không có tin nhắn hay người thật.</sub>

---

## English

> **In one line:** every weekday at 19:00, Claude reads your Microsoft Teams and Outlook, collects every ask, every question waiting on you and every promise you made, and puts them on **one private "Sổ việc" (work ledger) page** so tomorrow morning you know what to do first. Output in **Vietnamese or English**.

### What it does

- ✅ **Prioritized TODO list**: asks addressed to you, unanswered questions, your own promises, deadlines (including HR/Admin mail), MR reviews, meeting prep.
- 🚦 **P0–P3 badges** (how critical it is, separate from when it's due): P0 critical (prod incident, blocking others, security, escalation), P1 important (anything your important people ask), P2 normal, P3 nice-to-have/FYI. You can change a todo's P on the page and Claude won't override it.
- ↕️ **Sort order**: overdue / due today → tasks with a real due date (earliest first, so a P2 due tomorrow beats a P1 with no date) → P0→P3 → oldest first. The top 3 uses the same order.
- 🔁 **Carry-over**: unfinished items stay; items with visible evidence of completion are marked done.
- 🏆 **Done today**: only recorded when there's real evidence in messages or mail.
- 🗂 **The ledger page** (a private Artifact): Today / Tomorrow / Waiting / Done board (drag and drop), plus People, Week, Day (timeline) and Cost tabs. **Mark done from anywhere**: any tab, including Day timeline items; undo puts it back.
- 💬 **View message**: open a short snapshot (≤500 characters) of the message that created a todo, right on the page, with a link to the original. Turn off with `storeQuotes: false`.
- ⭐ **Key chats and important people**: chats you pick are always read first; asks from your boss/PO/lead are bumped to at least P1.
- 📨 **Sends the link** to your own Teams notes chat (only to you, never to anyone else).
- 🌐 **Vietnamese or English**: chosen on first run; the page UI follows the same setting.
- 🧭 Optional: **communication signals** (false urgency, scope creep, kudos…). **Off by default.**

### Requirements

| What | Required? | Notes |
|---|---|---|
| Claude desktop app | Yes | Runs the 19:00 scheduled task |
| Microsoft 365 connector | Yes | Settings → Connectors → Microsoft 365. Read access is enough; chat-send permission is optional |
| Artifacts with `db` | Yes | The ledger page stores its data in its own private store |
| Python 3 (3.9+) | Yes | Scripts use the standard library only and run with `python3 -I` |
| `get_usage` (session management) | No | If present, the Cost tab also records weekly-quota %; otherwise skipped |

### Install

**From your organization's plugin library** (when published there):

```
/plugin install so-viec@claudeai-organization-library
```

**From the public plugin directory**: the install line will be added here once the plugin is approved and listed.

**Manually** (skill only):

```bash
mkdir -p ~/.claude/skills
cp -R skills/daily-digest-todo ~/.claude/skills/
```

### First run (about 5 minutes)

1. Connect the **Microsoft 365 connector** in the Claude app.
2. Type in Claude: `evening digest` (or `did anyone ask me for anything today?`).
3. Claude runs a short **setup interview** (2–3 rounds of multiple-choice questions, each with a free-text "Other", about 2 minutes) to create `~/Documents/daily-digest/config.json`: **"Tiếng Việt hay English?"** first, then which channels to watch, your **key chats** (picked from your ~15 most recent chats), your **important people** (boss, PO, lead…), your working hours, your role and what you're working on now, keywords/ticket prefixes (e.g. `MOB-`), communication signals on/off, and whether to store message quotes. Your name and email come from Microsoft 365. Claude then suggests a schedule time (end of your working hours + ~1h, default 19:00).
4. Claude publishes your **Sổ việc** page (private, yours) and saves the link to `~/Documents/daily-digest/artifact-url.txt`.
5. Open the link and pin it. Done.

To change your answers later, say **`update my profile`** (or `cập nhật hồ sơ`). Claude asks the same questions with your current values preselected and merges the answers into your config (other fields are kept).

### Schedule it for 19:00 (Mon–Fri)

1. Claude app → **Scheduled → New task**.
2. Name: start with **`Evening digest`** (e.g. `Evening digest 19:00 (Mon–Fri)`) — or `Bản tin tối` if you prefer. The Cost tab uses these prefixes to find the runs.
3. Schedule: **19:00, Monday → Friday**.
4. Prompt: paste the block from [`skills/daily-digest-todo/schedule-prompt.md`](skills/daily-digest-todo/schedule-prompt.md).

Note: the task only runs while the Claude app is open; if your computer is off at 19:00, it catches up when you open the app. If the scheduled run finds no config, it never stops to ask: it creates one with defaults (`"language": "en"`, all channels, 09:00–18:00 Mon–Fri) and leaves a warning suggesting `update my profile`.

### Configuration (`~/Documents/daily-digest/config.json`)

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
| `subagentChatsPerAgent` | `5` | Chats read per subagent |
| `maxChats` | `40` | Max chats scanned per run |
| `skipChatsOverMembers` | `40` | Skip chats bigger than this (unless you're tagged) |
| `channels` | all five | Sources to read: `teamsChats`, `teamsChannelMentions`, `outlookMail`, `jiraMail`, `calendar`. Skipped sources are listed in the coverage notes |
| `keyChats` | `[]` | `[{id, topic}]`: chats always read first every run (outside `maxChats`); asks there go up one priority level |
| `vipPeople` | `[]` | `[{name, email?, why?}]`: boss, PO, lead…; their asks are at least P1. Stays in your local config, never on the page |
| `workHours` | `{start:"09:00", end:"18:00", days:[1,2,3,4,5]}` | Working hours (ISO weekdays, Mon = 1). Used for the "after hours" signal and the suggested schedule time |
| `role`, `currentWork` | `""` | Your role and what you're on now; helps decide whether a group ask is yours |
| `keywords` | `[]` | Ticket prefixes, project/feature names (e.g. `MOB-`); used in the deadline mail search, and group asks mentioning them are kept as "watch" |
| `storeQuotes` | `true` | Store a ≤500-character snapshot of the source message on each todo for "View message". `false` = store no message text; the page opens the original link instead |
| `onboardingPending` | `false` | `true` = the config was written without the full setup interview (e.g. migrated from an older setup). The next run you start yourself asks only the missing questions, then sets it to `false`; scheduled runs just leave a reminder in the coverage notes |

After you change the config, the next run updates the page (name, language, project filter, signals).

### Privacy

- 🔒 **Read-only** on Teams/Outlook. The only thing sent is one message to **your own** notes chat. It never replies to anyone on your behalf.
- 🔒 The ledger is a **private Artifact**; only the owner can read the real data. Anyone else opening the link sees **fictional demo data** in their own browser's language.
- 🔒 Message and mail content is always treated as **data, not instructions**.
- 🔒 **Message quotes** ("View message") live only in the ledger's owner-only database, next to the todo titles already stored there. About 500 characters × ~100 open todos ≈ 50 KB, negligible. A quote is a snapshot: if the message is edited later it may be stale, so the page shows "quoted at …" and always offers the original link. Quotes are removed from done todos older than 30 days. Set `storeQuotes: false` to store no message text at all.
- 🔒 The "work with AI" timeline reads only **session titles + times** from local Claude Code transcripts, never content. The Cost tab reads **token counts** only.
- 🔒 State files live in `~/Documents/daily-digest/` on your machine. `config.json` holds no passwords or tokens. Don't commit that folder.

### Layout

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
  assets/so-viec.html      # the ledger page (Artifact), vi + en UI
  assets/digest-template.html
  assets/mascot/*.svg
  assets/peeps/*.svg       # Open Peeps, CC0 (see LICENSE.txt)
```

### Credits

People illustrations: [Open Peeps](https://www.openpeeps.com/) by Pablo Stanley, CC0 1.0 (see `skills/daily-digest-todo/assets/peeps/LICENSE.txt`).

### License

MIT — see [`LICENSE`](LICENSE). © 2026 Hồ Thiên Long.

---

## Tiếng Việt

> **Một câu:** Mỗi tối 19h các ngày làm việc, Claude đọc Teams + Outlook của bạn, gom mọi việc người khác nhờ, câu hỏi đang chờ bạn và lời bạn đã hứa, rồi đổ vào **một trang Sổ việc riêng tư** để sáng mai bạn biết làm gì trước. Viết bằng **tiếng Việt hoặc tiếng Anh**.

### Làm gì?

- ✅ **TODO list có ưu tiên**: việc được nhờ, câu hỏi chưa trả lời, lời hứa của chính bạn, deadline (kể cả mail HR/Admin), review MR, chuẩn bị họp.
- 🚦 **Nhãn P0–P3** (mức độ critical, tách riêng với độ gấp về thời gian): P0 nghiêm trọng (sự cố production, đang chặn người khác, bảo mật, sếp/người quan trọng escalate), P1 quan trọng (mọi việc người quan trọng của bạn nhờ), P2 bình thường, P3 có thì tốt/FYI. Bạn đổi P trên trang thì Claude không ghi đè.
- ↕️ **Thứ tự sắp xếp**: quá hạn / hạn hôm nay → việc có hạn cụ thể (hạn sớm trước, nên P2 hạn mai đứng trước P1 không có hạn) → P0→P3 → việc cũ hơn trước. Top 3 dùng cùng thứ tự này.
- 🔁 **Carry-over**: việc chưa xong hôm qua tự ở lại, việc đã xong (có bằng chứng) tự được đánh dấu.
- 🏆 **Đã xong hôm nay**: chỉ ghi khi có bằng chứng thật trong tin nhắn/mail.
- 🗂 **Trang Sổ việc** (Artifact riêng tư): bảng Hôm nay / Mai / Đang chờ / Xong (kéo thả được), tab Theo người, Tuần, Ngày (dòng thời gian), Chi phí. **Đánh dấu xong ở mọi nơi**: tab nào cũng được, kể cả mục trên dòng thời gian tab Ngày; bấm hoàn tác để trả lại.
- 💬 **Xem tin**: mở ngay trên trang một đoạn trích ngắn (≤500 ký tự) của tin nhắn sinh ra việc, kèm link tới tin gốc. Tắt bằng `storeQuotes: false`.
- ⭐ **Chat quan trọng và người quan trọng**: chat bạn chọn luôn được đọc trước; việc sếp/PO/lead nhờ được nâng lên ít nhất P1.
- 📨 **Báo link** vào chat "ghi chú" của chính bạn trên Teams (chỉ gửi cho bạn, không bao giờ gửi cho người khác).
- 🌐 **Tiếng Việt hoặc English**: chọn ở lần chạy đầu; giao diện trang theo cùng lựa chọn.
- 🧭 Tuỳ chọn: **tín hiệu giao tiếp** (gấp ảo, scope creep, được ghi nhận…). **Mặc định tắt.**

### Cần có

| Thứ | Bắt buộc? | Ghi chú |
|---|---|---|
| App Claude desktop | Có | Để chạy Scheduled task 19h |
| Microsoft 365 connector | Có | Settings → Connectors → Microsoft 365. Chỉ cần quyền đọc; quyền gửi chat là tuỳ chọn |
| Artifact có `db` | Có | Trang Sổ việc lưu dữ liệu trong kho riêng của chính trang |
| Python 3 (3.9+) | Có | Script chỉ dùng thư viện chuẩn, chạy bằng `python3 -I` |
| `get_usage` (session management) | Không | Có thì tab Chi phí ghi thêm % quota tuần; không có thì bỏ qua |

### Cài đặt

**Từ thư viện plugin của tổ chức** (khi đã được publish):

```
/plugin install so-viec@claudeai-organization-library
```

**Từ thư mục plugin công khai**: lệnh cài sẽ được thêm vào đây sau khi plugin được duyệt và lên danh sách.

**Thủ công** (chỉ skill):

```bash
mkdir -p ~/.claude/skills
cp -R skills/daily-digest-todo ~/.claude/skills/
```

### Chạy lần đầu (khoảng 5 phút)

1. Kết nối **Microsoft 365 connector** trong app Claude.
2. Gõ trong Claude: `bản tin tối` (hoặc `hôm nay có ai nhờ gì tôi không`).
3. Claude **phỏng vấn nhanh** (2–3 lượt câu hỏi trắc nghiệm, câu nào cũng có ô "Khác" để tự gõ, khoảng 2 phút) để tạo `~/Documents/daily-digest/config.json`: hỏi **"Tiếng Việt hay English?"** trước, rồi tới kênh cần theo dõi, **chat quan trọng** (chọn từ ~15 chat gần nhất), **người quan trọng** (sếp, PO, lead…), giờ làm việc, vai trò và việc đang làm, từ khoá/tiền tố ticket (ví dụ `MOB-`), có bật tín hiệu giao tiếp không, có lưu trích dẫn tin nhắn không. Tên và email lấy từ Microsoft 365. Xong Claude gợi ý giờ chạy lịch (hết giờ làm + ~1 tiếng, mặc định 19:00).
4. Claude publish trang **Sổ việc** (riêng tư, của bạn) và lưu link vào `~/Documents/daily-digest/artifact-url.txt`.
5. Mở link, ghim lại. Xong.

Muốn đổi câu trả lời sau này, gõ **`cập nhật hồ sơ`** (hoặc `update my profile`). Claude hỏi lại các câu đó, chọn sẵn giá trị hiện tại, rồi gộp câu trả lời mới vào config (các trường khác giữ nguyên).

### Đặt lịch 19h (T2–T6)

1. App Claude → **Scheduled → New task**.
2. Tên: bắt đầu bằng **`Bản tin tối`** (ví dụ `Bản tin tối 19h (T2–T6)`) hoặc `Evening digest`. Tab Chi phí dựa vào hai tiền tố này để nhận ra các lần chạy.
3. Lịch: **19:00, thứ Hai → thứ Sáu**.
4. Prompt: dán khối trong [`skills/daily-digest-todo/schedule-prompt.md`](skills/daily-digest-todo/schedule-prompt.md).

Lưu ý: task chỉ chạy khi app Claude đang mở; tắt máy lúc 19h thì mở app lên sẽ chạy bù. Nếu lần chạy theo lịch không thấy config, nó không dừng lại hỏi: tự tạo config mặc định (`"language": "en"`, đủ mọi kênh, 09:00–18:00 T2–T6) và để lại cảnh báo gợi ý gõ `cập nhật hồ sơ`.

### Cấu hình (`~/Documents/daily-digest/config.json`)

Mẫu: [`config.example.json`](config.example.json).

| Trường | Mặc định | Ý nghĩa |
|---|---|---|
| `displayName`, `email` | lấy từ `get_me` | Bạn là ai trên Microsoft 365 |
| `mentionName` | = `displayName` | Tên hiện trong @mention Teams, ví dụ `Nguyễn Văn A (Software Engineer)` |
| `timezone` | `Asia/Ho_Chi_Minh` | Múi giờ hiển thị và cắt ngày |
| `utcOffsetHours` | `7` | Dự phòng khi máy không đọc được `timezone` |
| `language` | hỏi ở lần chạy đầu (`en` khi chạy tự động) | Ngôn ngữ: **`vi`** (tiếng Việt) hoặc **`en`** (tiếng Anh). Áp dụng cho nội dung bản tin, tin Teams, câu trả lời trong chat và giao diện trang |
| `defaultProject` | `work` | Project mặc định cho việc từ Teams/Outlook |
| `projects` | `[{id:"work",label:"Công việc"}]` | Danh sách `{id, label, match}`; `match` là gợi ý tên thư mục/từ khoá để xếp giờ làm Claude Code và việc vào đúng project |
| `focusAreas` | `[]` | Mảng việc bạn phụ trách; câu hỏi chung trong nhóm chạm tới mảng này sẽ vào "Theo dõi" |
| `notifyChat` | `48:notes` | Chat ghi chú của chính bạn trên Teams |
| `signals` | `false` | Bật/tắt huy hiệu tín hiệu giao tiếp |
| `subagentChatsPerAgent` | `5` | Số chat mỗi subagent đọc |
| `maxChats` | `40` | Số chat tối đa quét mỗi lần |
| `skipChatsOverMembers` | `40` | Bỏ qua chat đông hơn mức này (trừ khi bạn bị tag) |
| `channels` | đủ cả năm | Nguồn cần đọc: `teamsChats`, `teamsChannelMentions`, `outlookMail`, `jiraMail`, `calendar`. Nguồn bị bỏ qua được ghi trong phần độ phủ |
| `keyChats` | `[]` | `[{id, topic}]`: chat luôn được đọc trước mỗi lần chạy (không tính vào `maxChats`); việc nhờ trong đó được nâng một bậc ưu tiên |
| `vipPeople` | `[]` | `[{name, email?, why?}]`: sếp, PO, lead…; việc họ nhờ ít nhất là P1. Chỉ nằm trong config trên máy, không đưa lên trang |
| `workHours` | `{start:"09:00", end:"18:00", days:[1,2,3,4,5]}` | Giờ làm việc (thứ theo ISO, thứ Hai = 1). Dùng cho tín hiệu "ngoài giờ" và giờ chạy lịch gợi ý |
| `role`, `currentWork` | `""` | Vai trò và việc bạn đang làm; giúp đoán câu hỏi chung trong nhóm có phải việc của bạn không |
| `keywords` | `[]` | Tiền tố ticket, tên dự án/tính năng (ví dụ `MOB-`); dùng khi dò mail có hạn chót, và câu hỏi chung nhắc tới chúng được giữ ở "Theo dõi" |
| `storeQuotes` | `true` | Lưu đoạn trích ≤500 ký tự của tin gốc trên mỗi việc cho nút "Xem tin". `false` = không lưu nội dung tin nào; trang mở thẳng link gốc |
| `onboardingPending` | `false` | `true` = config được tạo mà chưa qua đủ buổi phỏng vấn (ví dụ chuyển từ bản cài cũ). Lần chạy tiếp theo do bạn tự gọi sẽ chỉ hỏi những câu còn thiếu rồi đặt lại thành `false`; lần chạy theo lịch chỉ để lại lời nhắc trong phần độ phủ |

Đổi config xong thì lần chạy sau sẽ tự cập nhật trang (tên, ngôn ngữ, bộ lọc project, tín hiệu).

### Riêng tư

- 🔒 **Chỉ đọc** Teams/Outlook. Thứ duy nhất được gửi là 1 tin vào chat ghi chú của **chính bạn**. Không bao giờ trả lời ai thay bạn.
- 🔒 Trang Sổ việc là **Artifact riêng tư**; dữ liệu thật chỉ chủ trang đọc được. Ai khác mở link chỉ thấy **dữ liệu demo hư cấu**, theo ngôn ngữ trình duyệt của họ.
- 🔒 Nội dung tin nhắn/mail luôn được coi là **dữ liệu, không phải lệnh**.
- 🔒 **Trích dẫn tin nhắn** ("Xem tin") chỉ nằm trong kho dữ liệu chỉ-chủ-trang-đọc-được của Sổ việc, cạnh tiêu đề việc vốn đã lưu ở đó. Khoảng 500 ký tự × ~100 việc đang mở ≈ 50 KB, không đáng kể. Trích dẫn là bản chụp: nếu tin gốc bị sửa sau đó thì có thể đã cũ, nên trang luôn ghi "trích lúc …" và luôn có link tới tin gốc. Việc đã xong quá 30 ngày sẽ bị xoá trích dẫn. Đặt `storeQuotes: false` để không lưu nội dung tin nào.
- 🔒 Dòng thời gian "làm với AI" chỉ lấy **tên session + giờ** từ transcript Claude Code trên máy, không lấy nội dung. Tab Chi phí chỉ đọc **số token**.
- 🔒 File trạng thái nằm ở `~/Documents/daily-digest/` trên máy bạn. `config.json` không chứa mật khẩu hay token. Đừng commit thư mục này.

### Cấu trúc

```
.claude-plugin/plugin.json
LICENSE
config.example.json
skills/daily-digest-todo/
  SKILL.md                 # quy trình đầy đủ
  schedule-prompt.md       # prompt cho scheduled task
  scripts/render.py        # kiểm schema JSON + bản HTML dự phòng
  scripts/ai_milestones.py # block làm việc Claude Code (tên + giờ)
  scripts/run_tokens.py    # token của các lần chạy theo lịch
  assets/so-viec.html      # trang Sổ việc (Artifact), giao diện vi + en
  assets/digest-template.html
  assets/mascot/*.svg
  assets/peeps/*.svg       # Open Peeps, CC0 (xem LICENSE.txt)
```

### Ghi công

Hình người: [Open Peeps](https://www.openpeeps.com/) của Pablo Stanley, CC0 1.0 (xem `skills/daily-digest-todo/assets/peeps/LICENSE.txt`).

### Giấy phép

MIT — xem [`LICENSE`](LICENSE). © 2026 Hồ Thiên Long.
