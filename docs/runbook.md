# Runbook — Ecosystem Hub

Tài liệu vận hành từ lúc cài đặt đến khi nhận cảnh báo. Không chứa secret thật.

## 1. Kiến trúc ngắn

- **Next.js 16** trên Vercel: hub công khai `/`, dashboard `/admin`, API `/api/go/[slug]` và `/api/cron/health`.
- **Neon Postgres**: apps, click_events, checks, app_status, incidents, settings.
- **cron-job.org** gọi health check mỗi 5 phút; Supabase chỉ là mục tiêu health check, không lưu dữ liệu hub.
- **Telegram Bot + Resend** gửi cảnh báo.
- **PWA**: manifest + service worker tự viết (`public/sw.js`), cache hub gần nhất và `/offline`.

## 2. Chuẩn bị

Cần có:

- Node.js 20+ và npm.
- Tài khoản Neon (đã có project).
- Tài khoản Vercel.
- Tài khoản cron-job.org (miễn phí).
- Telegram (tùy chọn) và Resend (tùy chọn).

## 3. Cài đặt local

```bash
git clone <repo>
cd <repo>
npm install
cp .env.example .env.local
```

Điền `.env.local`:

| Biến | Ý nghĩa |
|---|---|
| `DATABASE_URL` | Chuỗi kết nối Neon, dùng host `-pooler`, có `sslmode=require` |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` khi local, domain thật khi deploy |
| `NEXT_PUBLIC_HUB_NAME` | Tên hiển thị trên hub |
| `ADMIN_PASSWORD` | Mật khẩu admin, tối thiểu 12 ký tự; placeholder bị chặn ở production |
| `SESSION_SECRET` | Chuỗi ngẫu nhiên ≥32 ký tự |
| `CRON_SECRET` | Chuỗi ngẫu nhiên ≥32 ký tự, dùng cho cron |
| `IP_HASH_SALT` | Chuỗi ngẫu nhiên ≥16 ký tự |
| `TELEGRAM_BOT_TOKEN` | Tùy chọn |
| `RESEND_API_KEY` | Tùy chọn |
| `ALERT_FROM_EMAIL` | `onboarding@resend.dev` nếu chưa xác minh domain |

Sinh secret:

```bash
openssl rand -hex 32   # SESSION_SECRET, CRON_SECRET
openssl rand -hex 16   # IP_HASH_SALT
```

Chạy migration và seed:

```bash
npm run db:migrate
npm run db:check
npm run db:seed
npm run icons
npm run dev
```

Mở `http://localhost:3000`, đăng nhập `/admin/login`. Sai mật khẩu 10 lần trong 15 phút sẽ bị khóa tạm 15 phút.

## 4. Neon

- Dùng role riêng cho hub nếu có thể; không dùng chung role owner với app khác.
- Chuỗi kết nối đã từng xuất hiện trong chat: **đổi mật khẩu role** sau khi hoàn tất, rồi cập nhật `DATABASE_URL` ở `.env.local` và Vercel.
- Dashboard Neon → Roles → reset password; hoặc tạo role mới:
  ```sql
  create role hub_app login password '<strong-password>';
  grant connect on database neondb to hub_app;
  grant usage on schema public to hub_app;
  grant select, insert, update, delete on all tables in schema public to hub_app;
  grant usage, select on all sequences in schema public to hub_app;
  alter default privileges in schema public grant select, insert, update, delete on tables to hub_app;
  alter default privileges in schema public grant usage, select on sequences to hub_app;
  ```
- Sau khi đổi role, chạy lại `npm run db:check`.
- Neon Free có thể tự suspend khi không có hoạt động; cron 5 phút giữ project thức.

## 5. Telegram

1. Nhắn `@BotFather` → `/newbot` → lấy token.
2. Nhắn bot vừa tạo một tin bất kỳ.
3. Lấy chat id:
   ```bash
   curl "https://api.telegram.org/bot<TOKEN>/getUpdates"
   ```
   Lấy `message.chat.id`.
4. Điền `TELEGRAM_BOT_TOKEN` vào env (local/Vercel) và chat id vào `/admin/settings`.
5. Bấm **Gửi thử** để kiểm tra.

## 6. Resend

1. Tạo API key tại resend.com.
2. Nếu có domain: xác minh domain và đặt `ALERT_FROM_EMAIL` là địa chỉ thuộc domain đó.
3. Nếu chưa có domain: giữ `onboarding@resend.dev`; Resend chỉ gửi được về email chủ tài khoản.
4. Điền `RESEND_API_KEY`, thêm email nhận trong `/admin/settings`, bấm **Gửi thử**.

## 7. Deploy Vercel

1. Import repo vào Vercel (framework Next.js, root là repo).
2. Thêm toàn bộ env ở mục 3 với giá trị thật.
3. `NEXT_PUBLIC_SITE_URL` = domain production (không có dấu `/` cuối).
4. Deploy.
5. Chạy migration vào Neon nếu chưa:
   ```bash
   DATABASE_URL='<production-url>' npm run db:migrate
   ```
6. Mở `/admin/login`, đăng nhập bằng `ADMIN_PASSWORD`.

## 8. cron-job.org

Tạo job:

- URL: `https://<domain>/api/cron/health`
- Method: `POST`
- Schedule: every 5 minutes
- Header: `x-cron-secret: <CRON_SECRET>`
- Bật **failure notification** qua email.

Kiểm tra:

- Chạy job một lần → response `{"checked":N,"skipped":false}`.
- Neon: `select count(*) from checks;` tăng.
- Nếu response 401: sai header/secret.
- Nếu 202: một run khác đang giữ lock, bình thường.
- Nếu 500: xem log Vercel (DB hoặc persistence lỗi). Lỗi kết nối DB tạm thời được retry tự động 3 lần trước khi run bị đánh fail. Log Vercel trên Hobby chỉ giữ ~1 giờ, nên xem thêm bảng `health_runs`:
  ```sql
  select started_at, ok, checked, failures, error
  from health_runs
  order by started_at desc
  limit 5;
  ```

## 9. Thêm và quản lý app

`/admin/apps` → **Thêm ứng dụng**:

- **Slug**: chữ thường, số, gạch ngang; dùng trong URL `/api/go/<slug>`.
- **URL ứng dụng**: URL công khai, cũng là mục tiêu health check `app`.
- **Supabase ref**: phần `<ref>` trong `https://<ref>.supabase.co`; hub kiểm tra `https://<ref>.supabase.co/auth/v1/health`.
- **URL health Supabase**: chỉ điền nếu muốn override endpoint mặc định.
- **HTTP mong đợi**: mặc định 200; một số app trả 204/301 thì đổi. Trường này chỉ áp dụng cho target **Ứng dụng**; target **Supabase** luôn mong đợi 200.
- Bật/tắt giám sát từng mục tiêu.

Sắp xếp bằng nút kéo `⠿`; thay đổi có hiệu lực ngay.

## 10. Trước khi deploy một app

1. `/admin/apps` → **Tạm dừng 30 phút** (hoặc 60) cho app sắp deploy.
2. Deploy app.
3. Kiểm tra app lên lại; bấm **Tiếp tục giám sát** (hoặc chờ hết hạn).
4. Trong thời gian tạm dừng, không có check và không có cảnh báo.

## 11. Cảnh báo

- Down sau **3 lần lỗi liên tiếp** (~15 phút với cron 5 phút).
- Chậm khi latency > 2000ms ba lần liên tiếp; báo tối đa mỗi giờ.
- Hồi phục: báo nếu bật **Báo khi hồi phục**.
- Nhắc lại khi vẫn down: đặt số phút > 0; 0 = tắt.
- Mỗi target (`Ứng dụng`/`Supabase`) tính trạng thái riêng.

## 12. Kiểm tra sức khỏe hệ thống

- `/admin` có banner **Dữ liệu giám sát đang cũ** nếu lần check cuối > 10 phút.
- Đã xác minh local: sau 16 phút không chạy cron, banner hiện đúng; chạy lại endpoint sẽ xóa banner.
- Nếu cron-job.org ngừng chạy, không có cảnh báo chủ động (chỉ email lỗi của cron-job.org và banner). Đây là giới hạn đã biết; muốn độc lập hoàn toàn cần scheduler thứ hai.

## 13. Dữ liệu và lưu trữ

- `checks`: giữ 30 ngày.
- `click_events`: giữ 90 ngày.
- Cleanup chạy tối đa một lần/24h sau một health run thành công; lỗi cleanup không làm fail run. Lần đăng nhập sai cũ hơn 1 ngày cũng bị dọn.
- Backup: dùng tính năng backup/branch của Neon nếu cần.

## 14. Checklist nghiệm thu

1. Hub mở trên điện thoại; bấm card sang đúng app.
2. Click xuất hiện trong `/admin` sau refresh.
3. Cài PWA; offline mở lại thấy hub đã cache hoặc `/offline`.
4. Thêm app tạm trỏ `https://httpstat.us/503` → sau ~15–20 phút nhận Telegram + email; sửa URL → nhận hồi phục; xóa app tạm.
5. Thêm app có Supabase ref đúng → badge Supabase ổn; đổi ref sai → Supabase lỗi, app vẫn ổn.
6. Tạm dừng 30 phút rồi deploy → không có cảnh báo; kiểm tra tiếp tục sau đó.
7. Dừng cron 15 phút → banner; bật lại → banner mất.
8. Thêm app từ admin → xuất hiện trên hub ngay.

## 15. Sự cố thường gặp

| Hiện tượng | Kiểm tra |
|---|---|
| `/admin` chuyển về login liên tục | `SESSION_SECRET` thay đổi? Cookie cũ bị từ chối; đăng nhập lại |
| 401 ở cron | `CRON_SECRET` Vercel và header cron-job.org khác nhau |
| 202 liên tục | Lock chưa release; chờ 30s hoặc kiểm tra log |
| Không có cảnh báo | `/admin/settings` đã có chat id/email; `Gửi thử`; token env |
| Supabase luôn lỗi | Ref sai, project paused, hoặc endpoint health đổi; thử URL trong trình duyệt |
| Trang hub trống | `apps` chưa seed/chưa thêm; kiểm tra `is_visible` |
| PWA không cập nhật | Tăng `CACHE` version trong `public/sw.js`, deploy, đóng/mở app |

## 16. Chi phí

- Vercel Hobby: 0đ (cá nhân, phi thương mại).
- Neon Free: 0đ trong giới hạn.
- cron-job.org: 0đ.
- Telegram/Resend: 0đ trong giới hạn.
