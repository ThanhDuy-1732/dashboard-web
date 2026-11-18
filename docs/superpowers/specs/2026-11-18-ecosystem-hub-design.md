# Hub hệ sinh thái — Thiết kế

- **Ngày:** 2026-11-18
- **Trạng thái:** chờ chủ dự án duyệt
- **Tên tạm:** Ecosystem Hub (tên chính thức do chủ dự án chốt)

## 1. Ý tưởng và lý do

Hiện tại 5–10 ứng dụng web của chủ dự án được chia sẻ bằng link riêng lẻ. Chủ dự án không biết ứng dụng nào khách dùng nhiều, ứng dụng nào đang chết, và phản hồi chậm hay nhanh.

Xây một **hub công khai dạng PWA**: khách mở một link duy nhất, thấy danh sách ứng dụng trong hệ sinh thái, bấm chọn và được chuyển hướng sang đúng ứng dụng. Kèm một **dashboard admin** riêng để chủ dự án xem lượt bấm theo từng ứng dụng, trạng thái sống/chết, độ trễ phản hồi, lịch sử sự cố, và nhận cảnh báo qua Telegram + email khi có ứng dụng gặp sự cố.

Mục tiêu kép: **một link duy nhất cho khách** và **một bảng điều khiển cho chủ dự án**.

## 2. Mục tiêu, không làm, điều không muốn

### Mục tiêu

- Một URL duy nhất để chia sẻ cho khách; khách thấy đủ danh sách và vào đúng ứng dụng trong tối đa 2 lần chạm.
- Cài được lên màn hình chính (PWA), mở nhanh, xem được danh sách khi offline.
- Đếm lượt bấm từ hub sang từng ứng dụng, theo ngày; xem xu hướng 7 và 30 ngày.
- Ping từng ứng dụng mỗi 1–2 phút; biết ứng dụng sống/chết, độ trễ; lưu lịch sử 30 ngày.
- Cảnh báo khi ứng dụng chết (sau 3 lần kiểm tra thất bại liên tiếp) và khi hồi phục, qua Telegram + email.
- Chủ dự án tự thêm/sửa/ẩn/sắp xếp ứng dụng từ dashboard, không cần sửa code hay deploy lại.
- Cảnh báo cả khi chính bộ kiểm tra ngừng chạy (watchdog độc lập trong Supabase, báo qua Telegram).
- Chi phí 0 đồng/tháng ở quy mô hiện tại (Vercel Hobby, Supabase Free, Resend Free, Telegram). Hub là dự án cá nhân, phi thương mại — phù hợp điều khoản Vercel Hobby.

### Không làm (non-goals)

- Không đo hành vi bên trong từng ứng dụng (pageview, session, real-user monitoring). Chỉ đếm lượt bấm tại hub.
- Không tài khoản cho khách; không phân quyền nhiều admin/role.
- Không trang trạng thái công khai cho khách (có thể làm sau).
- Không ứng dụng mobile native; không backend tự vận hành; không thêm runtime ngoài Next.js.
- Không cam kết SLA; đây là giám sát nội bộ, không phải dịch vụ uptime thương mại.

### Anti-goals (làm ra cũng coi như thất bại)

- Dashboard rối đến mức chủ dự án không buồn mở.
- Cảnh báo giả hoặc bão thông báo làm mất niềm tin vào hệ thống.
- Phát sinh chi phí hoặc việc bảo trì server định kỳ.

## 3. Ràng buộc

- **Chỉ Next.js** (App Router, TypeScript) chạy trên Vercel. Không Supabase Edge Function, không dịch vụ uptime bên ngoài.
- **Supabase** giữ Postgres + Auth + Cron (pg_cron + pg_net). Chủ dự án muốn kiểm soát dữ liệu tại đây.
- Quy mô: 5–10 ứng dụng, 1 admin.
- Dự án cá nhân, phi thương mại → dùng Vercel Hobby hợp lệ. Các app được deploy lại khi có cập nhật, không phải hằng ngày, nhưng vẫn cần cơ chế tránh báo động giả lúc deploy.
- Vercel Cron ở gói Hobby chỉ chạy khoảng 1 lần/ngày → phần hẹn giờ đặt tại Supabase, gọi API route của Next.js kèm secret.
- Giao diện tiếng Việt.
- Không có database/backend tự dựng; mọi thứ dùng dịch vụ quản lý sẵn.

## 4. Các hướng đã cân nhắc

1. **Một ứng dụng Next.js duy nhất + Supabase làm dữ liệu và hẹn giờ (đã chọn).**
   Hub, `/admin`, API đếm click chung một repo. Supabase Cron gọi `/api/cron/health` mỗi 1–2 phút. Ưu: một repo, một runtime, dễ sửa, đúng yêu cầu "chỉ Next.js". Nhược: phụ thuộc hai dịch vụ free.
2. Next.js cho giao diện + Supabase Edge Function lo health check.
   Ưu: phần nền tách khỏi giới hạn thời gian của Vercel. Nhược: hai môi trường code (TypeScript thường và Deno), khó bảo trì cho một người. Bị loại vì chủ dự án chỉ muốn Next.js.
3. Dịch vụ uptime có sẵn (Better Stack/UptimeRobot) + Next.js đọc API.
   Ưu: ít code nhất, kiểm tra tin cậy. Nhược: dữ liệu và cảnh báo nằm ngoài, khó tùy biến ngưỡng/lịch sử, không kiểm soát dữ liệu. Bị loại.

**Đã chọn hướng 1.**

## 5. Kiến trúc

```
Khách ──► Vercel / Next.js (public) ────► Supabase Postgres (đọc danh sách app)
             │
             └─ /api/go/[slug] ─── ghi click_events ───► 302 sang app

Supabase Cron (mỗi 1 phút)
   └─ pg_net ──► POST /api/cron/health (x-cron-secret)
                    └─ ping song song 5–10 app (timeout 5s)
                         ├─ ghi checks
                         ├─ cập nhật app_status + incidents
                         └─ chuyển trạng thái? ──► Telegram Bot API + Resend

Supabase Cron watchdog (mỗi 5 phút)
   └─ lần kiểm tra cuối > 10 phút? ──► Telegram (báo bộ giám sát đang chết)

Admin ──► Supabase Auth (magic link) ──► /admin (middleware chặn)
             └─ server actions đọc/ghi bằng service role (RLS deny-all)
```

### 5.1 Bảng dữ liệu chính

| Bảng | Cột chính | Ghi chú |
|---|---|---|
| `apps` | id, slug (unique), name, description, url, icon_url, sort_order, is_visible, monitor_enabled, monitoring_paused_until, health_url, expected_status (mặc định 200), timeout_ms (5000), created_at, updated_at | `health_url` mặc định bằng `url` nếu để trống |
| `click_events` | id, app_id, clicked_at, referrer, user_agent, ip_hash, country, path | Index `(app_id, clicked_at)` |
| `checks` | id, app_id, checked_at, ok, status_code, latency_ms, error | Giữ 30 ngày, dọn bằng cron |
| `app_status` | app_id (PK), state ('up'/'down'/'unknown'), consecutive_failures, last_check_at, last_ok_at, last_down_at | 1 dòng / app |
| `incidents` | id, app_id, started_at, resolved_at, first_error | Mở khi chuyển sang down, đóng khi hồi phục |
| `settings` | id (singleton), telegram_chat_id, email_recipients, failure_threshold (3), slow_threshold_ms (2000), alerts_enabled, notify_recovery, repeat_reminder_minutes | Secret (bot token, Resend key) để trong env, không lưu DB |
| `ops_alerts` | key (PK, ví dụ 'watchdog:stale'), last_sent_at | Chống lặp cảnh báo của watchdog |

Tất cả bảng bật RLS, không cho `anon` đọc/ghi; truy cập chỉ qua server (service role). Không bao giờ gửi service role key xuống client.

### 5.2 Route và màn hình

**Công khai**

- `/`: lưới thẻ ứng dụng (icon, tên, mô tả ngắn). Mobile-first. Mỗi thẻ trỏ tới `/api/go/[slug]`.
- `/api/go/[slug]`: ghi một `click_event` rồi redirect 302 sang `apps.url`. Bỏ qua user-agent bot cơ bản (bot/crawler/spider). Có thể gắn `utm_source=hub&utm_medium=referral`; để builder quyết định, không chặn.
- `/offline`: trang dự phòng khi mất mạng, hiển thị danh sách app đã cache.
- `manifest.webmanifest`, service worker, bộ icon 192/512 (maskable), theme color. Dùng `@serwist/next`.
- Không hiển thị trạng thái uptime cho khách.

**Admin**

- `/admin/login`: đăng nhập magic link qua Supabase Auth. Chỉ email trong `ADMIN_EMAILS` được vào.
- `/admin`: tổng quan — KPI (click hôm nay / 7 ngày / 30 ngày, số app đang hiển thị, số app down, độ trễ trung bình), biểu đồ click theo ngày, bảng trạng thái từng app (up/down, latency gần nhất, uptime 24h).
- `/admin/apps`: danh sách + CRUD, kéo sắp xếp, bật/tắt hiển thị, bật/tắt giám sát.
- `/admin/apps/[id]`: click theo ngày, uptime %, biểu đồ độ trễ, các lần kiểm tra gần đây, lịch sử sự cố.
- `/admin/settings`: kênh cảnh báo (chat id Telegram, email nhận), ngưỡng, bật/tắt nhắc lại, nút "gửi thử".

**Nội bộ**

- `/api/cron/health`: chỉ nhận POST kèm header `x-cron-secret` (so sánh timing-safe). Ping song song các app bật giám sát, ghi kết quả, xử lý chuyển trạng thái và gửi cảnh báo. Có khóa chống chồng lấn (nếu lần chạy trước chưa xong thì bỏ qua). `maxDuration` đặt 60s; timeout mỗi app 5s.

### 5.3 Logic sức khỏe và cảnh báo

- Kết quả một lần kiểm tra: `ok` khi status code bằng `expected_status` (mặc định 200) và không timeout/lỗi mạng; lưu `latency_ms`.
- Down khi có `failure_threshold` lần thất bại liên tiếp (mặc định **3**, tức khoảng 3 phút để tránh báo nhầm khi app vừa deploy/restart). Lúc đó: mở incident, gửi cảnh báo **một lần**.
- Hồi phục khi có lần `ok` đầu tiên sau khi down: đóng incident, gửi cảnh báo hồi phục (nếu bật).
- **Tạm dừng giám sát:** mỗi app có nút "tạm dừng 30/60 phút" (lưu `monitoring_paused_until`). Trong thời gian tạm dừng, app không được ping và không sinh cảnh báo; dashboard hiển thị nhãn "đang tạm dừng". Đây là cách chủ động tránh báo động giả khi deploy. Có nút "tiếp tục ngay".
- Chậm: latency vượt `slow_threshold_ms` 3 lần liên tiếp → gửi cảnh báo chậm, tối đa 1 lần/giờ cho mỗi app.
- Khi vẫn down: nhắc lại mỗi `repeat_reminder_minutes` (mặc định tắt) — tránh bão thông báo.
- Nội dung cảnh báo: tên app, trạng thái, status code hoặc lỗi, độ trễ, thời điểm, link tới `/admin/apps/[id]`.

### 5.4 Đếm lượt bấm

- Ghi từng lượt bấm vào `click_events` (không cần bảng tổng hợp ở quy mô này).
- Dashboard hiển thị tổng lượt bấm và lượt "khách riêng" theo ngày/tuần/30 ngày. Dùng salt cố định trong env: `ip_hash = hash(IP + user-agent + salt)`; không lưu IP thô. Salt cố định cho phép tính đúng khách riêng cho mọi khoảng thời gian (salt theo ngày sẽ khiến không thể tính 7/30 ngày về sau).
- Lấy quốc gia từ header `x-vercel-ip-country` nếu có.
- Chống lạm dụng: bản 1 chỉ lọc bot theo user-agent; rate-limit nhẹ có thể thêm sau mà không đổi thiết kế.

### 5.5 PWA

- Cài được trên iOS/Android, chạy standalone.
- Precache khung giao diện + danh sách app; khi offline, `/` hiển thị danh sách đã cache kèm nhãn "offline".
- Không push notification cho khách ở bản này.

### 5.6 Bảo mật

- Service role key chỉ dùng server-side; RLS deny-all cho `anon`.
- Admin giới hạn theo `ADMIN_EMAILS`; middleware chặn toàn bộ `/admin/*` trừ `/admin/login`.
- `CRON_SECRET` dài, ngẫu nhiên; so sánh timing-safe.
- Secret của Telegram/Resend nằm trong env Vercel, không gửi xuống client. Riêng bot token Telegram còn được lưu trong Supabase Vault để watchdog đọc khi gửi cảnh báo trực tiếp.
- Không log token; không trả lỗi nội bộ chi tiết ra ngoài.

### 5.7 Watchdog cho chính bộ giám sát

Nếu cron Supabase, `pg_net`, secret hoặc deploy hỏng, các app có thể đứng ở trạng thái "up" cũ và chủ dự án bị mù mà không biết. Vì ràng buộc chỉ dùng Next.js + Supabase, không thêm dịch vụ uptime ngoài, watchdog chạy ngay trong Supabase:

- Một cron riêng mỗi 5 phút kiểm tra `max(checked_at)` trong bảng `checks`.
- Nếu lần kiểm tra gần nhất cũ hơn 10 phút (hoặc bảng trống), gửi cảnh báo trực tiếp qua Telegram Bot API bằng `pg_net`, không đi qua Next.js.
- Chống lặp bằng bảng `ops_alerts`: tối đa một cảnh báo mỗi 60 phút cho cùng một lý do.
- Dashboard luôn hiện banner "lần kiểm tra cuối cách đây N phút"; quá 10 phút thì banner chuyển sang màu cảnh báo.
- Giới hạn đã biết: nếu `pg_cron` của Supabase chết hoàn toàn thì watchdog cũng không chạy. Muốn bắt được trường hợp đó cần một dịch vụ ngoài, đã bị loại theo ràng buộc.

## 6. Triển khai

- Một repo Next.js; env: `NEXT_PUBLIC_SITE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `TELEGRAM_BOT_TOKEN`, `RESEND_API_KEY`, `ADMIN_EMAILS`.
- Migration SQL tạo bảng, index, RLS; bật `pg_cron` + `pg_net`; lịch gọi `/api/cron/health` mỗi phút (Supabase SQL).
- Cron dọn `checks` cũ hơn 30 ngày.
- Watchdog SQL mỗi 5 phút + lưu bot token trong Supabase Vault.
- Deploy Vercel; domain tùy chọn; seed 5–10 app do chủ dự án cung cấp.
- Hướng dẫn ngắn: tạo bot Telegram, lấy chat id, xác minh domain Resend (hoặc dùng địa chỉ test gửi về email chủ), cách bấm tạm dừng giám sát trước khi deploy app.

## 7. Tiêu chí thành công

- Khách mở hub trên điện thoại, thấy đủ app, bấm 1 lần là sang đúng app.
- Sau một tuần có dữ liệu click theo ngày và uptime/độ trễ cho từng app.
- Tắt thử một app → nhận cảnh báo Telegram + email trong vòng ≤ 5 phút; bật lại → nhận thông báo hồi phục.
- Tạm dừng giám sát một app 30 phút rồi deploy → không có cảnh báo down/recovery nào.
- Dừng cron gọi `/api/cron/health` → nhận cảnh báo watchdog qua Telegram trong ≤ 15 phút.
- Thêm một app mới từ dashboard trong dưới 1 phút, không cần deploy.
- Cài PWA lên màn hình chính; mở khi offline vẫn thấy danh sách.
- Chi phí duy trì 0 đồng/tháng ở quy mô hiện tại.

## 8. Những gì để builder tự quyết

- Thư viện UI/chart (đề xuất Tailwind + shadcn/ui + Recharts), zod cho validate, `@supabase/ssr`, `@serwist/next`, Resend SDK.
- Bố cục thẻ app, typography, màu sắc, dark/light theo hệ thống (mặc định theo hệ thống).
- Có gắn UTM khi redirect hay không.
- Chi tiết form admin, toast, xác nhận xóa.
- Múi giờ gom nhóm theo ngày: `Asia/Ho_Chi_Minh`.
- Icon app ở bản 1 là URL dán vào, chưa làm upload.
- Lượt bấm của chính chủ dự án được tính như khách ở bản 1; có thể lọc sau bằng cookie admin.
- Cấu trúc migration và seed.

## 9. Câu hỏi cần chủ dự án chốt

Đã chốt trong buổi brainstorm:

- Dự án cá nhân, phi thương mại → Vercel Hobby.
- Deploy app khi có cập nhật; dùng nút tạm dừng giám sát để tránh báo động giả.
- Có watchdog cho chính bộ giám sát, báo qua Telegram.
- Ngưỡng mặc định: ping 1 phút, 3 lần fail liên tiếp, chậm > 2s (chỉnh được trong settings).

Còn lại, cần trước khi deploy/chạy thật (không chặn việc lập kế hoạch và code):

1. Tên hub và domain (hoặc dùng domain `*.vercel.app` tạm).
2. Email admin để đăng nhập magic link; email nhận cảnh báo (có thể cùng một địa chỉ).
3. Resend: đã có domain để xác minh chưa? Nếu chưa, dùng địa chỉ test của Resend chỉ gửi được về email chủ.
4. Telegram: đã có bot/chat id chưa, hay cần hướng dẫn tạo?
5. Danh sách 5–10 app: tên, URL, mô tả ngắn, icon (có thể bổ sung sau khi có giao diện).
