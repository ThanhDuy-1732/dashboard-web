# Hub hệ sinh thái — Thiết kế (v3, Neon Postgres)

- **Ngày:** 2026-11-18
- **Trạng thái:** đã chốt hướng, chờ duyệt bản cập nhật
- **Tên tạm:** Ecosystem Hub (tên chính thức do chủ dự án chốt)

## 1. Ý tưởng và lý do

Chủ dự án có 5–10 ứng dụng web, mỗi ứng dụng dùng một project Supabase riêng. Hiện tại các ứng dụng được chia sẻ bằng link riêng lẻ; chủ dự án không biết ứng dụng nào được khách dùng nhiều, ứng dụng hoặc Supabase nào đang chết, và phản hồi bao lâu.

Xây một **hub công khai dạng PWA** để khách chọn ứng dụng và được chuyển hướng, kèm **dashboard admin** theo dõi lượt bấm, trạng thái ứng dụng + Supabase, độ trễ, sự cố và cảnh báo Telegram/email.

Chủ dự án đã cung cấp một **Neon Postgres** để lưu dữ liệu hub. Supabase chỉ là mục tiêu health check, không dùng làm database/auth/cron cho hub.

## 2. Mục tiêu, không làm, điều không muốn

### Mục tiêu

- Một URL duy nhất cho khách; khách thấy đủ danh sách và vào đúng ứng dụng trong tối đa 2 lần chạm.
- Cài được lên màn hình chính (PWA), mở nhanh, xem được danh sách khi offline.
- Đếm lượt bấm theo ngày và "khách riêng" (hash IP + UA + salt cố định).
- Health check **cả hai**: URL ứng dụng và `https://<ref>.supabase.co/auth/v1/health` của project Supabase tương ứng.
- Biết trạng thái hiện tại, uptime/độ trễ theo ngày, lịch sử sự cố 30 ngày.
- Cảnh báo Telegram + email khi một mục tiêu chết (3 lần lỗi liên tiếp) hoặc chậm bất thường; báo khi hồi phục.
- Chủ dự án tự thêm/sửa/ẩn/sắp xếp ứng dụng từ dashboard, có hiệu lực ngay (không cần deploy).
- Không phải tự vận hành server/database; chi phí 0 đồng/tháng ở quy mô hiện tại.

### Không làm (non-goals)

- Không đo hành vi bên trong ứng dụng (pageview, session, RUM).
- Không tài khoản cho khách; không nhiều admin/role.
- Không trang trạng thái công khai cho khách.
- Không push notification cho khách.
- Không phân tích real-time; dashboard đọc DB với cache ngắn.
- Không dùng Supabase cho dữ liệu/auth/cron của hub.

### Anti-goals

- Dashboard rối, cảnh báo giả, hoặc phát sinh chi phí/thuê server.
- Phụ thuộc vào một dịch vụ ngoài cho trang hub công khai.
- Lưu IP thô hoặc secret trong repo.

## 3. Ràng buộc

- **Chỉ Next.js** (App Router, TypeScript) trên Vercel cho phần chạy ứng dụng.
- **Neon Postgres** là database duy nhất; kết nối qua `DATABASE_URL` (pooled, `sslmode=require`). Không Supabase DB/Auth/Cron.
- Health check chạy mỗi **5 phút** bằng cron-job.org (miễn phí), gọi endpoint Next.js có secret. Cảnh báo sau ~15 phút (3 lần lỗi).
- Dự án cá nhân, phi thương mại → Vercel Hobby hợp lệ.
- Giao diện tiếng Việt; mọi thống kê theo `Asia/Ho_Chi_Minh`.
- 5–10 ứng dụng, 1 admin.
- Secrets trong env Vercel và `.env.local` (đã gitignore), không commit.
- Node runtime cho route handlers; `maxDuration = 60` cho cron health.

## 4. Các hướng đã cân nhắc

1. **Supabase làm database/auth/cron** — bị loại vì Supabase chỉ là mục tiêu giám sát.
2. **GitHub JSON làm kho dữ liệu** — đúng "không database" nhưng mỗi lượt bấm/check là một commit, ghi chậm, dễ mất dữ liệu khi tranh chấp; bị loại khi chủ dự án cung cấp Neon.
3. **Neon Postgres + Next.js (đã chọn)** — managed Postgres, free tier, không phải tự chạy server; schema quan hệ, truy vấn nhanh, không commit dữ liệu, admin CRUD tức thì. Đổi lại: phụ thuộc Neon (đã có sẵn) và cần cron ngoài.

**Đã chọn hướng 3.**

## 5. Kiến trúc

```
Khách ──► Vercel / Next.js (public)
             ├─ đọc apps từ Neon (server component)
             └─ /api/go/[slug] ── ghi click_events ── 302 sang app

cron-job.org (5 phút)
   └─ POST /api/cron/health (x-cron-secret)
        ├─ claim lock trong settings
        ├─ ping song song: URL app + Supabase /auth/v1/health
        ├─ ghi checks, app_status, incidents
        └─ chuyển trạng thái? ──► Telegram + Resend

Admin ──► /admin/login (mật khẩu) ──► cookie JWT ký
             ├─ /admin: KPI + chart + trạng thái
             ├─ /admin/apps: CRUD trực tiếp Neon
             └─ /admin/settings: ngưỡng + kênh cảnh báo
```

### 5.1 Bảng dữ liệu

| Bảng | Cột chính | Ghi chú |
|---|---|---|
| `apps` | id uuid, slug unique, name, description, url, icon_url, supabase_ref, supabase_health_url, sort_order, is_visible, monitor_app, monitor_supabase, monitoring_paused_until, expected_status (200), timeout_ms (5000), created_at, updated_at | `supabase_health_url` mặc định suy ra từ `supabase_ref` |
| `click_events` | id bigserial, app_id, clicked_at, referrer, user_agent, ip_hash, country | Giữ 90 ngày |
| `checks` | id bigserial, app_id, target ('app'/'supabase'), checked_at, ok, status_code, latency_ms, error | Giữ 30 ngày |
| `app_status` | (app_id, target) PK, state ('up'/'down'/'unknown'), consecutive_failures, consecutive_slow, last_check_at, last_ok_at, last_down_at, last_down_alert_at, last_slow_alert_at | 1 dòng / app / target |
| `incidents` | id bigserial, app_id, target, started_at, resolved_at, first_error | Unique index một incident mở / (app,target) |
| `settings` | id=1, telegram_chat_id, email_recipients text[], failure_threshold (3), slow_threshold_ms (2000), alerts_enabled, notify_recovery, repeat_reminder_minutes (0), health_run_locked_at, last_cleanup_at, updated_at | Singleton |
| `schema_migrations` | name, applied_at | Cho migration runner |

Indexes: `click_events(app_id, clicked_at desc)`, `click_events(clicked_at desc)`, `checks(app_id, target, checked_at desc)`, `checks(checked_at desc)`, `incidents(app_id, started_at desc)`.

`claim_health_run()` atomically updates `settings.health_run_locked_at` if null or older than 30s; `release_health_run()` clears it. Cleanup hằng ngày xóa checks >30 ngày và clicks >90 ngày.

### 5.2 Đếm lượt bấm

- `/api/go/[slug]`: tìm app visible; ghi `click_events`; redirect 302 ngay; `cache-control: no-store`.
- Bỏ qua bot theo user-agent. `ip_hash = sha256(ip + '|' + userAgent + '|' + IP_HASH_SALT)`; không lưu IP thô.
- Lấy country từ `x-vercel-ip-country` nếu có.
- Lỗi ghi DB chỉ log, không chặn redirect.

### 5.3 Health check

- `/api/cron/health` chỉ nhận POST kèm `x-cron-secret` (hash + timingSafeEqual). `claim_health_run()` chống chồng lấn; `finally release`.
- Mỗi app sinh tối đa 2 target: `app` (url) và `supabase` (`https://<ref>.supabase.co/auth/v1/health`). Bỏ qua target bị tắt hoặc app đang `monitoring_paused_until`.
- Ping song song, timeout 5s, theo redirect; `ok` khi status = `expected_status` (mặc định 200); lưu latency.
- Down sau 3 lần lỗi liên tiếp (~15 phút) → mở incident + cảnh báo một lần. Hồi phục → đóng incident + báo (nếu bật).
- Chậm khi latency > 2000ms 3 lần liên tiếp → báo tối đa 1 lần/giờ.
- Nhắc lại khi vẫn down mỗi `repeat_reminder_minutes` (mặc định tắt).
- Cảnh báo gồm tên app + target (`Ứng dụng`/`Supabase`), status/lỗi, latency, giờ VN, link `/admin/apps/[id]`.
- Sau mỗi run: nếu quá 24h kể từ `last_cleanup_at`, xóa checks cũ >30 ngày và clicks >90 ngày, cập nhật mốc.

### 5.4 Dashboard admin

- `/admin`: KPI click hôm nay/7/30 ngày, khách riêng 30 ngày, số app, số target down, độ trễ TB 24h; chart click 30 ngày; bảng từng app với 2 badge trạng thái (app/Supabase), latency gần nhất, nút pause.
- Banner dữ liệu cũ nếu `max(last_check_at)` > 10 phút hoặc chưa có check.
- `/admin/apps`: CRUD, kéo sắp xếp, bật/tắt hiển thị, bật/tắt monitor từng target, pause 30/60 phút.
- `/admin/apps/[id]`: click 30 ngày, uptime 24h/7d và latency 7 ngày cho từng target, checks gần đây, incidents.
- `/admin/settings`: chat id Telegram, email nhận, ngưỡng, bật/tắt cảnh báo, nút gửi thử.
- Mọi trang admin yêu cầu phiên hợp lệ.

### 5.5 Xác thực admin

- Một mật khẩu trong `ADMIN_PASSWORD`; so sánh SHA-256 + `timingSafeEqual`.
- Session JWT ký HS256 bằng `SESSION_SECRET` (`jose`), cookie `hub_session` httpOnly/sameSite=lax/secure ở production, 7 ngày.
- `src/proxy.ts` (Next 16, thay cho middleware) chặn `/admin/*` trừ `/admin/login`; admin layout kiểm tra lại.
- `ADMIN_PASSWORD=change-me-now` bị từ chối ở production.
- Không có đăng ký, quên mật khẩu, hay nhiều user.

### 5.6 PWA

- `manifest.ts`, icon 192/512 + maskable, `display: standalone`, tiếng Việt.
- Service worker (Serwist) precache khung + cache điều hướng; offline hiển thị `/offline` hoặc HTML đã cache.
- Không push notification.

### 5.7 Bảo mật

- `DATABASE_URL`, `ADMIN_PASSWORD`, `SESSION_SECRET`, `CRON_SECRET`, `IP_HASH_SALT`, `TELEGRAM_BOT_TOKEN`, `RESEND_API_KEY` chỉ ở server/env.
- DB không expose ra client; mọi truy vấn qua server Next.js.
- So sánh cron secret timing-safe; cookie httpOnly; không log secret.
- Neon dùng role riêng nếu có thể; không dùng chung với app khác. Chuỗi kết nối đã xuất hiện trong chat → nên đổi mật khẩu sau khi hoàn tất.

## 6. Triển khai

- Env Vercel: `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_HUB_NAME`, `ADMIN_PASSWORD`, `SESSION_SECRET`, `CRON_SECRET`, `IP_HASH_SALT`, optional `TELEGRAM_BOT_TOKEN`, `RESEND_API_KEY`, `ALERT_FROM_EMAIL`.
- Migrations: `npm run db:migrate` chạy SQL trong `db/migrations/` và ghi `schema_migrations`.
- Seed: `npm run db:seed` tạo 2 app mẫu + settings singleton.
- cron-job.org: POST mỗi 5 phút tới `/api/cron/health`, header secret, bật email khi lỗi.
- Telegram bot + chat id; Resend key/domain (hoặc `onboarding@resend.dev` gửi về email chủ).
- Vercel deploy; thêm domain tùy chọn; đăng nhập admin lần đầu.

## 7. Tiêu chí thành công

- Khách mở hub, bấm 1 lần sang app; PWA cài được, offline có danh sách.
- Sau một tuần có click theo ngày và uptime/độ trễ cho từng app + Supabase.
- Tắt một app hoặc Supabase project → Telegram + email trong ~15–20 phút; hồi phục → báo.
- Pause 30 phút trước khi deploy → không có cảnh báo down/recovery.
- Thêm app từ admin → xuất hiện trên hub ngay sau refresh, không deploy.
- Không có server/database tự vận hành; 0 đồng/tháng ở quy mô hiện tại.

## 8. Những gì để builder tự quyết

- `postgres` (porsager) làm driver + migration runner; không ORM.
- `jose` cho JWT; `@vercel/functions` không cần vì ghi click đồng bộ (đổi từ v2).
- Tailwind + component tự viết; Recharts cho chart.
- Cách hiển thị 2 target (app/Supabase) trên dashboard.
- Cache dashboard 30–60s; public hub đọc DB mỗi request.
- Icon URL dán tay; không upload.
- Giữ check 30 ngày, click 90 ngày.

## 9. Đánh đổi đã biết

- Phụ thuộc Neon (đã có) và cron-job.org cho lịch check.
- Cảnh báo chậm hơn lý tưởng: check 5 phút, 3 lần lỗi → ~15 phút.
- Nếu cron-job.org ngừng chạy, không có cảnh báo chủ động; chỉ còn banner dữ liệu cũ. Có thể thêm scheduler thứ hai sau.
- Không có RLS vì DB không expose; bảo vệ bằng server-side và mạng.
- Neon free tier có giới hạn storage/compute; dữ liệu 30/90 ngày giữ nhỏ.

## 10. Câu hỏi cần chủ dự án chốt trước khi deploy

1. Tên hub và domain (hoặc `*.vercel.app`).
2. Email admin nhận cảnh báo; mật khẩu admin (đổi khỏi `change-me-now`).
3. Resend: có domain xác minh chưa? Nếu chưa dùng địa chỉ test gửi về email chủ.
4. Telegram bot/chat id (có thể hướng dẫn tạo).
5. Danh sách 5–10 app: tên, URL, `supabaseRef`, mô tả, icon.
