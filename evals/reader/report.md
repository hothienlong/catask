# Reader eval report

111 messages, 47 gold keep=true, 3 trials per model. Cells: mean (min–max over trials). Cost assumes 90% input / 10% output of the reported total tokens.

| model | recall | precision | trap FP | noise FP | mention-flag acc (name / @-only) | sentBy acc | type acc (strict / loose) | forUser misses | returned | tokens | $/run |
|---|---|---|---|---|---|---|---|---|---|---|---|
| opus | 100% (100–100) | 84% (65–94) | 18% (5–44) | 13% (4–32) | 87% (84–94) / 94% (83–100) | 100% (100–100) | 98% (98–98) / 100% (100–100) | 0.0 (0.0–0.0) | 57 (50–72) | 111800 (108305–116034) | $0.626 ($0.607–$0.650) |
| sonnet | 100% (100–100) | 94% (94–94) | 4% (3–5) | 5% (4–8) | 93% (84–100) / 80% (72–84) | 100% (100–100) | 98% (98–98) / 100% (100–100) | 0.0 (0.0–0.0) | 50 (50–50) | 117928 (117399–118844) | $0.330 ($0.329–$0.333) |
| haiku | 100% (100–100) | 58% (54–62) | 58% (51–67) | 47% (36–56) | 90% (89–91) / 100% (100–100) | 100% (100–100) | 90% (87–91) / 95% (94–96) | 0.0 (0.0–0.0) | 81 (76–87) | 138866 (133815–142364) | $0.019 ($0.019–$0.020) |

## Recall per category (keep=true)

| category | n | opus | sonnet | haiku |
|---|---|---|---|---|
| direct_ask | 7 | 100% (100–100) | 100% (100–100) | 100% (100–100) |
| indirect_ask | 7 | 100% (100–100) | 100% (100–100) | 100% (100–100) |
| mention_question | 6 | 100% (100–100) | 100% (100–100) | 100% (100–100) |
| promise | 6 | 100% (100–100) | 100% (100–100) | 100% (100–100) |
| done | 7 | 100% (100–100) | 100% (100–100) | 100% (100–100) |
| deadline_decision | 6 | 100% (100–100) | 100% (100–100) | 100% (100–100) |
| tension | 6 | 100% (100–100) | 100% (100–100) | 100% (100–100) |
| thanks | 2 | 100% (100–100) | 100% (100–100) | 100% (100–100) |

## Trap false-positive rate per category (lower is better)

| trap | n | opus | sonnet | haiku |
|---|---|---|---|---|
| trap_other_ask | 6 | 39% (0–100) | 0% (0–0) | 100% (100–100) |
| trap_other_mention | 6 | 33% (0–100) | 0% (0–0) | 100% (100–100) |
| trap_group_wide | 6 | 44% (17–83) | 28% (17–33) | 89% (83–100) |
| trap_banter | 7 | 0% (0–0) | 0% (0–0) | 38% (14–71) |
| trap_system | 8 | 0% (0–0) | 0% (0–0) | 33% (25–38) |
| trap_out_of_window | 6 | 0% (0–0) | 0% (0–0) | 0% (0–0) |

## Misses and flag errors (message ids, count over trials)

- **opus** missed: none
- **opus** mention-flag wrong: direct_ask `Mun ơi chiều nay em gửi chị estimate LD-482 (màn ` ×2; direct_ask `Anh Mun gửi bên em log request /verify-face lúc l` ×2; thanks `Thanks anh Mun nhiều, rõ rồi ạ` ×2; tension `Mun, sao LD-482 estimate 5 ngày mà giờ là ngày th` ×2; direct_ask `Mun review giúp anh MR !1287 trước 3h chiều nha, ` ×2; direct_ask `Mun viết release note phần eKYC cho 3.2 trước 10h` ×2; thanks `ok rồi nè, cảm ơn Mun nha 🙏` ×2; direct_ask `Mun update giúp chị trạng thái LD-475 trên Jira n` ×2; tension `Chị nhắc lần 2 rồi nha em, estimate LD-482 đâu 😅` ×1; deadline_decision `Chị chốt rồi nha: màn consent dùng bản copy mới củ` ×1; indirect_ask `Nhờ em xem giúp chị flow OTP khoản vay bên Android` ×1; indirect_ask `khi nào rảnh thì xem giúp anh crash Crashlytics #a` ×1
- **sonnet** missed: none
- **sonnet** mention-flag wrong: indirect_ask `khi nào rảnh thì xem giúp anh crash Crashlytics #a` ×2; indirect_ask `Nhờ em xem giúp chị flow OTP khoản vay bên Android` ×1; deadline_decision `Chị chốt rồi nha: màn consent dùng bản copy mới củ` ×1; tension `Chị nhắc lần 2 rồi nha em, estimate LD-482 đâu 😅` ×1; thanks `Thanks anh Mun nhiều, rõ rồi ạ` ×1; indirect_ask `chị thấy cái nút Tiếp tục ở màn chụp CCCD mặt sau ` ×1; direct_ask `ông gửi tui file config remote của eKYC staging đi` ×1; indirect_ask `mà tui thấy hàm retry upload ảnh selfie của ông ti` ×1; thanks `ok rồi nè, cảm ơn Mun nha 🙏` ×1
- **haiku** missed: none
- **haiku** mention-flag wrong: direct_ask `Mun ơi chiều nay em gửi chị estimate LD-482 (màn ` ×3; direct_ask `Anh Mun gửi bên em log request /verify-face lúc l` ×3; thanks `Thanks anh Mun nhiều, rõ rồi ạ` ×3; tension `Mun, sao LD-482 estimate 5 ngày mà giờ là ngày th` ×3; direct_ask `Mun review giúp anh MR !1287 trước 3h chiều nha, ` ×3; direct_ask `Mun viết release note phần eKYC cho 3.2 trước 10h` ×3; thanks `ok rồi nè, cảm ơn Mun nha 🙏` ×3; direct_ask `Mun update giúp chị trạng thái LD-475 trên Jira n` ×3

## Verdict

Threshold: switch the default to Haiku only if mean recall on indirect asks and on @mention+question are each ≥ 95% and mean mention-flag accuracy ≥ 95%.

Mention-flag gold has two readings: **name** = the user is @mentioned or addressed by name ("Mun ơi…", "Anh Mun gửi…"); **@-only** = the text has a literal @mention.

- opus: name-gold fail, @-only gold fail (worst-trial recall indirect 100%, @mention+q 100%; mean flag acc 87% name / 94% @-only)
- sonnet: name-gold fail, @-only gold fail (worst-trial recall indirect 100%, @mention+q 100%; mean flag acc 93% name / 80% @-only)
- haiku: name-gold fail, @-only gold PASS (worst-trial recall indirect 100%, @mention+q 100%; mean flag acc 90% name / 100% @-only)

### Reading (hand-written, 2026-11-14 run)

- Recall is saturated: all three models returned every gold keep=true message in every trial (incl. all 7 indirect asks and 6 @mention+question), so recall on this set does not separate them. Harder cases are needed before recall can decide anything.
- On the threshold as written, Haiku passes only under the @-only reading of the mention flag (100%); under the "addressed by name" reading it fails at 90%, because it consistently sets `mentionsUser:false` for "Mun ơi…" / "Anh Mun…" without a literal @ (Opus does the same; Sonnet is closest on name-gold but marks unaddressed 1:1 messages as mentions). Fix the brief's definition of "mentioned" before using this flag as a gate.
- Haiku's real cost is precision: ~81 items vs 50 for Sonnet, keeping 100% of asks/@mentions aimed at other people and ~1/3 of system/image-only messages. That is allowed by "when unsure include it", but it moves filtering work and tokens to the main run. Reported $/run (incl. ~100k agent overhead tokens): opus ~$0.63, sonnet ~$0.33, haiku ~$0.02.
