# Admin Redesign + PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Làm lại `/admin` theo hướng trạng thái-lên-trước (C cho laptop, A cho điện thoại) và tách một PWA quản trị mở thẳng `/admin`, có snapshot offline.

**Architecture:** Một route `/admin` render hai composition dùng chung `AdminOverviewModel`: bảng vận hành cho `lg+`, cockpit trạng thái cho mobile. PWA admin có manifest/scope riêng, service worker scope `/admin`, snapshot IndexedDB và static offline shell; hub công khai giữ nguyên.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind 4, postgres, Vitest, Testing Library, fake-indexeddb (dev).

**Spec:** `docs/superpowers/specs/2026-11-20-admin-redesign-pwa-design.md`

## Global Constraints

- Next.js 16 App Router, React 19, Tailwind 4; không thêm UI library.
- Một admin, giao diện tiếng Việt, mốc thời gian `Asia/Ho_Chi_Minh`.
- Không đổi schema DB.
- PWA admin: `id/start_url/scope` là `/admin`; không push notification.
- Chỉ cache static shell + IndexedDB snapshot; không cache HTML admin, API hay server action.
- Hub công khai không đổi, trừ bug fix cache prefix của `public/sw.js`.
- WCAG AA; trạng thái luôn có chữ + dot, không chỉ dựa vào màu.
- Kết thúc mỗi task: `npm test -- <tests>`, `npm run lint`, `npm run build` khi task chạm route/build.

## Review Focus

1. **Bare `/admin` offline launch**: SW phải kiểm soát đúng `/admin` (không chỉ `/admin/`) và trả offline shell; test scope đăng ký + header + fallback.
2. **Missing/disabled targets**: `off` khác `unknown`, app tạm dừng không bị tính lỗi; test builder với `monitor_*` tắt, thiếu status row, app ẩn.
3. **Stale banner với app tạm dừng**: `lastCheckAt` bỏ qua app paused; tất cả paused không báo cũ; test builder.
4. **Hai SW xoá cache của nhau**: mỗi SW chỉ dọn prefix của mình; test source của `public/sw.js` và `public/admin/sw.js`.
5. **Offline snapshot thiếu dữ liệu**: snapshot phải đủ per-target failure/error/time để render cockpit; test serialize/deserialize + offline file.

---

## File Structure

**Types & data**
- `src/lib/admin/overview.ts` — `AdminOverviewModel`, `buildAdminOverview()`.
- `src/lib/db/checks.ts` — thêm `listRecentIncidents(limit)`.
- `src/lib/format.ts` — thêm `formatRelativeTime()`.

**Admin UI**
- `src/components/admin/status-pill.tsx` — pill trạng thái 5 state.
- `src/components/admin/status-summary-strip.tsx` — đếm app/target.
- `src/components/admin/attention-list.tsx` — card target lỗi/chưa rõ.
- `src/components/admin/app-status-row.tsx` — dòng bảng desktop.
- `src/components/admin/app-status-card.tsx` — card mobile.
- `src/components/admin/incident-rail.tsx` — sự cố gần đây.
- `src/components/admin/overview-desktop.tsx`, `overview-mobile.tsx` — hai composition.
- `src/components/admin/admin-page-header.tsx` — tiêu đề + pill cập nhật.
- `src/components/admin/shell/*` — sidebar, mobile bottom nav, nav link.
- `src/components/admin/pause-menu.tsx` — pause/resume trên overview/app detail.
- `src/components/admin/logout-button.tsx` — logout + clear snapshot.

**PWA**
- `public/admin/manifest.webmanifest`, `public/admin/sw.js`, `public/admin/offline.html`.
- `public/icons/admin-icon.svg` + `admin-icon-192.png`, `admin-icon-512.png`, `admin-icon-maskable-512.png`.
- `src/app/admin/layout.tsx` — metadata admin + SW register.
- `src/lib/pwa/register.ts` — đăng ký SW có test.
- `src/lib/pwa/snapshot.ts` — IndexedDB save/load/clear.
- `src/components/admin/admin-sw-register.tsx`, `snapshot-writer.tsx`, `admin-badge.tsx`, `install-prompt.tsx`, `connectivity-banner.tsx`.

**Routes**
- `src/app/admin/(protected)/page.tsx` — overview mới.
- `src/app/admin/(protected)/analytics/page.tsx` — analytics tách riêng.
- `src/app/admin/(protected)/layout.tsx` — shell mới.
- `src/app/admin/(protected)/apps/[id]/page.tsx` — thêm pause menu.
- `src/app/admin/(protected)/settings/page.tsx` — thêm card logout.
- `src/app/admin/login/page.tsx` — clear snapshot on login.
- `src/proxy.ts` + `src/lib/auth/session.ts` — cho qua PWA paths.

**Tests**
- `tests/unit/admin/overview.test.ts`, `status-pill.test.tsx`, `status-summary-strip.test.tsx`, `attention-list.test.tsx`, `app-status-row.test.tsx`, `app-status-card.test.tsx`, `incident-rail.test.tsx`, `overview-desktop.test.tsx`, `overview-mobile.test.tsx`, `admin-nav.test.tsx`, `pause-menu.test.tsx`, `logout-button.test.tsx`.
- `tests/unit/pwa/register.test.ts`, `sw-headers.test.ts`, `service-worker-cache.test.ts`, `snapshot.test.ts`, `install-prompt.test.tsx`, `admin-badge.test.tsx`, `connectivity-banner.test.tsx`, `admin-manifest.test.ts`.
- Sửa `tests/unit/auth/admin.test.ts`, `tests/unit/format.test.ts`.

---

### Task 1: Visual tokens, StatusPill, relative time

**Files:**
- Modify: `src/app/globals.css`, `src/lib/format.ts`, `src/components/admin/status-badge.tsx`
- Create: `src/components/admin/status-pill.tsx`
- Test: `tests/unit/format.test.ts`, `tests/unit/admin/status-pill.test.tsx`

**Interfaces:**
- Produces: `formatRelativeTime(value: string | null, now: Date): string`
- Produces: `StatusPill({ state, label?, size? })` với `state: 'up' | 'down' | 'unknown' | 'off' | 'paused'`, `size: 'sm' | 'md' | 'lg'`.

- [ ] **Step 1: Write failing tests**

`tests/unit/format.test.ts` thêm cases: `null → '—'`, 30 giây → `'vừa xong'`, 5 phút → `'5 phút trước'`, 90 phút → `'1 giờ trước'`, 3 ngày → `'3 ngày trước'`.

`tests/unit/admin/status-pill.test.tsx`:
```tsx
render(<StatusPill state="down" />);
expect(screen.getByText('Lỗi')).toBeInTheDocument();
expect(screen.getByText('Lỗi').closest('[data-state]')).toHaveAttribute('data-state', 'down');
// lặp cho up → 'Ổn', unknown → 'Chưa rõ', off → 'Tắt', paused → 'Tạm dừng'
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/format.test.ts tests/unit/admin/status-pill.test.tsx`
Expected: FAIL vì chưa có function/component.

- [ ] **Step 3: Implement**

Không đổi token gốc của hub. Thêm scope admin trong `globals.css`:
```css
.admin-theme {
  --paper:#f6f8f5; --ink:#0f172a; --card:#ffffff; --line:#dbe3dc; --muted:#475569;
}
:root {
  --muted:#475569; --ok-bg:#dcfce7; --ok-fg:#15803d;
  --bad-bg:#fee2e2; --bad-fg:#b91c1c;
  --warn-bg:#fef3c7; --warn-fg:#b45309;
  --unknown-bg:#e2e8f0; --unknown-fg:#475569;
}
```
Map `--color-muted`, `--color-ok-bg`… trong `@theme inline`. `AdminShell` và login page admin dùng class `admin-theme` để đổi palette cục bộ; hub công khai giữ nguyên.

`StatusPill` dùng `data-state`, dot `aria-hidden`, classes token; `StatusBadge` cũ wrapper:
```tsx
export function StatusBadge({ state = 'unknown' }: { state?: HealthState }) {
  return <StatusPill state={state} size="sm" />;
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/unit/format.test.ts tests/unit/admin/status-pill.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css src/lib/format.ts src/components/admin/status-pill.tsx src/components/admin/status-badge.tsx tests/unit/format.test.ts tests/unit/admin/status-pill.test.tsx
git commit -m "feat: add admin status tokens and status pill"
```

---

### Task 2: Admin overview model builder

**Files:**
- Create: `src/lib/admin/overview.ts`
- Test: `tests/unit/admin/overview.test.ts`

**Interfaces:**
- Produces: `buildAdminOverview(apps: AppRow[], statuses: AppStatusRow[], checks: CheckRow[], now: Date): AdminOverviewModel`
- Types: `TargetDisplayState = 'up' | 'down' | 'unknown' | 'off'`; `AppDisplayState = TargetDisplayState | 'paused'`; `AdminTargetView`, `AdminAppView`, `AdminAttentionItem` (gồm `state: 'down' | 'unknown'`), `AdminOverviewCounts`, `AdminOverviewModel` đúng như spec §5.5 (thêm `allPaused`, `counts.monitoredTargets`).

- [ ] **Step 1: Write failing tests**

Fixture helpers `makeApp(overrides)`, `makeStatus(overrides)`, `makeCheck(overrides)`. Tests:
```ts
it('marks paused apps and excludes them from failure counts, attention and stale')
it('distinguishes off targets from unknown targets')
it('uses worst target state for app counts and sorts severity first')
it('includes hidden apps and counts only monitored targets')
it('computes stale minutes from non-paused apps only')
it('returns an empty model for no apps')
```
Assertions cụ thể: app paused có status down → `worstState: 'paused'`, `counts.apps.paused: 1`, `counts.targets.down: 0` (target của app paused không vào counts), `attention` rỗng, `isStale: false`; app `monitor_supabase: false` → `supabase: null`, `counts.targets.off` tăng nhưng `monitoredTargets` không tăng; app ẩn vẫn có trong `apps`/counts; `lastCheckAt` bỏ qua app paused; sort `down, unknown, up, off, paused`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/admin/overview.test.ts`
Expected: FAIL vì chưa có module.

- [ ] **Step 3: Implement builder**

Logic bắt buộc:
- `paused = isMonitoringPaused(app, now)` từ `@/lib/health/targets`.
- App target `null` khi `monitor_app` false; Supabase target `null` khi `monitor_supabase` false hoặc không có `supabase_health_url`/`supabase_ref` hợp lệ.
- Target active nhưng thiếu status row → `unknown`.
- Latest check theo `checked_at`; `lastError` cắt 120 ký tự; `latencyMs` từ latest check.
- `worstState`: paused > down > unknown > up > off.
- `attention`: chỉ target down/unknown, không paused/off; sort down trước unknown, rồi `consecutiveFailures` desc, rồi tên app.
- `lastCheckAt`: max trên app không paused; `allPaused = apps.length > 0 && every paused`; `isStale = !allPaused && apps.length > 0 && (lastCheckAt === null || staleMinutes > 10)`.
- `counts.targets` gồm up/down/unknown/off, **chỉ tính app không tạm dừng**; `monitoredTargets = up + down + unknown`.
- Sort apps: down, unknown, up, off, paused; trong nhóm theo `name.localeCompare`.

- [ ] **Step 4: Run test**

Run: `npm test -- tests/unit/admin/overview.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin/overview.ts tests/unit/admin/overview.test.ts
git commit -m "feat: build admin overview status model"
```

---

### Task 3: Admin shell, navigation, logout

**Files:**
- Create: `src/components/admin/shell/admin-nav-link.tsx`, `admin-sidebar.tsx`, `admin-mobile-nav.tsx`, `admin-shell.tsx`, `src/components/admin/logout-button.tsx`
- Modify: `src/app/admin/(protected)/layout.tsx`
- Test: `tests/unit/admin/admin-nav.test.tsx`

**Interfaces:**
- `AdminNavLink({ href, label, icon, exact? })` — client, `usePathname()`, `aria-current="page"` khi active.
- `AdminSidebar()`, `AdminMobileNav()`, `AdminShell({ children })`.
- `LogoutButton()` — bản đầu chỉ submit `logoutAction`; Task 9 sửa để clear snapshot trước.
- Nav items: Tổng quan `/admin`, Ứng dụng `/admin/apps`, Phân tích `/admin/analytics`, Cài đặt `/admin/settings`.

- [ ] **Step 1: Write failing test**

Mock `next/navigation` `usePathname: () => '/admin/apps'`; render `<AdminMobileNav />`; assert link `/admin/apps` có `aria-current="page"`, link `/admin` không có; nav có `aria-label="Điều hướng quản trị"`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/admin/admin-nav.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement shell**

Desktop: sidebar `hidden lg:flex` nền `bg-ink`, nav + `<LogoutButton />`. Mobile: top content do page render, bottom nav `lg:hidden`, safe-area padding. `AdminShell` root dùng `admin-theme` + `bg-paper text-ink`. `(protected)/layout.tsx` giữ `requireAdmin()` và render `<AdminShell>{children}</AdminShell>`.

- [ ] **Step 4: Run tests + build**

Run: `npm test -- tests/unit/admin/admin-nav.test.tsx && npm run build`
Expected: PASS/build OK.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/shell src/components/admin/logout-button.tsx src/app/admin/(protected)/layout.tsx tests/unit/admin/admin-nav.test.tsx
git commit -m "feat: add responsive admin shell"
```

---

### Task 4: Summary strip, attention list, page header

**Files:**
- Create: `src/components/admin/status-summary-strip.tsx`, `attention-list.tsx`, `admin-page-header.tsx`
- Test: `tests/unit/admin/status-summary-strip.test.tsx`, `attention-list.test.tsx`

**Interfaces:**
- `StatusSummaryStrip({ counts, appCount })` — chips `ỔN/LỖI/CHƯA RÕ/TẠM DỪNG` theo `counts.apps`; subline `X ứng dụng · Y mục tiêu · Z/Y mục tiêu ổn`.
- `AttentionList({ items, now, offline? })` — mỗi item link `/admin/apps/[appId]` (hoặc `<div>` khi `offline`), hiện target, pill theo `item.state` (`down`/`unknown`), số lần lỗi, lỗi gần nhất, thời gian tương đối; rỗng → `null`.
- `AdminPageHeader({ title, description?, lastCheckAt, isStale, now, actions? })` — pill “Cập nhật X phút trước” xanh/amber.

- [ ] **Step 1: Write failing tests**

Strip: counts `{apps:{up:5,down:1,unknown:0,off:0,paused:0}, targets:{...}, monitoredTargets:13}` → thấy `5`, `1`, `13 mục tiêu`, không có chip `TẠM DỪNG`; thêm paused → chip hiện.
Attention: 2 items (down + unknown) → render đủ; item `state: 'unknown'` với `consecutiveFailures: 1` vẫn hiện pill “Chưa rõ” (không suy ra từ số lần lỗi); item paused/off không được truyền vào; rỗng → container null.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/admin/status-summary-strip.test.tsx tests/unit/admin/attention-list.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

Dùng `StatusPill` cho attention; dùng token mới; không dùng `text-ink/40`. `AttentionList` dùng `formatRelativeTime(item.lastCheckAt, now)`.

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/unit/admin/status-summary-strip.test.tsx tests/unit/admin/attention-list.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/status-summary-strip.tsx src/components/admin/attention-list.tsx src/components/admin/admin-page-header.tsx tests/unit/admin/status-summary-strip.test.tsx tests/unit/admin/attention-list.test.tsx
git commit -m "feat: add admin status summary and attention list"
```

---

### Task 5: App rows/cards, incident rail, pause menu, incidents query

**Files:**
- Create: `src/components/admin/app-status-row.tsx`, `app-status-card.tsx`, `incident-rail.tsx`, `pause-menu.tsx`
- Modify: `src/lib/db/checks.ts`
- Test: `tests/unit/admin/app-status-row.test.tsx`, `app-status-card.test.tsx`, `incident-rail.test.tsx`, `pause-menu.test.tsx`

**Interfaces:**
- `AppStatusRow({ app })`, `AppStatusCard({ app, offline? })`.
- `IncidentRail({ incidents })`.
- `PauseMenu({ appId, paused })` — gọi `pauseMonitoringAction(appId, 30|60)`, `resumeMonitoringAction(appId)`.
- `RecentIncidentRow = IncidentRow & { app_name: string; app_slug: string; app_paused: boolean }`; `listRecentIncidents(limit: number): Promise<RecentIncidentRow[]>`.

- [ ] **Step 1: Write failing tests**

Row: app down có row class đỏ, pill `Lỗi`; app paused hiện `Tạm dừng` thay cho 2 target; target `null` hiện `Tắt`.
Card: down hiện `Lỗi`, paused hiện `Tạm dừng`, link tới `/admin/apps/[id]`.
Rail: incident paused hiện `Tạm dừng theo dõi`; rỗng hiện `Không có sự cố`.
PauseMenu: mock `@/app/admin/(protected)/apps/actions`; click “Tạm dừng 30 phút” → action được gọi với `(appId, 30)`; paused → click “Tiếp tục giám sát” → resume.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/admin/app-status-row.test.tsx tests/unit/admin/app-status-card.test.tsx tests/unit/admin/incident-rail.test.tsx tests/unit/admin/pause-menu.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

Thêm query:
```sql
select i.*, a.name as app_name, a.slug as app_slug,
  (a.monitoring_paused_until is not null and a.monitoring_paused_until > now()) as app_paused
from incidents i join apps a on a.id = i.app_id
order by i.started_at desc limit ${limit}
```
Row desktop dùng `<tr>`, card mobile dùng `<Link>`; `PauseMenu` là client component.

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/unit/admin/app-status-row.test.tsx tests/unit/admin/app-status-card.test.tsx tests/unit/admin/incident-rail.test.tsx tests/unit/admin/pause-menu.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/app-status-row.tsx src/components/admin/app-status-card.tsx src/components/admin/incident-rail.tsx src/components/admin/pause-menu.tsx src/lib/db/checks.ts tests/unit/admin
git commit -m "feat: add admin app status rows, cards and incidents"
```

---

### Task 6: Overview desktop/mobile compositions

**Files:**
- Create: `src/components/admin/overview-desktop.tsx`, `overview-mobile.tsx`
- Test: `tests/unit/admin/overview-desktop.test.tsx`, `overview-mobile.test.tsx`

**Interfaces:**
- `OverviewDesktop({ model, incidents, now })`.
- `OverviewMobile({ model, now, offline?, savedAt? })`.

- [ ] **Step 1: Write failing tests**

Desktop: model có 1 down → alert line hiện app/target; table render đủ app theo thứ tự `model.apps`; rail render incident; `isStale` → banner dữ liệu cũ.
Mobile: `counts.apps.down > 0` → hero “1 ứng dụng đang lỗi”; all up → “Tất cả hệ thống ổn định”; unknown → “Cần kiểm tra”; all paused → “Đang tạm dừng giám sát”; `monitoredTargets === 0` → “Chưa bật giám sát”; `apps.length === 0` → “Chưa có ứng dụng nào”; `isStale` → banner dữ liệu cũ; `offline` + `savedAt` → banner “Đang offline · Dữ liệu lúc…”.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/admin/overview-desktop.test.tsx tests/unit/admin/overview-mobile.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

Desktop: `StatusSummaryStrip`, stale banner, alert line từ `model.attention[0]`, `<table>` rows, rail `hidden xl:block` + list dưới bảng `xl:hidden`.
Mobile: stale/offline banner, hero, `AttentionList`, `AppStatusCard`s; truyền `offline` để card/attention render `<div>` thay vì `<Link>`, không có action. Không render bottom nav ở đây (shell lo).

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/unit/admin/overview-desktop.test.tsx tests/unit/admin/overview-mobile.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/overview-desktop.tsx src/components/admin/overview-mobile.tsx tests/unit/admin/overview-desktop.test.tsx tests/unit/admin/overview-mobile.test.tsx
git commit -m "feat: add desktop and mobile admin overview layouts"
```

---

### Task 7: Wire `/admin`, add `/admin/analytics`

**Files:**
- Modify: `src/app/admin/(protected)/page.tsx`
- Create: `src/app/admin/(protected)/analytics/page.tsx`
- Test: `tests/unit/admin/overview-page.test.tsx`, `tests/unit/admin/analytics-page.test.tsx` (smoke, mock DB)

**Interfaces:**
- Page `/admin` fetch `listAllApps`, `getStatuses`, `listChecksSince(now-24h)`, `listRecentIncidents(10)`; gọi `buildAdminOverview`; render `AdminPageHeader`, `OverviewDesktop`, `OverviewMobile`.
- Page `/admin/analytics` fetch `listAllApps`, `listClicksSince(now-30d)`; render KPI + `ClickChart` + bảng click theo app.

- [ ] **Step 1: Write failing smoke test**

Mock `next/server` `connection`, `@/lib/db/apps`, `@/lib/db/checks`, `@/lib/db/clicks`, và `@/app/admin/(protected)/apps/actions`; render `await AdminOverviewPage()`; assert “Tổng quan” và tên app fixture xuất hiện. Analytics test mock thêm `@/components/charts/click-chart` → `<div data-testid="click-chart" />`; assert KPI “Lượt bấm hôm nay” và chart xuất hiện.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/admin/overview-page.test.tsx tests/unit/admin/analytics-page.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement pages**

Overview bỏ toàn bộ KPI/chart cũ; analytics page chuyển phần đó sang, dùng `AdminPageHeader` và token mới. Giữ `export const instant = false;` cho các trang đọc DB.

- [ ] **Step 4: Run tests + build**

Run: `npm test -- tests/unit/admin/overview-page.test.tsx tests/unit/admin/analytics-page.test.tsx && npm run build`
Expected: PASS/build OK.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/(protected)/page.tsx src/app/admin/(protected)/analytics/page.tsx tests/unit/admin/overview-page.test.tsx tests/unit/admin/analytics-page.test.tsx
git commit -m "feat: wire admin overview and analytics pages"
```

---

### Task 8: Admin manifest, icons, metadata

**Files:**
- Create: `public/admin/manifest.webmanifest`, `public/icons/admin-icon.svg`
- Modify: `scripts/generate-icons.mjs`, create `src/app/admin/layout.tsx`
- Test: `tests/unit/pwa/admin-manifest.test.ts`

**Interfaces:**
- Manifest static: `name "Ecosystem Admin"`, `short_name "Admin"`, `id/start_url/scope "/admin"`, `display "standalone"`, `theme_color "#0f172a"`, icons 192/512/maskable, shortcuts `/admin`, `/admin/apps`, `/admin/analytics`, `/admin/settings`.
- `src/app/admin/layout.tsx` export `metadata` (manifest, appleWebApp title, icon apple) và `viewport.themeColor`.

- [ ] **Step 1: Write failing test**

Read JSON bằng `readFileSync`; assert `start_url/scope/id`, `display`, icons có `sizes`/`purpose`, shortcuts URL. Assert `existsSync` cho 3 PNG admin.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/pwa/admin-manifest.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Tạo SVG pulse trên nền `#0f172a`; cập nhật `scripts/generate-icons.mjs` sinh 3 PNG admin; chạy `npm run icons`. Tạo layout metadata; không đặt auth trong layout này (auth ở `(protected)/layout.tsx`).

- [ ] **Step 4: Run test + icons**

Run: `npm run icons && npm test -- tests/unit/pwa/admin-manifest.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add public/admin/manifest.webmanifest public/icons/admin-icon.svg public/icons/admin-icon-*.png scripts/generate-icons.mjs src/app/admin/layout.tsx tests/unit/pwa/admin-manifest.test.ts
git commit -m "feat: add admin PWA manifest and icons"
```

---

### Task 9: Offline snapshot, static shell, logout clearing

**Files:**
- Create: `src/lib/pwa/snapshot.ts`, `src/components/admin/snapshot-writer.tsx`, `src/components/admin/clear-snapshot-on-login.tsx`, `public/admin/offline.html`
- Modify: `src/app/admin/(protected)/page.tsx`, `src/components/admin/logout-button.tsx`, `src/app/admin/login/page.tsx`, `next.config.ts`, `src/lib/auth/session.ts`
- Test: `tests/unit/pwa/snapshot.test.ts`, `tests/unit/admin/logout-button.test.tsx`, `tests/unit/admin/clear-snapshot-on-login.test.tsx`, `tests/unit/pwa/offline-shell.test.ts`
- Add dev dep: `fake-indexeddb`

**Interfaces:**
- `AdminSnapshot = { version: 1; savedAt: string; model: AdminOverviewModel }`.
- `saveAdminSnapshot(model)`, `loadAdminSnapshot()`, `clearAdminSnapshot()`, `dispatchSnapshotUpdated()`.
- `ClearSnapshotOnLogin()` — client, gọi `clearAdminSnapshot()` on mount.
- Static `public/admin/offline.html` đọc IndexedDB `ecosystem-admin`/`snapshots`/`overview`, render hero + attention + cards, banner “Đang offline · Dữ liệu lúc…”, nút “Khoá” xoá snapshot; escape text bằng DOM/textContent.
- Rewrite `/admin/offline` → `/admin/offline.html`; allowlist cả hai.

- [ ] **Step 1: Install test dep + write failing tests**

Run: `npm install -D fake-indexeddb`.
Snapshot test (jsdom + `import 'fake-indexeddb/auto'`): save → load khớp model + `version:1`; clear → null; dispatch event.
Logout test: mock `clearAdminSnapshot` + `logoutAction`; click → cả hai được gọi theo thứ tự clear trước.
ClearSnapshotOnLogin test: render, chờ effect, assert `clearAdminSnapshot` được gọi.
Offline shell test (node): file tồn tại, chứa `ecosystem-admin`, `indexedDB`, `admin-snapshot`, và không dùng `innerHTML` với dữ liệu snapshot.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/pwa/snapshot.test.ts tests/unit/admin/logout-button.test.tsx tests/unit/admin/clear-snapshot-on-login.test.tsx tests/unit/pwa/offline-shell.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

`snapshot.ts` mở DB, tạo store `snapshots`, put/get/delete key `overview`; lỗi chỉ log. `SnapshotWriter` gọi save + dispatch, throttle theo JSON string. Static shell inline CSS/JS, dùng `textContent`/DOM API. `LogoutButton` clear rồi gọi `logoutAction`; login page render `<ClearSnapshotOnLogin />`. `adminGate` cho qua `/admin/offline` + `/admin/offline.html`; rewrite trong `next.config.ts`.

- [ ] **Step 4: Run tests + build**

Run: `npm test -- tests/unit/pwa/snapshot.test.ts tests/unit/admin/logout-button.test.tsx tests/unit/admin/clear-snapshot-on-login.test.tsx tests/unit/pwa/offline-shell.test.ts && npm run build`
Expected: PASS/build OK.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pwa/snapshot.ts src/components/admin/snapshot-writer.tsx src/components/admin/clear-snapshot-on-login.tsx public/admin/offline.html src/app/admin/(protected)/page.tsx src/components/admin/logout-button.tsx src/app/admin/login/page.tsx next.config.ts src/lib/auth/session.ts tests/unit/pwa tests/unit/admin/logout-button.test.tsx tests/unit/admin/clear-snapshot-on-login.test.tsx package.json package-lock.json
git commit -m "feat: add admin offline snapshot and shell"
```

---

### Task 10: Admin service worker, registration, proxy, headers, cache prefix

**Files:**
- Create: `public/admin/sw.js`, `src/lib/pwa/register.ts`, `src/components/admin/admin-sw-register.tsx`
- Modify: `src/app/admin/layout.tsx`, `src/components/service-worker-register.tsx`, `src/lib/auth/session.ts`, `next.config.ts`, `public/sw.js`
- Test: `tests/unit/pwa/register.test.ts`, `sw-headers.test.ts`, `service-worker-cache.test.ts`, `tests/unit/auth/admin.test.ts`

**Interfaces:**
- `registerAdminServiceWorker(nav: Navigator): Promise<void>` → `nav.serviceWorker.register('/admin/sw.js', { scope: '/admin' })`.
- `shouldRegisterPublicSw(pathname: string): boolean` → false cho `/admin` và `/admin/*`.
- `adminGate` cho qua `/admin/sw.js`, `/admin/manifest.webmanifest`, `/admin/offline`, `/admin/offline.html`; vẫn chặn `/admin/apps`.
- `next.config.ts` headers cho `/admin/sw.js`: Content-Type, Cache-Control, `Service-Worker-Allowed: /admin`.
- `public/sw.js` activate chỉ xoá `ecosystem-hub-*`; `public/admin/sw.js` chỉ xoá `ecosystem-admin-*`.

- [ ] **Step 1: Write failing tests**

Register: fake navigator, assert `register` args.
AdminGate: thêm cases PWA paths → `allow`, `/admin/apps` no session → `login`.
Headers: import `nextConfig`, `await headers()`; assert 3 headers cho source `/admin/sw.js`.
Cache/fallback: đọc source 2 file; assert có `startsWith('ecosystem-hub-')` / `startsWith('ecosystem-admin-')`, không còn `key !== CACHE` blanket; `public/admin/sw.js` xử lý `pathname === '/admin'` và fallback `'/admin/offline'`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/pwa/register.test.ts tests/unit/pwa/sw-headers.test.ts tests/unit/pwa/service-worker-cache.test.ts tests/unit/auth/admin.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Admin SW: precache `/admin/offline`, manifest, icons; navigation `/admin` + `/admin/*` network-first fallback `/admin/offline`; static `/_next/static/` cache-first; skip `_rsc`/API/non-GET; `skipWaiting`/`clients.claim`; delete only admin prefix. Public SW đổi cleanup prefix. `ServiceWorkerRegister` gọi `shouldRegisterPublicSw(window.location.pathname)`.

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/unit/pwa/register.test.ts tests/unit/pwa/sw-headers.test.ts tests/unit/pwa/service-worker-cache.test.ts tests/unit/auth/admin.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add public/admin/sw.js public/sw.js src/lib/pwa/register.ts src/components/admin/admin-sw-register.tsx src/app/admin/layout.tsx src/components/service-worker-register.tsx src/lib/auth/session.ts next.config.ts tests/unit/pwa tests/unit/auth/admin.test.ts
git commit -m "feat: add scoped admin service worker and PWA allowlist"
```

---

### Task 11: Install prompt, badge, connectivity banner

**Files:**
- Create: `src/components/admin/install-prompt.tsx`, `admin-badge.tsx`, `connectivity-banner.tsx`
- Modify: `src/app/admin/(protected)/layout.tsx`, `src/app/admin/(protected)/page.tsx`, `src/app/admin/(protected)/apps/page.tsx`
- Test: `tests/unit/admin/install-prompt.test.tsx`, `admin-badge.test.tsx`, `connectivity-banner.test.tsx`

**Interfaces:**
- `AdminInstallPrompt()` — ẩn khi standalone; Chrome `beforeinstallprompt` → nút Cài; iOS → hướng dẫn; dismiss localStorage 30 ngày.
- `AdminBadge({ downTargetCount? })` — `setAppBadge`/`clearAppBadge`, fallback snapshot + event.
- `ConnectivityBanner()` — online/offline event, banner “Bạn đang offline”.

- [ ] **Step 1: Write failing tests**

Install: stub `matchMedia` standalone true → render null; iOS UA → text “Thêm vào màn hình chính”; `beforeinstallprompt` event → nút Cài gọi `prompt`.
Badge: fake navigator `setAppBadge`/`clearAppBadge`; count 2 → set 2; count 0 → clear; dispatch event với snapshot → update.
Connectivity: dispatch `offline` → banner; `online` → mất.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/admin/install-prompt.test.tsx tests/unit/admin/admin-badge.test.tsx tests/unit/admin/connectivity-banner.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

Đặt `AdminInstallPrompt` + `ConnectivityBanner` trong `(protected)/layout.tsx`; `AdminBadge` ở overview/apps với count từ server. Apps page dùng `buildAdminOverview(apps, statuses, [], now)` cho `AdminPageHeader` (lastCheckAt/isStale) và `counts.targets.down` (đã loại paused). Feature-detect mọi API; không throw trên Safari cũ.

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/unit/admin/install-prompt.test.tsx tests/unit/admin/admin-badge.test.tsx tests/unit/admin/connectivity-banner.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/install-prompt.tsx src/components/admin/admin-badge.tsx src/components/admin/connectivity-banner.tsx src/app/admin/(protected)/layout.tsx src/app/admin/(protected)/page.tsx src/app/admin/(protected)/apps/page.tsx tests/unit/admin
git commit -m "feat: add admin PWA install, badge and connectivity UI"
```

---

### Task 12: App detail pause, settings logout, visual pass

**Files:**
- Modify: `src/app/admin/(protected)/apps/[id]/page.tsx`, `src/app/admin/(protected)/settings/page.tsx`, `src/app/admin/(protected)/apps/page.tsx`, `src/components/admin/apps-table.tsx`, `src/components/admin/app-form.tsx`, `src/components/admin/settings-form.tsx`
- Test: `tests/unit/admin/pause-menu.test.tsx` (đã có), `tests/unit/admin/logout-button.test.tsx` (đã có)

**Interfaces:**
- App detail header render `PauseMenu` với `app.id`/`paused`.
- Settings page thêm card “Phiên đăng nhập” + `LogoutButton`.
- Thay `text-ink/40…` bằng `text-muted`; label form dùng `text-ink`; input focus ring; tap target ≥44px.
- Apps page dùng `AdminPageHeader` + `AdminBadge` (đã thêm ở Task 11) và giữ bảng hiện có, chỉ đổi token/contrast.

- [ ] **Step 1: Run the existing component tests**

Run: `npm test -- tests/unit/admin/pause-menu.test.tsx tests/unit/admin/logout-button.test.tsx`
Expected: PASS. Hai component đã được test ở Task 5/9; task này chỉ nối vào page, kiểm tra bằng manual check ở Task 13.

- [ ] **Step 2: Implement**

App detail: thêm `PauseMenu` cạnh nút Sửa. Settings: thêm card logout. Login page thêm class `admin-theme`. Visual pass: `rg "text-ink/[0-6]" src/app/admin src/components/admin` → thay bằng token phù hợp; giữ `text-muted` cho phụ, `text-ink` cho chính.

- [ ] **Step 3: Run tests + lint**

Run: `npm test -- tests/unit/admin && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/(protected)/apps/[id]/page.tsx src/app/admin/(protected)/settings/page.tsx src/app/admin/(protected)/apps/page.tsx src/components/admin/apps-table.tsx src/components/admin/app-form.tsx src/components/admin/settings-form.tsx
git commit -m "feat: add pause and logout controls to admin pages"
```

---

### Task 13: Final verification

- [ ] **Step 1: Run full checks**

Run:
```bash
npm test
npm run lint
npm run build
```
Expected: all pass.

- [ ] **Step 2: Manual verification (spec §6)**

- Desktop 1440×900: status strip + alert + table visible without scroll; failing row red.
- Mobile 390×844: hero + “Cần chú ý” + ≥3 app cards; no horizontal scroll; bottom nav safe-area.
- Install PWA on Android Chrome + iOS Safari; icon opens `/admin`; offline relaunch shows snapshot + timestamp; logout clears.
- Badge shows down target count; recovery clears.
- Stop cron >10 min → stale banner; resume → clears; pause 60 min → no stale banner.
- Keyboard tab through nav/table/menu; focus visible; axe/Lighthouse AA.

- [ ] **Step 3: Fix and commit**

```bash
git add -A
git commit -m "chore: verify admin redesign and PWA"
```
