# catask

**Không sót việc nào.**

[English](README.md) · Tiếng Việt

[![Cài bằng Claude](https://img.shields.io/badge/🤖_Cài_bằng_Claude-copy_prompt-2a80d2?style=for-the-badge)](#-cài-bằng-claude) [![llms.txt](https://img.shields.io/badge/llms.txt-cho_AI_agent-13305a?style=for-the-badge)](llms.txt)

<sub>catask = **cat** (mèo) + **task** (việc) + **ask** (nhờ): chú mèo canh mọi việc, mọi lời nhờ.</sub>

[![Xem clip demo 52 giây](docs/video/catask-demo-vi-poster.jpg)](https://github.com/hothienlong/catask/releases/download/demo-video/catask-demo-vi.mp4)

<sub>▶ Clip demo 52 giây (chỉ dùng dữ liệu demo, có tiếng). Bấm để tải về xem (14 MB).</sub>

## 🤖 Cài bằng Claude

Dán đoạn này vào Claude Code (hoặc tab Code của app Claude desktop):

```text
Install the catask plugin for me: run `claude plugin marketplace add hothienlong/catask`, then `claude plugin install catask@catask` (if my organization has catask in its plugin library, use `claude plugin install catask@claudeai-organization-library` instead). Then run /catask:setup to set it up. If the new commands don't load in this session, tell me to open a new session and type /catask:setup.
```

![catask — bảng Hôm nay (dữ liệu demo)](docs/screenshots/hom-nay.png)

<table>
  <tr>
    <td width="50%"><img src="docs/screenshots/theo-nguoi.png" alt="People tab"><br><sub><b>Theo người</b>: bạn nợ ai và ai nợ bạn việc gì</sub></td>
    <td width="50%"><img src="docs/screenshots/ngay.png" alt="Day tab"><br><sub><b>Ngày</b>: dòng thời gian họp, phiên làm với AI và việc đã xong</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/screenshots/chi-phi.png" alt="Cost tab"><br><sub><b>Chi phí</b>: chi phí token của mỗi lần chạy theo lịch</sub></td>
    <td width="50%"><img src="docs/screenshots/xem-tin.png" alt="View message dialog"><br><sub><b>Xem tin</b>: trích ngắn tin gốc, kèm link mở tin gốc</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/screenshots/cai-dat.png" alt="Settings drawer"><br><sub><b>Cài đặt</b>: ngôn ngữ, kênh, giờ làm, người quan trọng, ngay trên trang</sub></td>
    <td width="50%"><img src="docs/screenshots/giao-ai.png" alt="Hand to AI dialog"><br><sub><b>Giao AI</b>: chọn việc cho AI; với ticket Jira, 💻 Code luôn chạy trong repo trên máy bạn</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/screenshots/ai-review.png" alt="Code review panel"><br><sub><b>Duyệt code</b>: kế hoạch, kết quả kiểm tra và diff từ nhánh AI; bạn duyệt rồi mới push + tạo draft MR</sub></td>
    <td width="50%"></td>
  </tr>
</table>

<sub>Ảnh chụp từ bản demo dữ liệu mẫu, không có tin nhắn hay người thật.</sub>

> **Một câu:** Mỗi tối các ngày làm việc, vào giờ bản tin của bạn (mặc định: hết giờ làm + 1 tiếng), Claude đọc Teams + Outlook của bạn, gom mọi việc người khác nhờ, câu hỏi đang chờ bạn và lời bạn đã hứa, rồi đổ vào **một trang catask riêng tư** để sáng mai bạn biết làm gì trước. Viết bằng **tiếng Việt hoặc tiếng Anh**.

## Làm gì?

- ✅ **TODO list có ưu tiên**: việc được nhờ, câu hỏi chưa trả lời, lời hứa của chính bạn, deadline (kể cả mail HR/Admin), review MR, chuẩn bị họp.
- 🚦 **Nhãn P0–P3** (mức độ critical, tách riêng với độ gấp về thời gian): P0 nghiêm trọng (sự cố production, đang chặn người khác, bảo mật, sếp/người quan trọng escalate), P1 quan trọng (mọi việc người quan trọng của bạn nhờ), P2 bình thường, P3 có thì tốt/FYI. Bạn đổi P trên trang thì Claude không ghi đè.
- ↕️ **Thứ tự sắp xếp**: quá hạn / hạn hôm nay → việc có hạn cụ thể (hạn sớm trước, nên P2 hạn mai đứng trước P1 không có hạn) → P0→P3 → việc cũ hơn trước. Top 3 dùng cùng thứ tự này.
- 🔁 **Carry-over**: việc chưa xong hôm qua tự ở lại. **AI gợi ý, bạn xác nhận**: khi có bằng chứng việc đã xong (bạn nhắn "xong/đã fix", link MR, đã trả lời, mail Jira chuyển Done, MR đã merge; có thể thấy ở chat khác nếu khớp rõ đúng việc đó), thẻ hiện **Có vẻ đã xong?** kèm bằng chứng và link; bạn bấm **✓ Xong** hoặc **✗ Chưa**. Không việc nào tự bị đóng.
- 🧩 **Làm xong ở chỗ khác? Claude hỏi.** Sau mỗi bản tin, catask lưu trên máy bạn một danh sách ngắn các việc đang mở (tiêu đề và mã Jira). Khi bạn làm việc với Claude Code ở bất kỳ project nào và làm xong việc khớp rõ (cùng mã Jira, hoặc yêu cầu chính là việc đó), Claude hỏi **Đánh dấu xong catask#ID · tiêu đề?** trước khi kết thúc lượt. Chỉ khi bạn chọn **Có** mới đóng. Tắt bằng `crossSessionDone: false` hoặc trong ⚙ Cài đặt.
- 🏆 **Đã xong hôm nay**: chỉ ghi khi có bằng chứng thật trong tin nhắn/mail.
- 🗂 **Trang catask** (Artifact riêng tư): bảng Hôm nay / Mai / Đang chờ / Xong (kéo thả được), tab Theo người, Tuần, Ngày (dòng thời gian), Chi phí. **Đánh dấu xong ở mọi nơi**: tab nào cũng được, kể cả mục trên dòng thời gian tab Ngày; mỗi lần đổi trạng thái hay mức ưu tiên đều hiện thanh nhỏ có nút **Hoàn tác** (hoặc Ctrl/Cmd+Z) trong khoảng 6 giây.
- ⚙ **Cài đặt ngay trên trang**: đổi ngôn ngữ, kênh theo dõi, giờ làm, người quan trọng, chat theo dõi và chat bỏ qua (bỏ bớt), từ khoá, vai trò/việc đang làm và hai công tắc riêng tư bằng nút ⚙ Cài đặt, khỏi sửa `config.json`. Thay đổi trên trang áp dụng từ bản tin tới; ngôn ngữ và tín hiệu đổi trên trang ngay.
- 💬 **Xem tin**: mở ngay trên trang một đoạn trích ngắn (≤500 ký tự) của tin nhắn sinh ra việc, kèm link tới tin gốc. Tắt bằng `storeQuotes: false`.
- ⭐ **Chat quan trọng và người quan trọng**: chat bạn chọn luôn được đọc trước; việc sếp/PO/lead nhờ được nâng lên ít nhất P1.
- 📨 **Báo link** vào chat "ghi chú" của chính bạn trên Teams (chỉ gửi cho bạn, không bao giờ gửi cho người khác).
- 🌐 **Tiếng Việt hoặc English**: chọn ở lần chạy đầu; giao diện trang theo cùng lựa chọn.
- 🧭 Tuỳ chọn: **tín hiệu giao tiếp** (gấp ảo, scope creep, được ghi nhận…). **Mặc định tắt.**
- 🤖 Tuỳ chọn: **Giao AI** (thử nghiệm). Bấm nút trên một việc, Claude soạn nháp trả lời, tóm tắt hoặc description / ước lượng cho ticket Jira để bạn xem lại; không bao giờ tự gửi, và ticket Jira chỉ đổi khi bạn duyệt trên trang. **Mặc định tắt** (⚙ Cài đặt).

> **🔒 Dữ liệu là của bạn**
> - Không có máy chủ catask, không telemetry, không thống kê. Không gì được gửi cho tác giả plugin hay bên thứ ba nào.
> - Mọi thứ nằm trong Artifact claude.ai của chính bạn (kho dữ liệu chỉ chủ trang truy cập) và trong `~/Documents/daily-digest/` trên máy bạn.
> - Teams, Outlook và Jira được đọc qua connector Claude **của chính bạn**, trong phiên Claude của bạn. Nội dung đó được Claude xử lý dưới tài khoản của bạn, như mọi cuộc chat Claude khác.
> - Không gửi hay đăng gì thay bạn, trừ một tin chứa link vào chat ghi chú Teams của chính bạn. Code chỉ được push lên git remote **của bạn** sau khi bạn bấm duyệt.

## Cần có

| Thứ | Bắt buộc? | Ghi chú |
|---|---|---|
| App Claude desktop | Có | Để chạy Scheduled task bản tin tối theo giờ của bạn |
| Microsoft 365 connector | Có | Settings → Connectors → Microsoft 365. Chỉ cần quyền đọc; quyền gửi chat là tuỳ chọn |
| Artifact có `db` | Có | Trang catask lưu dữ liệu trong kho riêng của chính trang |
| Python 3 (3.9+) | Có | Script chỉ dùng thư viện chuẩn, chạy bằng `python3 -I` |
| `get_usage` (session management) | Không | Có thì tab Chi phí ghi thêm % quota tuần; không có thì bỏ qua |

## Cài đặt

**Từ GitHub** (ai cũng cài được, trong Claude Code hoặc tab Code của app Claude desktop):

```
/plugin marketplace add hothienlong/catask
/plugin install catask@catask
```

**Cập nhật** (cài từ GitHub):

- Trong phiên Claude: `/plugin marketplace update catask`, rồi `/reload-plugins`. Hoặc gõ **`/catask:update`**, Claude tự làm và báo bản cũ → bản mới.
- Từ Terminal (chạy được với `claude` CLI hoặc bản `claude` đi kèm app Claude desktop):

  ```
  C="$(command -v claude || ls -d "$HOME/Library/Application Support/Claude/claude-code"/*/*/claude.app/Contents/MacOS/claude | sort | tail -1)"; "$C" plugin marketplace update catask && "$C" plugin update catask@catask
  ```

  Xong thì gõ `/reload-plugins` trong phiên đang mở, hoặc mở phiên mới.
- **Tự cập nhật**: cài từ thư viện plugin của công ty thì tự cập nhật khi mở lại Claude Code. Cài từ GitHub thì bật tự cập nhật một lần: `/plugin` → **Marketplaces** → **catask** → **Enable auto-update** (marketplace GitHub mặc định tắt), hoặc trả lời "có" khi `/catask:setup` hỏi.

Cài xong, gõ **`/catask:setup`**: phỏng vấn thiết lập, đặt lịch bản tin và (với dev) cài runner, chưa chạy bản tin. Hoặc nói luôn "bản tin tối" để vừa thiết lập vừa chạy bản tin đầu tiên.

**Từ thư viện plugin của tổ chức** (khi đã được publish):

```
/plugin install catask@claudeai-organization-library
```

**Từ thư mục plugin công khai**: lệnh cài sẽ được thêm vào đây sau khi plugin được duyệt và lên danh sách.

**Thủ công** (chỉ skill):

```bash
mkdir -p ~/.claude/skills
cp -R skills/daily-digest-todo ~/.claude/skills/
```

## Chạy lần đầu (khoảng 5 phút)

1. Kết nối **Microsoft 365 connector** trong app Claude.
2. Gõ trong Claude: `bản tin tối` (hoặc `hôm nay có ai nhờ gì tôi không`).
3. Claude **phỏng vấn nhanh** (3–4 lượt câu hỏi trắc nghiệm, câu nào cũng có ô "Khác" để tự gõ, khoảng 2 phút) để tạo `~/Documents/daily-digest/config.json`: hỏi **"Tiếng Việt hay English?"** trước, rồi tới kênh cần theo dõi, **chat quan trọng** (chọn từ ~15 chat gần nhất), chat muốn **bỏ qua** (vd nhóm tán gẫu, gắn kết; tuỳ chọn), **người quan trọng** (sếp, PO, lead…), giờ làm việc, vai trò và việc đang làm, từ khoá/tiền tố ticket (ví dụ `MOB-`), có bật tín hiệu giao tiếp không, có lưu trích dẫn tin nhắn không. Tên và email lấy từ Microsoft 365. Cuối cùng Claude hỏi có **tạo lịch chạy bản tin** luôn không (hết giờ làm + ~1 tiếng, mặc định 19:00, vào ngày làm việc): chọn *Có*, chọn giờ khác, hoặc *Để sau*. Không có câu *Có* của bạn thì không tạo lịch.
4. Claude publish trang **catask** (riêng tư, của bạn), mở trang cho bạn, lưu link vào `~/Documents/daily-digest/artifact-url.txt` và để link ở đầu tin nhắn cuối. Lần chạy đầu luôn kết thúc với trang đã được publish; nếu publish lỗi, Claude nói rõ lý do — chỉ cần nói `bản tin tối` lại.
5. Ghim trang lại. Xong.

Muốn đổi câu trả lời sau này, gõ **`cập nhật hồ sơ`** (hoặc `update my profile`). Claude hỏi lại các câu đó, chọn sẵn giá trị hiện tại, rồi gộp câu trả lời mới vào config (các trường khác giữ nguyên).

## Đặt lịch theo giờ bản tin của bạn

Claude sẽ đề nghị tạo task này giúp bạn trong lúc phỏng vấn thiết lập (hoặc nói `đổi giờ bản tin theo cài đặt` sau). Muốn tự làm:

1. App Claude → **Scheduled → New task**.
2. Tên: bắt đầu bằng **`Bản tin tối`** (ví dụ `Bản tin tối · catask`, hoặc kèm giờ: `Bản tin tối 18:30`) hoặc `Evening digest`. Tab Chi phí dựa vào hai tiền tố này để nhận ra các lần chạy.
3. Lịch: **giờ bản tin của bạn, vào các ngày làm việc**. Mặc định: hết giờ làm + 1 tiếng, làm tròn :00/:30, theo `workHours.days` (09:00–18:00 T2–T6 → 19:00 T2–T6, cron `0 19 * * 1-5`). Muốn giờ khác thì đặt `digestTime` (⚙ Cài đặt). Lần chạy đầu sẽ gợi ý giờ cho bạn.
4. Prompt: dán khối trong [`skills/daily-digest-todo/schedule-prompt.md`](skills/daily-digest-todo/schedule-prompt.md).

Lưu ý: task chỉ chạy khi app Claude đang mở; tắt máy đúng giờ đó thì mở app lên sẽ chạy bù. Đổi giờ làm hoặc giờ bản tin xong, nói **`đổi giờ bản tin theo cài đặt`** (hoặc `update digest schedule`) để Claude cập nhật lịch (sau khi bạn xác nhận); bản tin cũng nhắc khi lịch không còn khớp cài đặt. Nếu lần chạy theo lịch không thấy config, nó không dừng lại hỏi: tự tạo config mặc định (`"language": "en"`, đủ mọi kênh, 09:00–18:00 T2–T6) và để lại cảnh báo gợi ý gõ `cập nhật hồ sơ`.

## Giao AI (tuỳ chọn, thử nghiệm — mặc định tắt)

Nhờ Claude soạn trả lời hoặc tin nhắc, tóm tắt thread hay ticket, chuẩn bị nội dung họp, hoặc đề xuất description, acceptance criteria, story point cho ticket Jira. **AI chỉ soạn nháp: không gửi, không đăng, không trả lời, không đổi gì ngoài catask.** Bạn đọc kết quả trên trang rồi chép — riêng đề xuất Jira thì bạn duyệt ngay trên trang và chính trang sẽ cập nhật đúng một trường bằng kết nối Atlassian của bạn.

1. **Bật**: trang → ⚙ Cài đặt → *Trợ lý AI (thử nghiệm)* → *Cho phép giao việc cho AI* → Lưu. Tắt đi chỉ ẩn nút; yêu cầu và kết quả đã lưu vẫn giữ nguyên.
2. **Giao việc**: bấm **🤖 Giao AI** trên một việc đang mở (thẻ trên bảng, top 3, dòng ở tab Theo người, hoặc hộp Xem tin). Form hiện tên việc và khối **AI đã biết** (bấm để mở: lý do, trích tin, nguồn, ticket/link, ưu tiên, hạn) để bạn khỏi gõ lại. Rồi:
   - **AI làm gì?** Gợi ý theo nguồn: Jira → *Viết description*, *Viết acceptance criteria*, *Ước lượng story point*, *Tóm tắt ticket*; Teams/Outlook → *Soạn trả lời*, *Tóm tắt thread*, *Soạn tin nhắc*; Lịch → *Chuẩn bị nội dung họp*; luôn có *Khác…*. Chọn một gợi ý sẽ điền sẵn **Hướng dẫn** ngắn (≤300, sửa được; bắt buộc với *Khác…*).
   - **Ngữ cảnh thêm** (≤2000): dán yêu cầu của đối tác, link tài liệu SDK, phạm vi thay đổi…
   - **Kết quả**: *Chỉ soạn nháp* (mặc định), hoặc — với ba gợi ý Jira trên việc có mã ticket — *Soạn để cập nhật lên Jira*.
   - Tuỳ chọn: tick *Đọc lại tin gốc* khi dữ liệu trong sổ chưa đủ (tốn token hơn). Bấm *Giao*. Thanh dưới cùng có nút **Hoàn tác**.
3. **Chạy worker**: gõ **`xử lý việc giao AI`** / **`process AI queue`** với Claude, hoặc chạy **`/catask:ai-worker`**. Mỗi lần xử lý tối đa 5 việc đang chờ, việc giao trước làm trước. Worker vẫn chạy kể cả khi nút đang ẩn trên trang.
4. **Xem lại**: chip trên thẻ đổi thành **✨ AI xong — xem**, đầu trang hiện **✨ N AI xong**. Mở ra để xem các bước, bản nháp hoặc tóm tắt (**📋 Chép**) và nguồn; rồi chọn *Dùng được*, *Làm lại* (kèm hướng dẫn mới) hoặc *Huỷ*. Nếu lỗi thì có *Thử lại*.
   - **Cập nhật Jira** (*Soạn để cập nhật lên Jira*): bảng hiện **Hiện tại trên Jira** (đọc lại khi mở) và **Nội dung mới** (sửa được). *Duyệt & cập nhật Jira* → xác nhận ngay trong bảng → trang đọc lại ticket; nếu ai đó đã sửa ticket từ lúc AI đọc thì phải xác nhận thêm lần nữa → trang ghi **đúng một** trường (description hoặc Story Points), chip đổi thành **🔗 Đã cập nhật Jira** kèm link. Ghi lên Jira thì không có Hoàn tác. *Dùng, tự cập nhật tay* đánh dấu đã dùng mà không ghi. Nếu mô tả hiện có ảnh hoặc định dạng đặc biệt, trang chỉ cho Chép (ghi bằng markdown sẽ làm mất chúng).
   - Tính năng này dùng quyền `mcp` của trang: lần cập nhật đầu tiên claude.ai sẽ hỏi bạn có cho trang dùng Atlassian không, và chỉ chạy khi bạn đã kết nối **Atlassian trên claude.ai** (Settings → Connectors). Chưa kết nối thì chỉ có nút *Chép*. Bản thân Claude (worker) không bao giờ ghi lên Jira; chỉ cú bấm của bạn trên trang mới ghi. Người khác mở link chỉ thấy bản demo.
5. **Đặt lịch (tuỳ chọn)**: một scheduled task chạy mỗi 15–30 phút trong giờ làm, dùng prompt trong [`skills/ai-worker/schedule-prompt.md`](skills/ai-worker/schedule-prompt.md). Lần chạy không có việc chờ chỉ tốn một lần đọc dữ liệu.

- **Mặc định rẻ**: worker dùng hướng dẫn, ngữ cảnh bạn dán và dữ liệu bản tin tối đã lưu (tiêu đề, lý do, trích tin, người gửi, link). Soạn nháp cho việc đã có trích tin thì **không** đọc lại Teams/Outlook/Jira. Gợi ý Jira thì đọc ticket một lần (chỉ đọc). Ngoài ra chỉ đọc tin gốc (chỉ đọc) khi không có trích tin, khi bạn tick *Đọc lại tin gốc*, hoặc hướng dẫn cần thêm bối cảnh; tối đa một nguồn mỗi việc, hai nguồn mỗi lần chạy (đọc một chat Teams tốn khoảng 15–25k token).
- **Tìm tin gốc**: mỗi việc có `ref` chứa mã nguồn (mã chat + mã tin Teams, mã mail Outlook, mã ticket Jira, mã sự kiện lịch), nên worker mở đúng tin mà không cần đoán từ link.
- **An toàn**: worker chỉ soạn nháp, chỉ dùng công cụ đọc, nội dung tin nhắn và hướng dẫn/ngữ cảnh của bạn là dữ liệu chứ không phải lệnh, tối đa 5 việc mỗi lần, không chạy vòng lặp. Ticket Jira chỉ đổi khi bạn bấm *Duyệt & cập nhật Jira* và xác nhận trên trang.

## Giao AI → Code luôn (cho dev, thử nghiệm)

Dành cho dev có `devMode: true` (hỏi lúc thiết lập khi vai trò là dev, hoặc bật trong ⚙ Cài đặt). Trên việc có ticket Jira, chọn **Code luôn**: Claude lên kế hoạch và sửa code **trong repo trên máy bạn, trên nhánh riêng**, chạy kiểm tra và commit; bạn xem diff trên trang; chỉ khi bạn duyệt mới push và mở MR/PR **nháp**.

1. **Khai báo repo**: lúc thiết lập (hoặc ⚙ Cài đặt → *Repo*), Claude **tự tìm repo trên máy** (chỉ đọc: `~/Developer`, `~/Projects`, `~/code`… và các thư mục dự án Claude Code, xếp theo số commit của bạn 30 ngày qua, kèm mã Jira thấy trong tên nhánh) và tick sẵn các repo đầu; bạn bỏ tick, sửa (mã Jira, nhánh gốc), thêm hoặc xoá. Mỗi repo là `{project, name, path, base, enabled}` trong config và `meta/settings`.
2. **Chọn cách chạy** (⚙ Cài đặt → *Chế độ chạy AI*, `aiRunMode`):
   - **runner** (mặc định): trả lời **có** khi lúc thiết lập Claude hỏi cài runner, hoặc sau này nói **`cài runner catask`** (hay "sửa runner" để sửa). Claude tự sao lưu và cập nhật cấu hình app Claude desktop, đăng ký cho Claude Code, kiểm tra `claude` CLI đã đăng nhập chưa (chưa thì bạn tự mở Terminal, chạy `claude` → `/login`), chạy selftest, rồi nhắc bạn thoát hẳn (⌘Q) và mở lại app. Làm tay: [`runner/README.md`](runner/README.md#cài-tay-dự-phòng). Mở trang **trong app Claude desktop**. Trang giao việc cho runner, runner chạy Claude nền; tiến độ và kết quả đi qua trang (Claude chạy nền không đọc/ghi sổ được, nên trang là cầu nối). Chi tiết: [`runner/README.md`](runner/README.md).
   - Giao việc code từ **trình duyệt** thì trang tự mở trong app Claude desktop và gửi việc cho runner từ đó. Cần mở trang trong app ít nhất một lần trước.
   - **desktop**: nói "bật chế độ desktop cho AI code", Claude tạo scheduled task trên app desktop (sau khi bạn xác nhận), kiểm hàng đợi mỗi ~2 phút trong giờ làm (cron theo giờ làm, vd 09:00–18:00 T2–T6 → `*/2 9-17 * * 1-5`; app không cho dưới 1 phút và tự lệch vài phút). Mỗi lần chạy đều tốn chút token kể cả khi không có việc.
   - Cách nào cũng có thể dán `catask#<id>` vào Claude (hoặc nói "làm task SF-3102").
3. **Luồng**: kế hoạch (hiện để duyệt, trừ khi việc nhỏ: ≤3 file, rủi ro thấp, không có câu hỏi) → code trên `feature/<KEY>-<tiêu-đề>` (hoặc nhánh sẵn có của mã đó; nhánh gốc = gợi ý của bạn, không thì `sprint/*`/`release/*` khớp, không thì nhánh mặc định) → kiểm tra (`flutter analyze`/test, `yarn typecheck`/`lint`…) → commit `<KEY>: <tóm tắt>` → **bạn xem diff** → *Duyệt push* (MR/PR nháp) hoặc *Yêu cầu sửa* (vòng mới, commit mới). Khi MR được merge, bản tin tối hỏi **Có vẻ đã xong?** trên thẻ; bạn xác nhận.
- **An toàn**: repo phải sạch (không bao giờ stash); không commit vào main/master/develop/sprint/release, không force-push, không merge, không ghi Jira; tối đa 10 file mỗi vòng; mỗi lúc chỉ một lần chạy code; nhánh bạn đang đứng được trả lại như cũ.

## Cấu hình (`~/Documents/daily-digest/config.json`)

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
| `aiAgent` | `false` | Hiện nút "🤖 Giao AI", chip trạng thái AI và số "✨ AI xong" trên trang. Tắt chỉ ẩn đi; yêu cầu đã lưu vẫn giữ. Đổi được trong ⚙ Cài đặt |
| `devMode` | `false` | Bạn có code: bật *Giao AI → Code luôn* cho việc có ticket Jira. Hỏi lúc thiết lập nếu vai trò là dev; đổi được trong ⚙ Cài đặt |
| `repos` | `[]` | `[{project, name, path, base, enabled}]`: mã dự án Jira → repo trên máy (`path` tuyệt đối, nhánh gốc tuỳ chọn, `enabled` mặc định `true`). Được tự tìm lúc thiết lập. Dùng cho việc code và runner |
| `aiRunMode` | `"runner"` | Cách chạy việc code: `"runner"` (MCP `catask-runner` trên máy, qua trang) hoặc `"desktop"` (scheduled task của app desktop, ~2 phút/lần) |
| `runner` | không có | Tuỳ chọn `{claudePath, allowedTools, extraPath}` cho MCP `catask-runner` trên máy ([`runner/README.md`](runner/README.md)) |
| `subagentChatsPerAgent` | `5` | Số chat mỗi subagent đọc |
| `maxChats` | `40` | Số chat tối đa quét mỗi lần |
| `skipChatsOverMembers` | `40` | Bỏ qua chat đông hơn mức này (trừ khi bạn bị tag) |
| `channels` | đủ cả năm | Nguồn cần đọc: `teamsChats`, `teamsChannelMentions`, `outlookMail`, `jiraMail`, `calendar`. Nguồn bị bỏ qua được ghi trong phần độ phủ |
| `keyChats` | `[]` | `[{id, topic}]`: chat luôn được đọc trước mỗi lần chạy (không tính vào `maxChats`); việc nhờ trong đó được nâng một bậc ưu tiên |
| `excludeChats` | `[]` | `[{id, topic}]`: chat không bao giờ đọc (vd nhóm tán gẫu, gắn kết); bị loại trước khi chọn `maxChats` chat sôi nổi nhất. Chat vừa là chat quan trọng thì vẫn đọc. Xoá được trong ⚙ Cài đặt; thêm bằng `cập nhật hồ sơ`. Tự ghi tay thì mỗi mục có thể là tên chat hoặc id chat `19:…` (cả hai danh sách); Claude tự khớp tên với chat của bạn rồi lưu lại dạng `[{id, topic}]` |
| `vipPeople` | `[]` | `[{name, email?, why?}]`: sếp, PO, lead…; việc họ nhờ ít nhất là P1. Tên và "vì sao" cũng hiện trong ⚙ Cài đặt của trang (kho chỉ chủ trang đọc được); email chỉ nằm trong config trên máy |
| `workHours` | `{start:"09:00", end:"18:00", days:[1,2,3,4,5]}` | Giờ làm việc (thứ theo ISO, thứ Hai = 1). Dùng cho tín hiệu "ngoài giờ" và giờ chạy lịch gợi ý |
| `digestTime` | `null` | Giờ bản tin tối `"HH:MM"`; `null` = hết giờ làm + 1 tiếng (làm tròn :00/:30), vào các ngày làm việc. Đổi được trong ⚙ Cài đặt; nói "đổi giờ bản tin theo cài đặt" để áp vào lịch |
| `role`, `currentWork` | `""` | Vai trò và việc bạn đang làm; giúp đoán câu hỏi chung trong nhóm có phải việc của bạn không |
| `keywords` | `[]` | Tiền tố ticket, tên dự án/tính năng (ví dụ `MOB-`); dùng khi dò mail có hạn chót, và câu hỏi chung nhắc tới chúng được giữ ở "Theo dõi" |
| `storeQuotes` | `true` | Lưu đoạn trích ≤500 ký tự của tin gốc trên mỗi việc cho nút "Xem tin". `false` = không lưu nội dung tin nào; trang mở thẳng link gốc |
| `crossSessionDone` | `true` | Ở các phiên Claude Code khác, Claude hỏi trước khi đánh dấu xong việc đang mở khớp với việc bạn vừa làm. `false` = hook SessionStart im lặng |
| `retention` | `{archiveDoneAfterDays: 90, pruneDaysAfterDays: 120, quoteDaysAfterDone: 30}` | catask giữ dữ liệu bao lâu (xem phần Riêng tư). Việc xong quá `archiveDoneAfterDays` ngày được chuyển vào kho lưu trữ theo tháng (tối thiểu 45, vì bản đồ nhiệt tab Tuần cần 6 tuần); bản tin ngày và bản ghi chi phí quá `pruneDaysAfterDays` ngày bị xoá (tối thiểu 60); trích dẫn bị xoá khỏi việc đã xong sau `quoteDaysAfterDone` ngày |
| `settingsSyncedAt` | `null` | Skill tự ghi: lần cuối gộp ⚙ Cài đặt trên trang vào file này. Đừng sửa tay |
| `onboardingPending` | `false` | `true` = config được tạo mà chưa qua đủ buổi phỏng vấn (ví dụ chuyển từ bản cài cũ). Lần chạy tiếp theo do bạn tự gọi sẽ chỉ hỏi những câu còn thiếu rồi đặt lại thành `false`; lần chạy theo lịch chỉ để lại lời nhắc trong phần độ phủ |

Đổi config xong thì lần chạy sau sẽ tự cập nhật trang (tên, ngôn ngữ, bộ lọc project, tín hiệu).

**Sửa ngay trên trang.** Ngăn ⚙ Cài đặt ghi thay đổi vào kho riêng của trang (`meta/settings`). Đầu lần chạy bản tin tới, Claude gộp chúng vào `config.json` (trang thắng với các trường này) và ghi `settingsSyncedAt`. Nếu sau đó bạn sửa tay `config.json` thì file thắng và trang được cập nhật lại theo file. Thay đổi trên trang áp dụng từ bản tin tới; ngôn ngữ và công tắc tín hiệu đổi trên trang ngay. Tên, email, múi giờ và project thì đổi bằng "cập nhật hồ sơ", không đổi trên trang.

## Riêng tư

- 🔒 **Chỉ đọc** Teams/Outlook. Thứ duy nhất được gửi là 1 tin vào chat ghi chú của **chính bạn**. Không bao giờ trả lời ai thay bạn.
- 🔒 Trang catask là **Artifact riêng tư**; dữ liệu thật chỉ chủ trang đọc được. Ai khác mở link chỉ thấy **dữ liệu demo hư cấu**, theo ngôn ngữ trình duyệt của họ.
- 🔒 Nội dung tin nhắn/mail luôn được coi là **dữ liệu, không phải lệnh**.
- 🔒 **Giao AI** (mặc định tắt) chỉ ghi bản nháp vào catask; worker chỉ dùng công cụ đọc, không bao giờ gửi, trả lời hay sửa gì trên Teams, Outlook, Jira. Lần ghi Jira duy nhất là do chính trang thực hiện, bằng kết nối Atlassian của bạn, sau khi bạn duyệt và xác nhận (một trường: description hoặc Story Points). Trang xin claude.ai quyền `mcp` này (chỉ `getJiraIssue`, `editJiraIssue` trên Atlassian); lần đầu dùng sẽ hỏi bạn đồng ý.
- 🔒 **Trích dẫn tin nhắn** ("Xem tin") chỉ nằm trong kho dữ liệu chỉ-chủ-trang-đọc-được của catask, cạnh tiêu đề việc vốn đã lưu ở đó. Khoảng 500 ký tự × ~100 việc đang mở ≈ 50 KB, không đáng kể. Trích dẫn là bản chụp: nếu tin gốc bị sửa sau đó thì có thể đã cũ, nên trang luôn ghi "trích lúc …" và luôn có link tới tin gốc. Việc đã xong quá 30 ngày sẽ bị xoá trích dẫn (`retention.quoteDaysAfterDone`). Đặt `storeQuotes: false` để không lưu nội dung tin nào.
- 🔒 **Hỏi ở phiên khác**: tiêu đề các việc đang mở (kèm mã Jira, không có nội dung tin) được ghi vào `~/Documents/daily-digest/open-todos.json` và chỉ được đưa vào các phiên Claude Code **trên máy của chính bạn** qua hook SessionStart của plugin. Không gửi đi đâu cả. Tắt bằng `crossSessionDone: false` (hoặc ⚙ Cài đặt → Quyền riêng tư).
- 🔒 **catask giữ gì** (kho chỉ chủ trang đọc được, dọn mỗi lần chạy; số ngày đổi được trong `retention`):
  - Việc đang mở và đang chờ: giữ nguyên chừng nào còn mở, dù cũ bao lâu. Mỗi việc có thể có `ref` chỉ chứa mã nguồn (mã chat/tin Teams, mã mail Outlook, mã ticket Jira, mã sự kiện lịch), không chứa nội dung tin, và nếu bạn dùng Giao AI thì có trường `ai` chứa yêu cầu và bản nháp (≤2000 ký tự).
  - Việc đã xong: giữ đầy đủ 90 ngày sau ngày xong để tab Tuần và bản đồ nhiệt chạy đúng. Sau đó được chuyển vào kho lưu trữ theo tháng (`archive/<YYYY-MM>`), chỉ còn id, tiêu đề, ngày xong, người, project, mức ưu tiên, loại việc và nguồn; bản đầy đủ (lý do, link, trích dẫn) bị xoá. Việc bạn vừa sửa trên trang trong 7 ngày qua thì lần chạy đó không đụng tới.
  - Bản tin ngày (`days/…`) và bản ghi chi phí (`runs/…`) quá 120 ngày bị xoá. Cài đặt, hồ sơ (`meta/…`) và kho lưu trữ không bao giờ bị xoá.
  - Mỗi lần chạy xoá tối đa 200 mục; phần còn lại để lần sau. Phần độ phủ của bản tin ghi rõ đã dọn gì.
  - File JSON từng ngày trong `~/Documents/daily-digest/` vẫn nằm trên máy bạn; skill không bao giờ xoá chúng.
- 🔒 Dòng thời gian "làm với AI" chỉ lấy **tên session + giờ** từ transcript Claude Code trên máy, không lấy nội dung. Tab Chi phí chỉ đọc **số token**.
- 🔒 **Chia sẻ**: link trang có thể hiện với người trong tổ chức, nhưng quy tắc kho dữ liệu là chỉ chủ trang (đọc và ghi), nên người khác chỉ thấy dữ liệu demo. Đừng bao giờ cấp quyền sửa trang cho ai.
- 🔒 **Runner** (chỉ cho dev): `catask-runner` là MCP server chạy trên máy bạn. Nó chỉ nhận mã việc và ảnh chụp của việc, không bao giờ nhận lệnh dạng chữ tự do. Nó chạy `claude -p` trên máy, chỉ trong các repo bạn đã bật trong Cài đặt; từ chối repo đang có thay đổi chưa commit, không stash, không merge, không force-push, không commit vào nhánh main/sprint. Log và file việc chỉ ghi trong `~/Documents/daily-digest/runner/`.
- 🔒 **Quyền của trang** (`mcp`): Atlassian `getJiraIssue` / `editJiraIssue`, và các tool `catask-runner` trên máy bạn. claude.ai hỏi bạn trước mỗi lần cấp, và bạn thu hồi được trong menu Permissions của artifact.
- 🔒 Nhịp báo hiệu của dispatcher (`meta/dispatcher`) chỉ lưu một mã phiên vô danh và mốc thời gian.
- 🔒 File trạng thái nằm ở `~/Documents/daily-digest/` trên máy bạn. `config.json` không chứa mật khẩu hay token. Đừng commit thư mục này.

## Cấu trúc

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
  assets/catask.html       # trang catask (Artifact), giao diện vi + en — FILE SINH RA, xem Phát triển
  assets/digest-template.html
  assets/mascot/*.svg
  assets/peeps/*.svg       # Open Peeps, CC0 (xem LICENSE.txt)
skills/ai-worker/
  SKILL.md                 # worker "Giao AI": soạn nháp, tóm tắt, đề xuất Jira (chỉ đọc); việc code
  schedule-prompt.md       # prompt tuỳ chọn cho worker chạy theo lịch
commands/ai-worker.md      # /catask:ai-worker
commands/setup.md          # /catask:setup
commands/update.md         # /catask:update
page-src/catask.src.html   # mã nguồn dễ đọc của trang (sửa ở đây)
scripts/build-page.mjs     # build assets/catask.html từ file đó
tests/smoke.js             # smoke test trang (DOM giả)
runner/
  catask-runner.mjs       # MCP stdio trên máy: cầu nối trang↔Claude chạy nền cho việc code, tìm repo
  selftest.mjs             # node runner/selftest.mjs
hooks/
  hooks.json               # SessionStart: list open todos in your other sessions
  catask-context.mjs       # reads ~/Documents/daily-digest/open-todos.json
  selftest.mjs             # node hooks/selftest.mjs
```

## Phát triển

Trang phát hành `skills/daily-digest-todo/assets/catask.html` là file sinh ra (đã minify cho Claude đọc rẻ trước khi publish). Đừng sửa tay:

1. Sửa `page-src/catask.src.html`.
2. Chạy `node scripts/build-page.mjs` (Node 22; lần đầu `npx` tải `esbuild` đã ghim phiên bản). Script minify `<style>`/`<script>`, bỏ comment HTML, giữ dòng ngắn, và kiểm id, thuộc tính `data-*`, `<title>`, `node --check`. `node scripts/build-page.mjs --check` báo lỗi nếu file build đã cũ.
3. Test cả hai: chạy `tests/smoke.js` như phần Develop (tiếng Anh) → `ALL PASS` ×8.
4. Commit cả hai file. SVG trong `assets/peeps/` và `assets/mascot/` đã được tối ưu sẵn.

## Phát hành bản mới

GitHub là nơi duy nhất sửa code. Bản trong **Organization library** của công ty không tự cập nhật. Mỗi lần ra bản mới:

1. Tăng `version` ở **cả hai** file `.claude-plugin/plugin.json` và `.claude-plugin/marketplace.json` (hai số phải giống nhau), commit rồi push lên `main`.
2. Đẩy lên thư viện công ty: nhắn Claude Code *"đẩy catask lên thư viện công ty"* (hoặc đăng lại từ trang Plugins). Bản mới đè lên mục cũ, đồng nghiệp bấm **+** là có bản mới.
3. Kiểm tra: mục trong Organization library hiện đúng số phiên bản như `plugin.json`.

## Ghi công

Hình người: [Open Peeps](https://www.openpeeps.com/) của Pablo Stanley, CC0 1.0 (xem `skills/daily-digest-todo/assets/peeps/LICENSE.txt`).

## Giấy phép

MIT — xem [`LICENSE`](LICENSE). © 2026 Hồ Thiên Long.
