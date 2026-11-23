# Admin dashboard — Thiết kế lại giao diện và PWA quản trị

- **Ngày:** 2026-11-20
- **Trạng thái:** chờ duyệt
- **Phạm vi:** `/admin` (tổng quan, shell, PWA quản trị). Hub công khai giữ nguyên.

## 1. Ý tưởng và lý do

Admin hiện tại rất tối giản nhưng thông tin trạng thái bị chìm: chữ xám nhạt, badge nhỏ, danh sách app dài, KPI và chart chiếm chỗ trên cùng. Trên laptop lẫn điện thoại, chủ dự án không thể nhận ra app nào đang lỗi trong 5 giây đầu.

Đồng thời PWA hiện có `start_url: '/'`, nên cài xong mở hub công khai — không đúng nhu cầu “ra ngoài mở điện thoại để xem admin”. Thiết kế này làm hai việc:

1. **Tổ chức lại `/admin` quanh trạng thái**: laptop dùng bảng vận hành dày thông tin; điện thoại dùng cockpit trạng thái.
2. **Tách một PWA quản trị riêng**: cài từ điện thoại, mở thẳng `/admin`, xem được snapshot trạng thái gần nhất khi offline.

## 2. Mục tiêu, không làm, anti-goals

### Mục tiêu

- Trong 5 giây trên laptop: thấy tổng trạng thái, app/target đang lỗi, và mức độ nghiêm trọng — không cần cuộn.
- Trong 5 giây trên điện thoại: mở PWA thấy ngay banner đỏ/xanh, “Cần chú ý”, rồi danh sách app.
- Phân biệt rõ trạng thái **App** và **Supabase** của từng app; không gộp mất target đang lỗi.
- Giữ nguyên khả năng quản trị: thêm/sửa/ẩn/sắp xếp app, tạm dừng giám sát, cài đặt cảnh báo.
- PWA quản trị: cài được, mở `/admin`, có shortcut, badge số sự cố, offline snapshot có mốc thời gian.
- Không làm chậm trang: bỏ Recharts khỏi overview; analytics chuyển sang trang riêng.
- Đạt WCAG AA cho chữ và không dùng màu làm tín hiệu duy nhất.

### Không làm (non-goals)

- Push notification (để giai đoạn sau, đã chốt).
- Thiết kế lại hub công khai `/`.
- Thay đổi health-check engine, schema DB, cron, Telegram/email.
- Multi-admin, phân quyền, real-time websocket.
- Native app (App Store/Google Play).
- Dark mode toàn app; chỉ sidebar admin dùng nền tối.

### Anti-goals

- Giấu lỗi sau chart hoặc chữ xám nhạt.
- Làm mọi thứ thành màu đỏ để “dễ thấy” — mất phân cấp.
- Cache HTML admin có chứa dữ liệu/phiên vào service worker dùng chung.
- Hiển thị snapshot cũ mà không ghi rõ “dữ liệu lúc…”.
- Fetch dữ liệu hai lần cho desktop và mobile.

## 3. Ràng buộc

- Next.js 16 App Router, React 19, Tailwind 4, server components; `cacheComponents: true`.
- Không thêm UI library; component tự viết bằng Tailwind.
- Dữ liệu lấy từ các hàm hiện có (`listAllApps`, `getStatuses`, `listChecksSince`, `listClicksSince`); chỉ thêm query đọc incidents gần đây.
- Auth: cookie phiên hiện tại; `src/proxy.ts` bảo vệ `/admin/*`.
- Manifest và service worker của admin nằm dưới `/admin`, phải được proxy cho qua (không redirect login).
- Một admin, giao diện tiếng Việt, thống kê theo `Asia/Ho_Chi_Minh`.
- PWA admin chỉ dùng static shell + IndexedDB; không cache response API/server action.
- Snapshot offline là dữ liệu nhạy cảm trên thiết bị: phải xoá khi đăng xuất hoặc khi mở lại trang login.
- Vercel Hobby; không thêm dịch vụ trả phí.

## 4. Các hướng đã cân nhắc

### 4.1 Bố cục

1. **A — Cockpit trạng thái**: banner lớn + “Cần chú ý” + card app. Quét rất nhanh nhưng trên laptop loãng, thiếu chi tiết.
2. **B — Lưới đèn giao thông**: mỗi app một ô màu. Nhanh nhưng che mất target nào lỗi, khó hiển thị lịch sử/sự cố.
3. **C — Bảng vận hành**: sidebar + bảng dày + cột sự cố. Tốt trên laptop, yếu trên điện thoại.
4. **Kết hợp C (laptop) + A (điện thoại)** — **đã chọn**. Laptop giữ độ dày thông tin; điện thoại tối ưu quét nhanh. Đổi lại phải làm hai composition và kiểm thử cả hai.

### 4.2 Đóng gói PWA

1. **PWA quản trị riêng** (`start_url: '/admin'`, `scope: '/admin'`) — **đã chọn**. Cài xong mở thẳng admin, cache tách khỏi hub công khai.
2. **Một PWA duy nhất** (`start_url: '/'`) — ít file hơn nhưng mở hub trước, cache lẫn dữ liệu public/admin.
3. **Chỉ responsive, giữ PWA hiện tại** — nhanh nhất nhưng không đúng nhu cầu.

### 4.3 Cách responsive

1. **CSS breakpoint `lg` + hai composition, dùng chung component** — **đã chọn**. Server-render, không nháy, mỗi bố cục được tối ưu riêng. DOM lặp nhưng chỉ 5–10 app.
2. **Một composition tự reflow** — ít DOM hơn nhưng bảng desktop và card mobile khác nhau quá nhiều, dễ thành cả hai đều dở.
3. **JS media query** — tránh dùng vì nháy khi hydrate và thêm JS không cần thiết.

### 4.4 Offline

1. **Static offline shell + IndexedDB snapshot** — **đã chọn**. Không cache HTML có dữ liệu/phiên; snapshot nhỏ, có mốc thời gian, xoá được.
2. **Cache HTML `/admin` trong service worker** — đơn giản nhưng dễ lộ dữ liệu cũ và action không còn hợp lệ.
3. **Chỉ trang `/offline` chung** — an toàn nhưng không xem được trạng thái gần nhất.

## 5. Thiết kế

### 5.1 Shell và điều hướng

**Desktop (`≥1024px`)**

- Sidebar tối, rộng 232px, cố định: logo “Ecosystem”, 4 mục `Tổng quan`, `Ứng dụng`, `Phân tích`, `Cài đặt`; cuối sidebar có nút `Đăng xuất`.
- Main area nền sáng, max-width 1280px, padding 32px. Top bar: tiêu đề trang; riêng Tổng quan và Ứng dụng có thêm pill “Cập nhật X phút trước” (xanh nếu <10 phút, amber nếu cũ). Phân tích/Cài đặt chỉ hiện tiêu đề.
- Không còn header ngang 4 link như hiện tại.
- Protected layout **không** query status; mỗi page tự render header/pill từ dữ liệu của page đó. Badge đọc snapshot IndexedDB, không cần query thêm.

**Mobile (`<1024px`)**

- Top app bar: tiêu đề trang + pill cập nhật (chỉ Tổng quan/Ứng dụng); không sidebar.
- Bottom nav cố định 4 mục, `padding-bottom: env(safe-area-inset-bottom)`, tap target ≥44px, `aria-current="page"`.
- Nội dung padding 16px; không cuộn ngang.
- Login page giữ card giữa màn hình, không bottom nav.
- Đăng xuất trên mobile nằm trong card “Phiên đăng nhập” ở `/admin/settings` (thêm vào trang settings), không đặt ở top bar để tránh chạm nhầm.

**Active nav**: client component nhỏ dùng `usePathname()` để tô mục đang active. Không dùng JS để chọn layout.

### 5.2 Tổng quan desktop (C+)

Thứ tự từ trên xuống:

1. **Top bar**: “Tổng quan” + pill “Cập nhật 2 phút trước”.
2. **Status strip**: 3–4 ô lớn đếm **app theo trạng thái xấu nhất** (`ỔN`, `LỖI`, `CHƯA RÕ`, `TẠM DỪNG` nếu có), có nhãn nhỏ “Theo ứng dụng”. Kèm dòng nhỏ “6 ứng dụng · 13 mục tiêu · 12/13 mục tiêu ổn”. Không đếm target lẫn app.
3. **Alert line**: nếu có target lỗi, hiện dòng đỏ đầu tiên (app + target + số lần lỗi + thời gian) và nút “Xem chi tiết”. Nếu dữ liệu cũ >10 phút, hiện banner amber “Dữ liệu giám sát đang cũ” thay/bổ sung.
4. **Bảng vận hành**:
   - Cột: `Ứng dụng`, `App`, `Supabase`, `Độ trễ`.
   - Dòng sắp xếp: lỗi → chưa rõ → ổn → tạm dừng; trong cùng nhóm theo tên.
   - Dòng lỗi có nền đỏ nhạt + viền trái đỏ; pill trạng thái lớn (chữ 12–13px, đậm, dot 6px + nhãn).
   - Mỗi dòng có menu `⋯` cho `Tạm dừng 30 phút`, `Tạm dừng 60 phút`, `Sửa` (giữ chức năng hiện có nhưng không làm rối bảng).
   - Click tên app mở `/admin/apps/[id]`.
5. **Cột sự cố** (chỉ `≥1280px`): danh sách incident đang mở + đã hồi phục gần đây, mỗi mục có app/target, thời điểm bắt đầu, thời lượng. Dưới 1280px, danh sách này chuyển xuống dưới bảng.
6. Không có KPI/chart trên overview.

### 5.3 Tổng quan mobile (A)

1. **Top app bar**: “Tổng quan” + pill cập nhật.
2. **Hero trạng thái**:
   - Không có ứng dụng: hero xám “Chưa có ứng dụng nào” + CTA “Thêm ứng dụng” khi online.
   - Tất cả app tạm dừng: hero xám “Đang tạm dừng giám sát”.
   - Không có target giám sát: hero xám “Chưa bật giám sát”.
   - Có lỗi: nền đỏ nhạt, viền trái đỏ, chữ lớn “N ứng dụng đang lỗi”, phụ đề “X/Y ứng dụng ổn · Z mục tiêu lỗi · kiểm tra 2 phút trước”, icon tròn đỏ.
   - Không lỗi nhưng có chưa rõ: amber “Cần kiểm tra”.
   - Tất cả ổn: xanh “Tất cả hệ thống ổn định”.
   - Dữ liệu cũ: banner `role="status"` riêng phía trên hero.
3. **“Cần chú ý”**: card cho từng target down/unknown (không phải từng app). Nội dung: app, target, số lần lỗi liên tiếp, thời gian, lỗi gần nhất; tap mở app detail. Nếu không có, ẩn section.
4. **“Tất cả ứng dụng”**: card từng app, sắp xếp như desktop. Mỗi card: icon, tên, pill trạng thái xấu nhất; 2 dòng target `App`/`Supabase` với pill + latency; thời gian check gần nhất. Tap mở app detail.
5. **Bottom nav**: Tổng quan, Ứng dụng, Phân tích, Cài đặt.

Không hiển thị nút pause trong danh sách mobile để tránh chạm nhầm; pause nằm trong app detail. Thêm menu `Tạm dừng 30/60 phút` + `Tiếp tục giám sát` vào header app detail (dùng lại các action hiện có).

### 5.4 Trang Phân tích (mới)

- Route `/admin/analytics`, dùng shell mới.
- Chuyển từ overview sang: 4 KPI (hôm nay, 7 ngày, 30 ngày, khách riêng 30 ngày), chart lượt bấm 30 ngày, bảng lượt bấm theo app.
- Reuse `listClicksSince`, `summarizeClicks`, `dailyClickSeries`, `clickCountsByApp`, `averageLatency`, `ClickChart`.
- Overview không import Recharts nữa → giảm JS trên mobile.
- App detail vẫn giữ chart riêng của app.

### 5.5 PWA quản trị

**Manifest**

- File tĩnh `public/admin/manifest.webmanifest` (đơn giản, không phụ thuộc quy ước metadata route); metadata của admin trỏ tới `/admin/manifest.webmanifest`.
- `name: "Ecosystem Admin"`, `short_name: "Admin"`, `description: "Theo dõi trạng thái hệ sinh thái"`, `lang: "vi"`.
- `id: "/admin"`, `start_url: "/admin"`, `scope: "/admin"`.
- `display: "standalone"`, `orientation: "any"`, `theme_color: "#0f172a"`, `background_color: "#f8fafc"`.
- Icons admin riêng: 192, 512, maskable 512 (nền xanh đậm, biểu tượng nhịp/pulse hoặc shield). Sinh bằng `scripts/generate-icons.mjs`.
- `shortcuts`: Tổng quan `/admin`, Ứng dụng `/admin/apps`, Phân tích `/admin/analytics`, Cài đặt `/admin/settings`.

**Metadata**

- Thêm `src/app/admin/layout.tsx` (không chứa auth) để set `manifest`, `appleWebApp.title: "Ecosystem Admin"`, icon apple, `viewport.themeColor: "#0f172a"`.
- `(protected)/layout.tsx` vẫn giữ `requireAdmin()` và shell.
- Login page thừa hưởng metadata admin.

**Service worker**

- File tĩnh `public/admin/sw.js` → URL `/admin/sw.js`.
- Đăng ký với `scope: '/admin'` (không có dấu `/` cuối) để SW kiểm soát cả URL `/admin` mà `start_url` mở tới. Vì scope vượt quá thư mục mặc định `/admin/`, thêm header `Service-Worker-Allowed: /admin` cho `/admin/sw.js`.
- Proxy cho qua chính xác: `/admin/sw.js`, `/admin/manifest.webmanifest`, `/admin/offline`, `/admin/offline.html`.
- Thêm header trong `next.config.ts` cho `/admin/sw.js`: `Content-Type: application/javascript; charset=utf-8`, `Cache-Control: no-cache, no-store, must-revalidate`, `Service-Worker-Allowed: /admin` (theo hướng dẫn PWA của Next.js).
- Cache name `ecosystem-admin-v1`; mỗi SW chỉ xoá cache cùng prefix (`ecosystem-hub-*` / `ecosystem-admin-*`). Sửa `public/sw.js` hiện tại để không xoá cache admin — đây là bug fix bắt buộc.
- Precache: `/admin/offline`, icon admin, manifest.
- Navigation `/admin` và `/admin/*`: network-first; khi offline trả cached `/admin/offline`.
- Static assets `/_next/static/*`, font, icon: cache-first/stale-while-revalidate.
- Bỏ qua request có `_rsc` query hoặc header `RSC`; không cache `/api/*`, server action, HTML `/admin` có dữ liệu.
- `install`: precache + `skipWaiting()`; `activate`: xoá cache cũ cùng prefix + `clients.claim()`.
- Đăng ký bằng `AdminServiceWorkerRegister` trong admin layout. `ServiceWorkerRegister` ở root bỏ qua pathname `/admin`.
- Nếu đã có SW public cũ (scope `/`), SW admin scope `/admin` sẽ kiểm soát toàn bộ admin; không cần migrate cache cũ.

**Offline snapshot**

- Component `AdminSnapshotWriter` đặt trong overview, nhận **cùng `AdminOverviewModel`** mà `OverviewDesktop`/`OverviewMobile` dùng, để offline view không bị thiếu dữ liệu:
  ```ts
  type TargetView = {
    state: 'up' | 'down' | 'unknown' | 'off';
    latencyMs: number | null;
    lastCheckAt: string | null;
    consecutiveFailures: number;
    lastError: string | null; // cắt tối đa 120 ký tự
  };
  type AppView = {
    id; name; slug; iconUrl; isVisible; paused;
    worstState: 'up' | 'down' | 'unknown' | 'off' | 'paused';
    app: TargetView | null;
    supabase: TargetView | null;
  };
  type AdminOverviewModel = {
    counts: {
      apps: { up; down; unknown; off; paused };
      targets: { up; down; unknown; off };
      monitoredTargets: number;
    };
    attention: Array<{
      appId; appName; target: 'app' | 'supabase';
      state: 'down' | 'unknown';
      consecutiveFailures; lastCheckAt; lastError;
    }>;
    apps: AppView[];
    lastCheckAt: string | null;
    staleMinutes: number | null;
    isStale: boolean;
    allPaused: boolean;
  };
  type Snapshot = { version: 1; savedAt: string; model: AdminOverviewModel };
  ```
- Ghi vào IndexedDB `ecosystem-admin`, store `snapshots`, key `overview`. Chỉ ghi khi thành công và dữ liệu thay đổi; payload <20KB sau khi cắt error; không chứa click/analytics. Feature-detect IndexedDB; lỗi ghi chỉ log, không chặn trang.
- Offline shell là file tĩnh `public/admin/offline.html` (inline CSS/JS), rewrite `/admin/offline` → file để không phụ thuộc Next chunks; nội dung mirror `OverviewMobile` và đọc snapshot trực tiếp:
  - Banner “Đang offline · Dữ liệu lúc 13:50 20/11 · Kiểm tra cuối 2 phút trước”.
  - Hero trạng thái, “Cần chú ý”, danh sách app; không có nút pause/sửa/xoá.
  - Không có snapshot: “Chưa có dữ liệu offline. Kết nối mạng để tải lần đầu.”
  - Nút “Khoá” xoá snapshot khỏi thiết bị.
  - Dùng DOM/`textContent` để render dữ liệu snapshot; không `innerHTML` với chuỗi từ DB.
- Xoá snapshot:
  - `LogoutButton` client: `clearAdminSnapshot()` rồi gọi `logoutAction()`.
  - `ClearSnapshotOnLogin` trên login page: xoá snapshot mỗi lần trang login hiện ra (phiên hết hạn hoặc đăng xuất).
- Không mã hoá IndexedDB; bảo vệ bằng việc xoá khi logout và cảnh báo trên thiết bị dùng chung.

**Cài đặt & badge**

- `AdminInstallPrompt` chỉ hiện trên mobile, sau khi đăng nhập, không hiện khi `display-mode: standalone`.
  - Chrome/Android: bắt `beforeinstallprompt`, nút “Cài ứng dụng”.
  - iOS/Safari: hướng dẫn “Chia sẻ → Thêm vào màn hình chính”.
  - Dismiss lưu localStorage 30 ngày; không che bottom nav.
- `AdminBadge` gọi `navigator.setAppBadge(downTargetCount)` nếu hỗ trợ; `clearAppBadge()` khi 0. Feature-detect, không lỗi trên Safari cũ.
  - Overview và Ứng dụng truyền `downTargetCount` từ dữ liệu server.
  - Các trang khác (Phân tích, Cài đặt) đọc snapshot IndexedDB gần nhất; `AdminSnapshotWriter` phát event `admin-snapshot-updated` để badge cập nhật.
  - Không query thêm DB ở layout.
- `ConnectivityBanner` hiện “Bạn đang offline” khi mất mạng trên trang đang mở.

### 5.6 Hệ thống hình ảnh

**Màu**

Các token dưới đây scope trong `.admin-theme` để hub công khai giữ nguyên palette cũ.

| Token | Giá trị | Dùng cho |
|---|---|---|
| `--paper` | `#f6f8f5` | nền chính |
| `--card` | `#ffffff` | card, bảng |
| `--ink` | `#0f172a` | chữ chính |
| `--muted` | `#475569` | chữ phụ (không dùng opacity <70%) |
| `--line` | `#dbe3dc` | viền |
| `--brand` | `#2f6b4f` | action, logo |
| `--ok-bg` / `--ok-fg` | `#dcfce7` / `#15803d` | trạng thái ổn |
| `--bad-bg` / `--bad-fg` | `#fee2e2` / `#b91c1c` | lỗi |
| `--warn-bg` / `--warn-fg` | `#fef3c7` / `#b45309` | chưa rõ, tạm dừng, dữ liệu cũ |
| `--unknown-bg` / `--unknown-fg` | `#e2e8f0` / `#475569` | chưa rõ |

**Chữ**

- Giữ Bricolage Grotesque cho display, DM Sans cho body.
- Body 15–16px; label 12–13px; status pill 12–13px đậm; số đếm lớn 28–32px.
- Không dùng `text-ink/40` cho nội dung quan trọng; thay bằng `--muted`.
- Status luôn có dot + chữ; màu chỉ là tín hiệu phụ.

**Chuyển động**

- Hover/focus nhẹ; tôn trọng `prefers-reduced-motion`.
- Không animate số đếm/trạng thái để tránh gây nhiễu.

### 5.7 Thành phần và route

**Component mới**

- `AdminSidebar`, `AdminMobileNav`, `AdminTopBar`, `AdminNavLink`.
- `StatusPill` (size `sm|md|lg`, state, label, aria-label).
- `StatusSummaryStrip`, `AttentionList`, `AttentionCard`.
- `AppStatusRow` (desktop), `AppStatusCard` (mobile).
- `IncidentRail`, `IncidentList`.
- `OverviewDesktop`, `OverviewMobile` (nhận cùng props).
- `AdminInstallPrompt`, `AdminBadge`, `ConnectivityBanner`.
- `AdminSnapshotWriter`, `AdminServiceWorkerRegister`; offline view là `public/admin/offline.html` (static).
- `LogoutButton`, `ClearSnapshotOnLogin`.
- `AdminSectionHeader` (tiêu đề + mô tả + action).

**Route**

- `/admin` — overview responsive.
- `/admin/analytics` — mới.
- `/admin/offline` — rewrite sang `public/admin/offline.html`, proxy cho qua.
- `/admin/apps`, `/admin/apps/new`, `/admin/apps/[id]`, `/admin/apps/[id]/edit`, `/admin/settings` — giữ nguyên chức năng, dùng shell/màu mới.
- `/admin/login` — giữ card, metadata admin.

**Dữ liệu**

- Thêm `listRecentIncidents(limit)` trong `src/lib/db/checks.ts`: join `apps` để có tên/slug, sắp xếp `started_at desc`, trả cả incident mở và đã đóng gần đây.
- Hàm thuần `buildAdminOverview(apps, statuses, latestChecks, now)` trả:
  - `apps` đã chuẩn hoá: `appState`, `supabaseState`, `worstState`, latency, last check, paused, `isVisible`.
  - State UI: `up | down | unknown | off | paused`. `off` khi target không được giám sát (`monitor_app`/`monitor_supabase` tắt hoặc không có URL); `paused` khi app đang `monitoring_paused_until`. Không dùng `unknown` cho target bị tắt.
  - `counts` theo app (worst state) và target (up/down/unknown/off, chỉ app không tạm dừng).
  - `attention` (down/unknown target, không gồm off/paused).
  - `staleMinutes`, `isStale`.
  - `sortedApps`.
- **App ẩn (`is_visible: false`)**: vẫn hiện trong overview và vẫn tính vào counts/attention vì giám sát độc lập với hiển thị trên hub; kèm badge `Đang ẩn`.
- **Mục tiêu**: chỉ tính target đang được giám sát và có URL hợp lệ. Target `off` không tính vào “X mục tiêu”/counts/attention.
- **Tạm dừng**:
  - Trong bảng/card, app tạm dừng hiện pill `Tạm dừng` (gray) thay cho trạng thái 2 target; không hiện đỏ, không tính vào hero/badge/counts down.
  - `lastCheckAt` dùng cho banner cũ lấy max trên các app **không tạm dừng**; nếu tất cả tạm dừng, hiện “Đang tạm dừng giám sát”, không báo cũ.
  - Incident đang mở của app tạm dừng vẫn nằm trong rail với nhãn `Tạm dừng theo dõi`, không tính vào số lỗi/badge.
  - App detail vẫn hiện trạng thái cuối + badge `Tạm dừng giám sát` để chẩn đoán.
- Không đổi schema DB.

### 5.8 Accessibility

- Status pill có `aria-label` đầy đủ: “Money App, Supabase, lỗi, 3 lần liên tiếp”.
- Bảng desktop dùng `<table>`, `<th scope="col">`; mobile dùng heading + list.
- Bottom nav `aria-label="Điều hướng quản trị"`, `aria-current="page"`.
- Banner offline/stale dùng `role="status"`, không dùng `aria-live` cho từng thay đổi trạng thái.
- Focus ring 2px, offset 2px; tap target ≥44px.
- Contrast AA; kiểm tra bằng Lighthouse/axe.
- Không chỉ dựa vào màu; có icon/dot + text.

### 5.9 Hiệu năng

- Overview không import Recharts; chart chỉ ở `/admin/analytics` và app detail.
- Một lần fetch dữ liệu cho cả desktop/mobile.
- Dual render DOM nhỏ (≤10 app); chấp nhận.
- IndexedDB write chỉ ở overview, throttle 30s hoặc khi snapshot đổi.
- SW cache versioned; không cache API; giới hạn precache.
- Ảnh icon app dùng `<img>` hiện có; không thêm thư viện ảnh.

### 5.10 Trạng thái rỗng / không có dữ liệu

- Chưa có app: status strip 0, hero xám “Chưa có ứng dụng nào”, CTA “Thêm ứng dụng”.
- Có app nhưng chưa có check: hero amber “Chưa có dữ liệu giám sát”, phụ đề “Kiểm tra cron-job.org và endpoint `/api/cron/health`”; bảng hiển thị pill `Chưa rõ` cho target đang bật.
- Tất cả app đang tạm dừng: hero xám “Đang tạm dừng giám sát”, không hiện cảnh báo đỏ.
- Tất cả target đều tắt: hero xám “Chưa bật giám sát”, không hiện cảnh báo đỏ.
- Không có incident: cột sự cố hiện “Không có sự cố”.
- Target bị tắt: pill xám `Tắt`, không tính vào counts/attention.

## 6. Kiểm thử và tiêu chí thành công

**Unit**

- `buildAdminOverview`: counts theo app/target, worst state, paused, sort lỗi → chưa rõ → ổn → tạm dừng, stale >10 phút.
- `StatusPill` render đúng nhãn/aria cho `up/down/unknown/off/paused`.
- `AttentionList` chỉ chứa down/unknown, không chứa off/paused.
- Snapshot serialize/deserialize; clear snapshot.
- Manifest tĩnh `public/admin/manifest.webmanifest` có đúng `start_url`, `scope`, icons, shortcuts.
- `proxy`: `/admin` chưa login → redirect; `/admin/sw.js`, `/admin/manifest.webmanifest`, `/admin/offline` → cho qua; `/admin/apps` vẫn bảo vệ.

**Component**

- `OverviewDesktop` và `OverviewMobile` render từ cùng fixture; snapshot text khớp.
- `AppStatusCard` hiển thị 2 target và trạng thái xấu nhất.
- `IncidentRail` rỗng → “Không có sự cố”.

**Manual**

- Laptop 1440×900: thấy status strip + dòng lỗi + bảng trong 5 giây, không cuộn.
- Mobile 390×844: hero + “Cần chú ý” + ít nhất 3 app card trong màn đầu; không cuộn ngang.
- Cài PWA trên Android Chrome và iOS Safari; mở icon → `/admin`.
- Offline: mở overview online một lần → tắt mạng → mở lại PWA → thấy snapshot + mốc thời gian; không có action; logout → mở lại không còn dữ liệu.
- Badge hiện số target lỗi; hết lỗi → badge biến mất.
- Cron dừng >10 phút → banner dữ liệu cũ; chạy lại → banner mất.
- Keyboard: tab qua nav, bảng, menu; focus rõ.
- Contrast: axe/Lighthouse không lỗi AA; status đọc được khi mù màu (có nhãn).

**Tiêu chí thành công**

- 5 giây nhận ra app/target lỗi trên cả laptop và điện thoại.
- PWA cài được, mở thẳng admin, offline có snapshot.
- Không regression health check/analytics; test cũ pass.
- Lighthouse PWA installable; không tăng JS đáng kể trên overview.
- Không có dữ liệu admin bị cache trong SW cache dùng chung.

## 7. Triển khai

- Không cần migration DB.
- Cập nhật `scripts/generate-icons.mjs` để sinh icon admin; chạy `npm run icons`.
- Thêm manifest/layout/SW/static offline shell + `/admin/analytics`; cập nhật proxy allowlist; cập nhật `ServiceWorkerRegister`.
- Thêm header `Service-Worker-Allowed: /admin` + cache headers cho `/admin/sw.js` trong `next.config.ts`.
- Sửa `public/sw.js` để chỉ xoá cache prefix `ecosystem-hub-*` (bug fix, tránh xoá `ecosystem-admin-v1`).
- Thêm card “Phiên đăng nhập” + nút Đăng xuất vào `/admin/settings`.
- Cập nhật Tailwind tokens trong `globals.css`; thay dần các class `text-ink/40…` ở admin.
- Cập nhật tests; chạy `npm test`, `npm run lint`, `npm run build`.
- Deploy Vercel; test cài PWA trên HTTPS.
- Không ảnh hưởng hub công khai; PWA hub cũ vẫn hoạt động.

## 8. Những gì để builder tự quyết

- Giá trị màu/typography chính xác trong bảng token, miễn đạt AA.
- Thiết kế icon admin (pulse/shield) và tỷ lệ maskable.
- Khoảng thời gian incident rail (24h hay 7 ngày) và số lượng item.
- Vị trí menu pause trên desktop (menu `⋯` hay nút riêng).
- Chi tiết cache headers/version cho SW.
- Có thêm nút “Làm mới” (`router.refresh()`) trên mobile hay không.

## 9. Đánh đổi đã biết

- Hai composition desktop/mobile làm tăng code và test so với một layout; đổi lại mỗi bên đúng nhu cầu.
- PWA admin riêng tạo thêm manifest/SW; đổi lại cài xong mở đúng `/admin`, cache tách biệt.
- Snapshot offline lưu trên thiết bị; nếu dùng máy chung, cần logout để xoá. Không mã hoá.
- Badge API không hỗ trợ trên mọi trình duyệt; sẽ fallback im lặng.
- Không có real-time: “Cập nhật X phút trước” thay vì “Trực tiếp”; dữ liệu trễ tối đa theo cron 5 phút.
- Chuyển analytics sang trang riêng: thêm một route, nhưng overview nhẹ và rõ hơn.

## 10. Quyết định đã chốt trong review

Các điểm sau được chốt sau khi rà soát code hiện tại; nếu chủ dự án muốn khác, đổi trước khi lập kế hoạch:

1. **SW scope**: đăng ký `scope: '/admin'` + header `Service-Worker-Allowed: /admin` để SW kiểm soát cả URL `/admin`, không chỉ `/admin/`.
2. **Trạng thái `off`/`paused` là first-class**: target bị tắt không hiện “Chưa rõ” và không vào counts/attention; app tạm dừng hiện `Tạm dừng`, không tính down/badge/stale.
3. **App ẩn vẫn hiện trong overview** vì giám sát độc lập với hiển thị trên hub; “mục tiêu” chỉ đếm target đang giám sát có URL.
4. **Snapshot offline dùng cùng `AdminOverviewModel`** với mobile, gồm per-target state/failure/last check/error; offline view render lại `OverviewMobile` read-only.
5. **Hai SW không xoá cache của nhau**: mỗi SW chỉ dọn prefix của mình; sửa `public/sw.js` là bug fix bắt buộc.
6. **Không query status ở layout**: pill cập nhật nằm ở page có dữ liệu (Tổng quan/Ứng dụng); badge đọc snapshot IndexedDB và cập nhật qua event.
7. **Đăng xuất trên mobile** nằm trong card “Phiên đăng nhập” ở `/admin/settings`; nút này xoá snapshot trước khi gọi `logoutAction()`.
8. **Sản phẩm**: tách `/admin/analytics`; tên PWA “Ecosystem Admin”; icon admin riêng; status strip hiện ô `TẠM DỪNG` khi có app tạm dừng.

## 11. Cần chủ dự án duyệt

Design doc này chưa được build. Sau khi chủ dự án duyệt, bước tiếp theo là lập kế hoạch triển khai (`writing-plans`).
