# Ecosystem Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public PWA hub listing 5–10 owned web apps with click tracking, plus a private admin dashboard for click analytics, app + Supabase uptime/latency monitoring, and Telegram/email alerts.

**Architecture:** One Next.js App Router application on Vercel. Public hub and admin pages are server components; click counting and health checks are route handlers. Neon Postgres stores the catalog, clicks, checks, status, incidents, and settings. Admin auth is a single password with a signed JWT cookie. A free external cron (cron-job.org) calls the protected health endpoint every 5 minutes; Supabase projects are health-check targets only, never the hub's database.

**Tech Stack:** Next.js 16 (App Router, TypeScript), React 19, Tailwind CSS 4, Neon Postgres with `postgres` (porsager), `jose`, Recharts, `@serwist/next`, Resend, Vitest + Testing Library, `@dnd-kit/*`, Zod.

**Spec:** `docs/superpowers/specs/2026-11-18-ecosystem-hub-design.md`

## Global Constraints

- Only Next.js runs application code (Vercel). No Supabase DB/Auth/Cron, no external uptime service.
- Neon is the only database, accessed server-side only through `DATABASE_URL` (`sslmode=require`, pooled). No client-side DB access.
- UI copy is Vietnamese; all day bucketing uses `Asia/Ho_Chi_Minh`.
- Monitoring defaults: external cron every 5 minutes, down after 3 consecutive failures, slow when latency > 2000ms for 3 consecutive checks, slow alert at most once per hour per target, repeat-down reminders off.
- Check both targets per app: `app` (public URL) and `supabase` (`https://<ref>.supabase.co/auth/v1/health`), each independently.
- 5–10 apps, one admin. Free tiers only: Vercel Hobby (personal, non-commercial), Neon Free, Resend Free, Telegram, cron-job.org.
- Secrets stay in `.env.local` / Vercel env and never reach the client: `DATABASE_URL`, `ADMIN_PASSWORD`, `SESSION_SECRET`, `CRON_SECRET`, `IP_HASH_SALT`, optional `TELEGRAM_BOT_TOKEN`, `RESEND_API_KEY`.
- Admin session: JWT HS256, `hub_session` cookie, httpOnly, sameSite=lax, secure in production, 7 days.
- `ADMIN_PASSWORD=change-me-now` must be rejected when `NODE_ENV === 'production'`.
- App icons are pasted URLs in v1. Owner clicks count as normal clicks in v1.
- Node runtime for route handlers (`export const runtime = 'nodejs'`). Health cron route: `maxDuration = 60`.
- Every task ends with a passing test run and a commit.

## Review Focus

- A redirect slug that does not exist or is hidden must return 404 and record no click (Task 4 test).
- A bot/crawler request must still redirect but never be counted (Task 4 test).
- A health target that times out or hangs must be recorded as a failed check with an error, and the run must finish (Task 8 test).
- An app paused for deploy must be skipped by checks and produce no alert; it resumes after the pause (Task 8 test).
- Repeated failures and overlapping runs must produce exactly one open incident and one down alert per target, then exactly one recovery (Task 8 tests; DB partial unique index in Task 2).

---

## File Structure

```
db/migrations/
  001_init.sql                    # tables, indexes, trigger, seed row
  002_functions.sql               # claim/release health run
scripts/
  db-migrate.mjs
  db-check.mjs
  db-seed.mjs
  generate-icons.mjs
src/
  app/
    layout.tsx
    page.tsx                      # public hub
    offline/page.tsx
    manifest.ts
    sw.ts
    admin/
      login/page.tsx
      login/actions.ts
      (protected)/
        layout.tsx
        page.tsx
        apps/page.tsx
        apps/new/page.tsx
        apps/[id]/page.tsx
        apps/[id]/edit/page.tsx
        settings/page.tsx
    api/
      go/[slug]/route.ts
      cron/health/route.ts
  components/
    app-card.tsx
    hub-grid.tsx
    admin/apps-table.tsx
    admin/status-badge.tsx
    charts/click-chart.tsx
    charts/latency-chart.tsx
  lib/
    env.ts
    auth/admin.ts
    auth/cron.ts
    db/client.ts
    db/types.ts
    db/apps.ts
    db/clicks.ts
    db/checks.ts
    db/settings.ts
    validation/app.ts
    validation/settings.ts
    analytics/click-payload.ts
    analytics/stats.ts
    health/evaluate.ts
    health/ping.ts
    health/targets.ts
    health/runner.ts
    health/alerts.ts
    health/deps.ts
    format.ts
  proxy.ts                        # Next 16 route guard (replaces middleware)
tests/
  setup.ts
  unit/...
docs/runbook.md
.env.example
```

---

### Task 1: Scaffold Next.js + Vitest + app validation schema

**Status:** completed before the architecture revision; scaffold, test harness, and `appInputSchema` are in `feat/ecosystem-hub`.

**Files:**
- Create: project scaffold (package.json, tsconfig, `src/app/*`, Tailwind config)
- Create: `vitest.config.mts`, `tests/setup.ts`
- Create: `src/lib/validation/app.ts`
- Test: `tests/unit/validation/app.test.ts`

**Interfaces:**
- Produces: `appInputSchema` and `type AppInput = { name: string; slug: string; description?: string; url: string; iconUrl?: string; healthUrl?: string; expectedStatus: number; timeoutMs: number }`.

- [x] Scaffold done (`create-next-app@16.4.6`, Next 16, Tailwind 4, TypeScript).
- [x] Vitest 5 configured in `vitest.config.mts` with native tsconfig paths; `tests/setup.ts` provides test env defaults.
- [x] `appInputSchema` tests pass (8 tests).

---

### Task 2: Neon schema, migration runner, DB client, and data layer

**Files:**
- Create: `db/migrations/001_init.sql`, `db/migrations/002_functions.sql`
- Create: `scripts/db-migrate.mjs`, `scripts/db-check.mjs`, `scripts/db-seed.mjs`
- Create: `src/lib/db/client.ts`, `types.ts`, `apps.ts`, `clicks.ts`, `checks.ts`, `settings.ts`
- Create: `src/lib/env.ts`, `.env.example`
- Modify: `tests/setup.ts` (replace Supabase env vars with Neon/admin vars)
- Modify: `package.json` scripts (`db:migrate`, `db:check`, `db:seed`)
- Test: none new (schema verified by `db-check`); pure helpers tested in later tasks

**Interfaces:**
- Produces row types: `AppRow`, `PublicApp` (`Pick<AppRow, 'id'|'slug'|'name'|'description'|'url'|'icon_url'>`), `ClickEventRow`, `CheckRow`, `AppStatusRow`, `SettingsRow`, `SettingsInput`, `IncidentRow`, `NewClickEvent`, `NewCheck`, `Target = 'app' | 'supabase'`.
- Produces `getSql()` (singleton `postgres` client, `prepare: false`, `max: 1`).
- Produces data functions:
  - apps: `listVisibleApps()`, `listAllApps()`, `getAppById(id)`, `getVisibleAppBySlug(slug)`, `createApp(input)`, `updateApp(id, input)`, `deleteApp(id)`, `setAppVisibility(id, visible)`, `setAppMonitor(id, target, enabled)`, `pauseAppMonitoring(id, until)`, `reorderApps(ids)`, `listAppsToCheck(now)`.
  - clicks: `insertClickEvent(event)`, `listClicksSince(since)`.
  - checks: `insertCheck(row)`, `listChecksSince(since)`, `listChecksForAppSince(appId, since)`, `listRecentChecks(appId, limit)`, `getStatuses()`, `upsertStatus(row)`, `openIncident(row)`, `closeOpenIncident(appId, target, at)`, `listIncidents(appId, limit)`.
  - settings: `getSettings()`, `updateSettings(input)`, `claimHealthRun(staleAfterSeconds = 30)`, `releaseHealthRun()`.

- [ ] **Step 1: Write the schema migration**

`001_init.sql` creates, with exactly these columns:

- `apps`: `id uuid pk default gen_random_uuid()`, `slug text unique not null` regex check, `name text not null`, `description text`, `url text not null`, `icon_url text`, `supabase_ref text`, `supabase_health_url text`, `sort_order int not null default 0`, `is_visible bool not null default true`, `monitor_app bool not null default true`, `monitor_supabase bool not null default true`, `monitoring_paused_until timestamptz`, `expected_status int not null default 200`, `timeout_ms int not null default 5000`, `created_at/updated_at timestamptz not null default now()`.
- `click_events`: `id bigserial pk`, `app_id uuid not null references apps(id) on delete cascade`, `clicked_at timestamptz not null default now()`, `referrer text`, `user_agent text`, `ip_hash text not null`, `country text`.
- `checks`: `id bigserial pk`, `app_id uuid not null references apps(id) on delete cascade`, `target text not null check (target in ('app','supabase'))`, `checked_at timestamptz not null default now()`, `ok bool not null`, `status_code int`, `latency_ms int not null`, `error text`.
- `app_status`: `app_id uuid` + `target text`, primary key `(app_id,target)`, `state text not null default 'unknown' check (state in ('up','down','unknown'))`, `consecutive_failures int not null default 0`, `consecutive_slow int not null default 0`, `last_check_at`, `last_ok_at`, `last_down_at`, `last_down_alert_at`, `last_slow_alert_at`.
- `incidents`: `id bigserial pk`, `app_id`, `target`, `started_at timestamptz not null default now()`, `resolved_at timestamptz`, `first_error text`. Partial unique: `(app_id,target) where resolved_at is null`.
- `settings`: `id smallint pk default 1 check (id = 1)`, `telegram_chat_id text`, `email_recipients text[] not null default '{}'`, `failure_threshold int not null default 3`, `slow_threshold_ms int not null default 2000`, `alerts_enabled bool not null default true`, `notify_recovery bool not null default true`, `repeat_reminder_minutes int not null default 0`, `health_run_locked_at timestamptz`, `last_cleanup_at timestamptz`, `updated_at timestamptz not null default now()`. Insert singleton.
- `schema_migrations`: `name text pk`, `applied_at timestamptz not null default now()`.

Indexes: `click_events(app_id, clicked_at desc)`, `click_events(clicked_at desc)`, `checks(app_id, target, checked_at desc)`, `checks(checked_at desc)`, `incidents(app_id, started_at desc)`. Add `touch_updated_at()` trigger on `apps` and `settings`.

`002_functions.sql` defines `claim_health_run(stale_after_seconds int default 30) returns boolean` as an atomic `update settings ... where id = 1 and (health_run_locked_at is null or health_run_locked_at < now() - make_interval(secs => ...)) returning id`, wrapped in `select exists(...)`, plus `release_health_run()` setting the lock to null.

- [ ] **Step 2: Write the migration/check/seed scripts**

`db-migrate.mjs`: read sorted `db/migrations/*.sql`; create `schema_migrations`; for each file not recorded, run it inside `sql.begin()` with `tx.file(path)`, then insert the filename. Use `postgres(env.DATABASE_URL, { prepare: false, max: 1 })` and `await sql.end()`.

`db-check.mjs`: query `information_schema.tables`/`columns` for the seven tables and key columns, assert the settings singleton exists, print `db-check OK` or exit 1.

`db-seed.mjs`: insert `blog` and `shop` sample apps and the settings row only if absent.

Add `"db:migrate"`, `"db:check"`, `"db:seed"` scripts using `node --env-file=.env.local scripts/<name>.mjs`.

- [ ] **Step 3: Write env validation and the SQL client**

`src/lib/env.ts` (Zod): `DATABASE_URL` (URL), `NEXT_PUBLIC_SITE_URL` (URL), `NEXT_PUBLIC_HUB_NAME` (default `Ecosystem Hub`), `ADMIN_PASSWORD` (min 8), `SESSION_SECRET` (min 32), `CRON_SECRET` (min 32), `IP_HASH_SALT` (min 16), optional `TELEGRAM_BOT_TOKEN`, `RESEND_API_KEY`, `ALERT_FROM_EMAIL` (default `onboarding@resend.dev`). Export `getServerEnv()` which parses on call and throws in production when `ADMIN_PASSWORD === 'change-me-now'`.

`src/lib/db/client.ts`: `import 'server-only'`; lazy singleton via `globalThis`; `postgres(url, { prepare: false, max: 1, idle_timeout: 20 })`; export `getSql()`.

- [ ] **Step 4: Write types and data functions**

`types.ts` defines the rows and input types. `apps.ts`, `clicks.ts`, `checks.ts`, `settings.ts` use tagged-template SQL with typed generics (`sql<AppRow[]>\`...\``). Map DB snake_case rows to camelCase inputs only where the UI needs them; row types stay snake_case.

`listAppsToCheck(now)` returns apps where `(monitoring_paused_until is null or monitoring_paused_until <= now)` and `(monitor_app or monitor_supabase)`.

`upsertStatus` uses `insert ... on conflict (app_id,target) do update set state = excluded.state, ...`.

`claimHealthRun` executes `select claim_health_run(${seconds}) as claimed` and returns the boolean.

- [ ] **Step 5: Replace test env defaults**

In `tests/setup.ts` remove `SUPABASE_*`; set defaults for `DATABASE_URL=postgres://test:test@localhost:5432/test`, `ADMIN_PASSWORD=test-password`, `SESSION_SECRET=01234567890123456789012345678901`, `CRON_SECRET`, `IP_HASH_SALT`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_HUB_NAME`.

- [ ] **Step 6: Migrate and verify Neon**

Run: `npm run db:migrate && npm run db:check && npm run db:seed && npm run db:check`
Expected: `db-check OK`; the second check confirms the seed did not duplicate.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add Neon schema, migrations and data layer"
```

---

### Task 3: Public hub page

**Files:**
- Create: `src/components/app-card.tsx`, `src/components/hub-grid.tsx`
- Modify: `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css`
- Test: `tests/unit/components/hub-grid.test.tsx`

**Interfaces:**
- Consumes: `PublicApp`, `listVisibleApps()`.
- Produces: `<HubGrid apps={PublicApp[]} />`.

- [ ] **Step 1: Write the failing component test**

`tests/unit/components/hub-grid.test.tsx` asserts:
- a card renders an accessible link named after the app with `href="/api/go/blog"`;
- the description is visible;
- an app without an icon shows the first letter of its name;
- zero apps shows `Chưa có ứng dụng nào`.

Use a `PublicApp` fixture with `icon_url: null`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/unit/components/hub-grid.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `AppCard` and `HubGrid`**

Server-compatible components. Mobile-first Tailwind: 1 column mobile, 2 on `sm`, 3 on `lg`. Each card is one link to `/api/go/<slug>`; plain `<img alt="">` for icons (arbitrary hosts); name, optional description; focus ring and hover. Empty state `Chưa có ứng dụng nào`.

- [ ] **Step 4: Implement the page**

`src/app/page.tsx` is an async server component calling `listVisibleApps()`. Because Cache Components is enabled, wrap the DB-reading part in `<Suspense fallback={...}>` rather than `export const dynamic = 'force-dynamic'`; do not use `use cache` (the list must be fresh). Heading uses `NEXT_PUBLIC_HUB_NAME`. `layout.tsx` sets `lang="vi"`, metadata, viewport, theme color `#4f46e5`.

- [ ] **Step 5: Verify and commit**

Run: `npm test && npm run lint && npm run build`
Expected: PASS; build succeeds with a static shell and streamed list.

```bash
git add -A
git commit -m "feat: add public hub page"
```

---

### Task 4: Redirect endpoint with click tracking

**Files:**
- Create: `src/lib/analytics/click-payload.ts`
- Create: `src/app/api/go/[slug]/route.ts`
- Test: `tests/unit/analytics/click-payload.test.ts`, `tests/unit/api/go.test.ts`

**Interfaces:**
- Consumes: `getVisibleAppBySlug(slug)`, `insertClickEvent(event)`, `getServerEnv()`.
- Produces: `buildClickEvent({ appId, headers, path, now, salt }): NewClickEvent | null` (`null` = bot/skip). `NewClickEvent` = `{ app_id, clicked_at, referrer, user_agent, ip_hash, country }`.

- [ ] **Step 1: Write the failing payload tests**

Assert:
- a Chrome UA returns a 64-char lowercase hex `ip_hash` and `country` from `x-vercel-ip-country`;
- the same IP+UA+salt is stable; a different IP changes the hash;
- `Googlebot/2.1` returns `null`;
- missing `x-forwarded-for` still returns an event (hash of `unknown`);
- `referrer` comes from the `referer` header.

- [ ] **Step 2: Write the failing route tests**

`tests/unit/api/go.test.ts` starts with `// @vitest-environment node`, mocks `@/lib/db/apps` and `@/lib/db/clicks`. Cases:
1. known visible app → 302 to `app.url`, insert called once;
2. unknown slug → 404, no insert;
3. bot UA → 302, no insert;
4. response has `cache-control: no-store`.

Call `GET(new Request(...), { params: Promise.resolve({ slug: 'blog' }) })`.

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- tests/unit/analytics/click-payload.test.ts tests/unit/api/go.test.ts`
Expected: FAIL.

- [ ] **Step 4: Implement the payload builder**

IP = first `x-forwarded-for` value, trimmed, fallback `unknown`. Hash `sha256(ip + '|' + userAgent + '|' + salt)` with `node:crypto`. Bot regex `/bot|crawler|spider|crawl|slurp|bingpreview|facebookexternalhit|headless/i`. Trim referrer/UA to 1000 chars, path to 500.

- [ ] **Step 5: Implement the route**

`runtime = 'nodejs'`, `dynamic = 'force-dynamic'`. Look up the visible app; 404 if absent. Build event; if non-null, `await insertClickEvent` in a try/catch (log and continue) so redirect never depends on DB success. `NextResponse.redirect(app.url, 302)` with `cache-control: no-store`.

- [ ] **Step 6: Verify and commit**

Run: `npm test -- tests/unit/analytics/click-payload.test.ts tests/unit/api/go.test.ts && npm test && npm run lint`
Expected: PASS.

```bash
git add -A
git commit -m "feat: count clicks on redirect"
```

---

### Task 5: Admin password authentication

**Files:**
- Create: `src/lib/auth/admin.ts`
- Create: `src/app/admin/login/page.tsx`, `src/app/admin/login/actions.ts`
- Create: `src/app/admin/(protected)/layout.tsx`
- Create: `src/proxy.ts`
- Test: `tests/unit/auth/admin.test.ts`

**Interfaces:**
- Produces: `verifyPassword(input: string, expected: string): boolean` (SHA-256 + timingSafeEqual, length-independent), `createSessionToken(): Promise<string>`, `verifySessionToken(token: string): Promise<boolean>`, `requireAdmin(): Promise<void>`, `adminGate({ pathname, hasValidSession }): 'allow' | 'login'`.
- Produces actions: `loginAction(formData)`, `logoutAction()`.

- [ ] **Step 1: Write the failing auth tests**

Assert:
- `verifyPassword('secret', 'secret')` is true, wrong/false for different lengths;
- `adminGate({ pathname: '/admin', hasValidSession: false })` → `login`;
- `/admin` with a valid session → `allow`;
- `/admin/login` is always `allow`;
- `/`, `/api/go/x` → `allow`;
- an expired/garbage JWT fails `verifySessionToken` (with `jose` and fixed time).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/auth/admin.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement auth helpers**

Hash both passwords with `createHash('sha256')`, compare with `timingSafeEqual` on equal-length buffers. JWT: `new SignJWT({ role: 'admin' }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('7d').sign(secret)`; verify with `jwtVerify`.

`requireAdmin()` reads `cookies()` (async), verifies `hub_session`; redirects to `/admin/login` when invalid. `adminGate` is pure for tests. `src/proxy.ts` exports `proxy(request)` (Next 16) and `config.matcher = ['/admin/:path*']`; if path is `/admin/login`, allow; otherwise check cookie and redirect. Do not rely on proxy alone; the protected layout also calls `requireAdmin()`.

- [ ] **Step 4: Implement login, logout, and layout**

Login page: password input, button `Đăng nhập`, Vietnamese error. `loginAction`: validate with Zod (min 1), call `verifyPassword`, set cookie with `httpOnly`, `sameSite: 'lax'`, `secure: process.env.NODE_ENV === 'production'`, `path: '/'`, `maxAge: 604800`; redirect `/admin`. Wrong password → generic `Sai mật khẩu`. `logoutAction` deletes the cookie and redirects to `/admin/login`.

`(protected)/layout.tsx` calls `requireAdmin()` and renders nav (`Tổng quan`, `Ứng dụng`, `Cài đặt`) + logout form.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- tests/unit/auth/admin.test.ts && npm test && npm run lint && npm run build`
Expected: PASS.

```bash
git add -A
git commit -m "feat: add admin password auth"
```

---

### Task 6: Admin app management (CRUD, reorder, pause)

**Files:**
- Modify: `src/lib/validation/app.ts` (add `parseAppForm`)
- Create: `src/app/admin/(protected)/apps/actions.ts`
- Create: `src/app/admin/(protected)/apps/page.tsx`, `new/page.tsx`, `[id]/edit/page.tsx`
- Create: `src/components/admin/apps-table.tsx`, `status-badge.tsx`
- Test: `tests/unit/admin/apps-actions.test.ts`

**Interfaces:**
- Consumes: app data functions, `appInputSchema`, `requireAdmin()`.
- Produces: `parseAppForm(formData): { success: true; input: AppInput } | { success: false; errors: Record<string, string[]> }`, `pauseUntil(minutes: 30 | 60, now: Date): string`.
- Produces actions: `createAppAction`, `updateAppAction`, `deleteAppAction`, `toggleVisibilityAction`, `toggleMonitorAction`, `pauseMonitoringAction`, `resumeMonitoringAction`, `reorderAppsAction`.

- [ ] **Step 1: Write the failing tests**

Assert:
- `parseAppForm` maps FormData to camelCase, defaults status 200/timeout 5000, reports a slug error for `Blog App`;
- empty `description`, `iconUrl`, `supabaseRef` become `undefined`;
- `monitorApp`/`monitorSupabase` checkboxes map to booleans (unchecked = false);
- `pauseUntil(30, new Date('2026-11-18T00:00:00Z'))` returns `'2026-11-18T00:30:00.000Z'`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/admin/apps-actions.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement parsing and actions**

Add `'use server'` to `actions.ts`. Each action calls `requireAdmin()`, validates, calls the DB function, then `revalidatePath('/admin/apps')` and `revalidatePath('/admin')`. Delete cascades clicks/checks/incidents. Pause sets `monitoring_paused_until`; resume sets null.

- [ ] **Step 4: Build the admin list**

Page fetches `listAllApps()` and `getStatuses()`. Table rows show name/slug, visibility and monitor toggles, pause buttons (`Tạm dừng 30 phút`, `Tạm dừng 60 phút`, `Tiếp tục`), edit, delete with confirm. `apps-table.tsx` is a client component using `@dnd-kit` sortable rows; on drop calls `reorderAppsAction(ids)`. Add `Thêm ứng dụng` and empty state.

- [ ] **Step 5: Build new/edit forms**

Fields: name, slug (hint lowercase/numbers/hyphens), description, URL, icon URL, Supabase ref (hint `https://<ref>.supabase.co`), optional Supabase health URL override, expected status, timeout, checkboxes for app/Supabase monitoring. Show field errors. Save redirects to `/admin/apps`.

- [ ] **Step 6: Verify and commit**

Run: `npm test -- tests/unit/admin/apps-actions.test.ts && npm test && npm run lint && npm run build`
Expected: PASS.

```bash
git add -A
git commit -m "feat: add admin app management"
```

---

### Task 7: Analytics helpers + admin overview dashboard

**Files:**
- Create: `src/lib/analytics/stats.ts`
- Create: `src/components/charts/click-chart.tsx`
- Modify: `src/app/admin/(protected)/page.tsx`
- Test: `tests/unit/analytics/stats.test.ts`

**Interfaces:**
- Produces: `dayKey(date: Date, tz: string): string`, `summarizeClicks(events, now, tz): { today; last7; last30; unique30 }`, `dailyClickSeries(events, days, now, tz): { day; count }[]`, `clickCountsByApp(events): { appId; count }[]`, `uptimePercent(checks): number | null`, `averageLatency(checks): number | null`.

- [ ] **Step 1: Write the failing stats tests**

- `2026-11-17T16:59:00Z` is day `2026-11-17`; `17:00Z` is `2026-11-18` in VN.
- `today`/`last7` use VN day boundaries; `dailyClickSeries` fills zero days and returns exactly `days` entries.
- `unique30` counts distinct `ip_hash`.
- `uptimePercent` = 50 for 1 ok of 2, null for zero.
- `averageLatency` rounds and returns null for zero.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/analytics/stats.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement pure helpers**

Use `Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' })`; compare timestamps, not strings.

- [ ] **Step 4: Build the overview page**

Fetch `listAllApps()`, `listClicksSince(now − 30d)`, `listChecksSince(now − 24h)`, `getStatuses()`. Render KPI cards (`Lượt bấm hôm nay`, `7 ngày`, `30 ngày`, `Khách riêng 30 ngày`, `Ứng dụng`, `Đang lỗi`, `Độ trễ TB 24h`), a 30-day click chart, and a per-app table with two status badges (`App`, `Supabase`), last latency, and a pause shortcut. Staleness banner if `max(last_check_at)` > 10 minutes or no checks. Vietnamese labels, VN dates.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- tests/unit/analytics/stats.test.ts && npm test && npm run lint && npm run build`
Expected: PASS.

```bash
git add -A
git commit -m "feat: add analytics helpers and admin overview"
```

---

### Task 8: Health-check engine for app + Supabase targets, cron endpoint

**Files:**
- Create: `src/lib/health/targets.ts`, `evaluate.ts`, `ping.ts`, `runner.ts`, `deps.ts`
- Create: `src/lib/auth/cron.ts`
- Create: `src/app/api/cron/health/route.ts`
- Test: `tests/unit/health/targets.test.ts`, `evaluate.test.ts`, `ping.test.ts`, `runner.test.ts`, `tests/unit/api/cron-health.test.ts`

**Interfaces:**
- Produces `type CheckResult = { ok; statusCode; latencyMs; error }`, `type HealthTarget = { appId; slug; name; target: Target; url }`, `type HealthAlert = { kind: 'down'|'recovered'|'slow'|'down-reminder'; app: AppRow; target: Target; check: CheckResult; at: Date; downtimeMs?: number }`.
- Produces `targetsForApp(app: AppRow, now: Date): HealthTarget[]`.
- Produces `evaluateCheck({ previous, check, settings, now })` returning `{ status: Omit<AppStatusRow,'app_id'|'target'>; incident: 'open'|'close'|null; alert: kind|null }`.
- Produces `pingTarget(target, fetchImpl?): Promise<CheckResult>`.
- Produces `runHealthChecks(deps): Promise<{ checked: number; skipped: boolean }>` with `HealthDeps`:
  ```ts
  type HealthDeps = {
    listAppsToCheck(now: Date): Promise<AppRow[]>;
    getStatuses(): Promise<AppStatusRow[]>;
    insertCheck(row: NewCheck): Promise<void>;
    upsertStatus(row: AppStatusRow): Promise<void>;
    openIncident(row: NewIncident): Promise<void>;
    closeOpenIncident(appId: string, target: Target, at: Date): Promise<void>;
    getSettings(): Promise<SettingsRow>;
    notify(alert: HealthAlert): Promise<void>;
    now(): Date;
    ping(target: HealthTarget): Promise<CheckResult>;
  };
  ```
- Produces `verifyCronSecret(header, secret): boolean` in `src/lib/auth/cron.ts`.

- [ ] **Step 1: Write failing target tests**

- app monitoring on → app target with `app.url`;
- Supabase monitoring on + `supabase_ref` → `https://<ref>.supabase.co/auth/v1/health`;
- explicit `supabase_health_url` wins;
- paused app, disabled target, or missing ref → no target;
- both flags on → exactly 2 targets.

- [ ] **Step 2: Write failing evaluator tests**

1. unknown + 1 failure → unknown, failures 1, no alert.
2. up + 2 failures → up, no alert.
3. up + 3 failures → down, incident open, alert down, `last_down_at` set.
4. down + another failure with repeat 0 → no incident/alert.
5. down + ok → up, incident close, recovered alert.
6. recovery with `notify_recovery=false` → close, no alert.
7. ok + latency 2500 three times → slow on third; fourth within 1h no alert; next after 61 min → alert.
8. down 61 min with repeat 60 → down-reminder; repeat 0 disables.
9. failure resets `consecutive_slow`.

- [ ] **Step 3: Write failing ping/runner/route tests**

Ping: 200 → ok; 503 → not ok; network throw → error; injected fetch that aborts at 10ms with timeout 10 → `timeout`. Runner: paused app never pinged; repeated evaluation opens one incident/alert per transition; a timeout is persisted and run completes; `releaseHealthRun` called after a throw; 2 targets per app. Route: wrong/missing secret → 401; claim false → 202 `{skipped:true}`; valid → 200 `{checked:n}`; secret comparison length-independent. Use `// @vitest-environment node`; mock `deps` and `@/lib/db/settings`.

- [ ] **Step 4: Run tests to verify they fail**

Run: `npm test -- tests/unit/health tests/unit/api/cron-health.test.ts`
Expected: FAIL.

- [ ] **Step 5: Implement targets, evaluator, ping, runner, deps, route**

Rules exactly as the spec. `upsertStatus` receives `{ ...evaluation.status, app_id, target }`. Runner builds `HealthAlert` with target; recovery `downtimeMs = now - previous.last_down_at`. Wrap each target's persistence in try/catch so one failure does not abort others. In this task `deps.notify` is a no-op placeholder; Task 9 wires `deliverAlert`.

Route: `runtime='nodejs'`, `dynamic='force-dynamic'`, `maxDuration=60`. Verify secret (SHA-256 + timingSafeEqual), claim, run, `finally release`. Return 500 when persistence fails so cron-job.org sends failure email.

- [ ] **Step 6: Verify and commit**

Run: `npm test -- tests/unit/health tests/unit/api/cron-health.test.ts && npm test && npm run lint && npm run build`
Expected: PASS.

```bash
git add -A
git commit -m "feat: add app and Supabase health checks"
```

---

### Task 9: Alert delivery + settings page

**Files:**
- Create: `src/lib/health/alerts.ts`, `src/lib/validation/settings.ts`, `src/lib/format.ts`
- Create: `src/app/admin/(protected)/settings/page.tsx`, `actions.ts`
- Modify: `src/lib/health/deps.ts` to use `deliverAlert`
- Test: `tests/unit/health/alerts.test.ts`, `tests/unit/validation/settings.test.ts`

**Interfaces:**
- Produces `formatDateTime(iso): string` (VN `dd/MM/yyyy HH:mm`).
- Produces `formatAlert(alert, siteUrl): { subject; text }`, `deliverAlert(alert, settings, env): Promise<{ telegram; email }>` with `env = { telegramBotToken?; resendApiKey?; alertFromEmail }`.
- Produces `settingsInputSchema`, `parseSettingsForm`.
- Actions: `saveSettingsAction`, `sendTestAlertAction`.

- [ ] **Step 1: Write failing alert tests**

- down text contains app name, target label (`Ứng dụng`/`Supabase`), `đang chết`, status/error, latency, VN time, `${siteUrl}/admin/apps/${id}`;
- recovered contains `đã hoạt động lại` and downtime;
- slow contains `phản hồi chậm`;
- missing chat id + recipients → both `skipped`;
- Telegram fetch URL/body correct; thrown fetch → `failed`, no throw;
- missing Resend key/recipients → email `skipped`; no `parse_mode` sent.

- [ ] **Step 2: Write failing settings tests**

Coerce strings; defaults 3/2000/0; reject threshold 0/11 and invalid email; split recipients on comma/newline, trim/lowercase.

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- tests/unit/health/alerts.test.ts tests/unit/validation/settings.test.ts`
Expected: FAIL.

- [ ] **Step 4: Implement alerts, settings, format**

`formatDateTime` uses `formatToParts` with `Asia/Ho_Chi_Minh`. Telegram plain text, no Markdown. `deliverAlert` uses `Promise.allSettled`, logs failures, never throws. Resend `from = ALERT_FROM_EMAIL`. Wire `deps.notify`.

- [ ] **Step 5: Build settings page**

`'use server'` actions. Fields: chat id, recipients, failure threshold, slow threshold, alerts enabled, notify recovery, repeat minutes. Buttons `Lưu cài đặt`, `Gửi thử`; success banner `?saved=1`; test result per channel. All actions `requireAdmin()`.

- [ ] **Step 6: Verify and commit**

Run: `npm test -- tests/unit/health/alerts.test.ts tests/unit/validation/settings.test.ts && npm test && npm run lint && npm run build`
Expected: PASS.

```bash
git add -A
git commit -m "feat: add alert delivery and settings"
```

---

### Task 10: App detail page

**Files:**
- Modify: `src/lib/format.ts` (add `formatUptime`, `formatLatency`)
- Create: `src/app/admin/(protected)/apps/[id]/page.tsx`
- Create: `src/components/charts/latency-chart.tsx`
- Test: `tests/unit/format.test.ts`

**Interfaces:**
- Produces `formatUptime(null) = '—'`, `formatUptime(99.94) = '99.9%'`; `formatLatency(null) = '—'`, `formatLatency(123.4) = '123 ms'`.

- [ ] **Step 1: Write failing format tests**

Null, rounding, and `2026-11-18T07:05:00Z → 18/11/2026 14:05`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/format.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement helpers and page**

Detail page fetches app (404 if missing), 30-day clicks, 7-day checks, recent 20 checks, incidents, statuses. Shows a section per target (`Ứng dụng`, `Supabase`): status, uptime 24h/7d, avg latency, latency chart, recent checks table (`Thời điểm`, `Trạng thái`, `HTTP`, `Độ trễ`, `Lỗi`), incident history. Link back.

- [ ] **Step 4: Verify and commit**

Run: `npm test -- tests/unit/format.test.ts && npm test && npm run lint && npm run build`
Expected: PASS.

```bash
git add -A
git commit -m "feat: add app detail analytics page"
```

---

### Task 11: PWA (manifest, service worker, offline fallback, icons)

**Files:**
- Create: `src/app/manifest.ts`, `src/app/offline/page.tsx`, `src/app/sw.ts`
- Modify: `next.config.ts`, `src/app/layout.tsx`
- Create: `scripts/generate-icons.mjs`, `public/icons/*.png`
- Test: `tests/unit/manifest.test.ts`

**Interfaces:**
- Manifest: name/short_name from `NEXT_PUBLIC_HUB_NAME`, `start_url: '/'`, `display: 'standalone'`, `lang: 'vi'`, `theme_color: '#4f46e5'`, background `'#0f172a'`, 192/512 + maskable icons.

- [ ] **Step 1: Write failing manifest test**

Assert the values above and every icon has `sizes` and `type: 'image/png'`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/manifest.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement manifest, icons, service worker**

Create `public/icons/icon.svg` (rounded square + `H`), generate PNGs with `sharp`. Wrap `next.config.ts` with `withSerwistInit({ swSrc: 'src/app/sw.ts', swDest: 'public/sw.js', cacheOnNavigation: true, reloadOnOnline: true, disable: process.env.NODE_ENV === 'development' })`. `sw.ts` uses `defaultCache`, `skipWaiting`, `clientsClaim`, `/offline` document fallback. Gitignore `public/sw.js`. If Serwist is incompatible with Next 16, use Next's PWA guide (register a service worker from a client component) and record a ledger ruling.

- [ ] **Step 4: Build and verify**

Run: `npm test -- tests/unit/manifest.test.ts && npm run build`
Expected: build succeeds; `public/sw.js` generated. Manual: Chrome DevTools → Application → Service Workers activated; offline reload shows cached hub or `/offline`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add PWA manifest and offline support"
```

---

### Task 12: Scheduler setup, cleanup, and runbook

**Files:**
- Create: `docs/runbook.md`
- Modify: `src/app/api/cron/health/route.ts` (only if cleanup needs wiring)
- Test: manual verification steps below

**Interfaces:**
- Health endpoint already cleans checks >30 days and clicks >90 days once per 24h (`settings.last_cleanup_at`).

- [ ] **Step 1: Wire/verify cleanup**

After a successful run, if `last_cleanup_at` is null or older than 24h: delete checks older than 30 days and clicks older than 90 days; update `last_cleanup_at`. Failures must not fail the health run.

- [ ] **Step 2: Configure cron-job.org**

Create a free job: POST `https://<site>/api/cron/health`, every 5 minutes, header `x-cron-secret: <CRON_SECRET>`, enable failure email notifications. Run it once manually and confirm `checks` grows.

- [ ] **Step 3: Write runbook**

`docs/runbook.md` in Vietnamese: Neon project/role, `.env.local`, `db:migrate`, `db:seed`, Vercel env, cron-job.org, Telegram bot/chat id, Resend domain/test sender, first login, adding apps (Supabase ref), pausing before deploy, acceptance checklist, how to rotate the leaked Neon password and use a dedicated role.

- [ ] **Step 4: Verify the staleness path**

Stop the cron for 15 minutes; `/admin` shows the amber banner; resume; banner clears. Record the result in the runbook.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "docs: add scheduler setup and runbook"
```

---

### Task 13: Deploy to Vercel and run acceptance

**Files:**
- Modify: `docs/runbook.md` with deployed URL/results

- [ ] **Step 1: Deploy**

Create the Vercel project, add every env var (real values; `ADMIN_PASSWORD` not `change-me-now`), set `NEXT_PUBLIC_SITE_URL` to the deployed URL, deploy. Run migrations against Neon if not already applied.

- [ ] **Step 2: Add real apps**

Through `/admin/apps`, add the 5–10 apps with name, slug, URL, icon URL, Supabase ref, and both monitors enabled as appropriate. Confirm each appears on `/`.

- [ ] **Step 3: Acceptance checklist**

Record results:
1. Hub loads on phone; tap lands on app; click appears in `/admin` after refresh.
2. PWA installs; offline reload shows cached hub or `/offline`.
3. Temporary app pointing at `https://httpstat.us/503` → Telegram + email after ~15–20 min; recovery alert after fixing.
4. Temporary app with a valid Supabase ref → Supabase badge up; break the ref → Supabase down alert (app target still up).
5. Pause 30 minutes, deploy an app, confirm no alert; checks resume.
6. Stop cron 15+ min → banner; restore; banner clears.
7. Add app in admin → appears on hub immediately (no deploy).

- [ ] **Step 4: Final verification**

Run: `npm test && npm run lint && npm run build`
Expected: all green.

```bash
git add -A
git commit -m "docs: record deployment and acceptance results"
```
