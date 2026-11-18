# Ecosystem Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public PWA hub listing 5–10 owned web apps with click tracking, plus a private admin dashboard for click analytics, uptime/latency monitoring, and Telegram/email alerts.

**Architecture:** One Next.js App Router application on Vercel. Public hub and admin pages are server components; click counting and health-check execution are Next.js route handlers. Supabase provides Postgres, magic-link auth, and `pg_cron`/`pg_net` scheduling. A Supabase-side watchdog alerts via Telegram if the monitor itself stops running.

**Tech Stack:** Next.js (latest stable, App Router, TypeScript strict), React, Tailwind CSS, Supabase (`@supabase/supabase-js`, `@supabase/ssr`), Recharts, `@serwist/next`, Resend, Vitest + Testing Library, `@dnd-kit/*`, Zod.

**Spec:** `docs/superpowers/specs/2026-11-18-ecosystem-hub-design.md`

## Global Constraints

- Only Next.js runs application code (Vercel); Supabase is database/auth/scheduler only. No Edge Functions, no external uptime service.
- UI copy is Vietnamese; all day bucketing uses `Asia/Ho_Chi_Minh`.
- Monitoring defaults: ping every 60s, down after 3 consecutive failures, slow when latency > 2000ms for 3 consecutive checks, slow alert at most once per hour per app, repeat-down reminders off (`repeat_reminder_minutes = 0`).
- 5–10 apps, one admin. Free tiers only: Vercel Hobby (personal, non-commercial), Supabase Free, Resend Free, Telegram.
- RLS is deny-all for `anon`; `SUPABASE_SERVICE_ROLE_KEY` never reaches the client. Cron endpoints authenticate with a timing-safe `CRON_SECRET` check.
- App icons are pasted URLs in v1. Owner clicks count as normal clicks in v1.
- Secrets live in Vercel env; the Telegram bot token is duplicated in Supabase Vault for the watchdog. Never commit secrets.
- Node runtime for route handlers (`export const runtime = 'nodejs'`). Health cron route: `maxDuration = 60`.
- Every task ends with a passing test run and a commit.

## Review Focus

- A redirect slug that does not exist or is hidden must return 404 and record no click (Task 4 test).
- A bot/crawler request must still redirect but never be counted (Task 4 test).
- An app that times out or hangs must be recorded as a failed check with an error, and the run must finish (Task 8 test).
- An app paused for deploy must be skipped by checks and produce no alert; it resumes after the pause (Task 8 test).
- Repeated failures and overlapping runs must produce exactly one open incident and one down alert, then exactly one recovery (Task 8 tests; DB partial unique index in Task 2).

---

## File Structure

```
src/
  app/
    layout.tsx                    # root layout, metadata, PWA
    page.tsx                      # public hub
    offline/page.tsx              # PWA offline fallback
    manifest.ts                   # web app manifest
    sw.ts                         # Serwist service worker source
    auth/callback/route.ts        # Supabase magic-link callback
    admin/
      login/page.tsx              # public login (outside protected layout)
      (protected)/
        layout.tsx                # guarded admin shell
        page.tsx                  # overview
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
    admin/apps-table.tsx          # client dnd list
    admin/status-badge.tsx
    charts/click-chart.tsx
    charts/latency-chart.tsx
  lib/
    env.ts
    auth/admin.ts
    supabase/admin.ts             # service-role client
    supabase/server.ts            # cookie-bound auth client
    supabase/middleware.ts
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
    health/runner.ts
    health/alerts.ts
    health/deps.ts
    health/schedule.ts
  middleware.ts
supabase/
  migrations/20261118000000_init.sql
  migrations/20261118000100_rls.sql
  migrations/20261118000200_cron.sql
  seed.sql
scripts/
  db-check.mjs
  generate-icons.mjs
tests/
  setup.ts
  unit/validation/app.test.ts
  unit/auth/admin.test.ts
  unit/components/hub-grid.test.tsx
  unit/analytics/click-payload.test.ts
  unit/api/go.test.ts
  unit/analytics/stats.test.ts
  unit/health/evaluate.test.ts
  unit/health/ping.test.ts
  unit/health/runner.test.ts
  unit/api/cron-health.test.ts
  unit/health/alerts.test.ts
  unit/validation/settings.test.ts
  unit/admin/apps-actions.test.ts
docs/
  runbook.md
```

---

### Task 1: Scaffold Next.js + Vitest + app validation schema

**Files:**
- Create: project scaffold (package.json, tsconfig, `src/app/*`, Tailwind config)
- Create: `vitest.config.ts`, `tests/setup.ts`
- Create: `src/lib/validation/app.ts`
- Test: `tests/unit/validation/app.test.ts`

**Interfaces:**
- Produces: `appInputSchema: ZodSchema<AppInput>`, `type AppInput = { name: string; slug: string; description?: string; url: string; iconUrl?: string; healthUrl?: string; expectedStatus: number; timeoutMs: number }`

- [ ] **Step 1: Scaffold the app and initialize git**

The repo root already contains `docs/`. Scaffold in a temp directory, copy everything except `.git` into the repo root, then initialize git:

```bash
TMP=$(mktemp -d)
npx create-next-app@latest "$TMP/hub" --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
rsync -a --exclude .git "$TMP/hub/" ./
rm -rf "$TMP"
git init
git add -A
git commit -m "chore: scaffold Next.js app"
```

- [ ] **Step 2: Install dependencies**

```bash
npm i zod @supabase/supabase-js @supabase/ssr recharts resend @serwist/next serwist @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities server-only
npm i -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom vite-tsconfig-paths sharp
```

- [ ] **Step 3: Configure Vitest and test env defaults**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
```

Create `tests/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';

process.env.SUPABASE_URL ??= 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'service-role-key';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'anon-key';
process.env.NEXT_PUBLIC_SITE_URL ??= 'https://hub.test';
process.env.CRON_SECRET ??= '01234567890123456789012345678901';
process.env.IP_HASH_SALT ??= 'test-salt-0123456789';
process.env.ADMIN_EMAILS ??= 'owner@example.com';
process.env.NEXT_PUBLIC_HUB_NAME ??= 'Ecosystem Hub';
```

Add scripts to `package.json`: `"test": "vitest run"`, `"test:watch": "vitest"`, `"db:check": "node --env-file=.env.local scripts/db-check.mjs"`.

- [ ] **Step 4: Write the failing schema test**

Create `tests/unit/validation/app.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { appInputSchema } from '@/lib/validation/app';

const base = { name: 'Blog', slug: 'blog', url: 'https://blog.example.com' };

describe('appInputSchema', () => {
  it('accepts a minimal app and applies defaults', () => {
    const parsed = appInputSchema.parse(base);
    expect(parsed.expectedStatus).toBe(200);
    expect(parsed.timeoutMs).toBe(5000);
    expect(parsed.description).toBeUndefined();
    expect(parsed.iconUrl).toBeUndefined();
  });

  it('trims the name', () => {
    expect(appInputSchema.parse({ ...base, name: '  Blog  ' }).name).toBe('Blog');
  });

  it.each(['Blog App', 'blog_app', '-blog', 'blog-'])('rejects invalid slug %s', (slug) => {
    expect(appInputSchema.safeParse({ ...base, slug }).success).toBe(false);
  });

  it('rejects an invalid url', () => {
    expect(appInputSchema.safeParse({ ...base, url: 'nope' }).success).toBe(false);
  });

  it('rejects timeout outside 1000..30000', () => {
    expect(appInputSchema.safeParse({ ...base, timeoutMs: 500 }).success).toBe(false);
  });
});
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `npm test -- tests/unit/validation/app.test.ts`
Expected: FAIL — cannot resolve `@/lib/validation/app`.

- [ ] **Step 6: Implement the schema**

Create `src/lib/validation/app.ts`. Use a `blankToUndefined` preprocessor for optional text/URL fields, trim the name, and enforce slug regex `^[a-z0-9]+(?:-[a-z0-9]+)*$`. Export `AppInput = z.infer<typeof appInputSchema>`. Defaults: `expectedStatus` 200, `timeoutMs` 5000. Limits: name 1–60 chars, description ≤160, expected status 100–599, timeout 1000–30000.

- [ ] **Step 7: Verify tests, lint, build and commit**

Run: `npm test -- tests/unit/validation/app.test.ts && npm run lint && npm run build`
Expected: all pass; build succeeds.

```bash
git add -A
git commit -m "feat: add app input validation schema"
```

---

### Task 2: Supabase schema, clients, and data access layer

**Files:**
- Create: `supabase/migrations/20261118000000_init.sql`
- Create: `supabase/migrations/20261118000100_rls.sql`
- Create: `supabase/seed.sql`
- Create: `src/lib/db/types.ts`
- Create: `src/lib/db/apps.ts`, `clicks.ts`, `checks.ts`, `settings.ts`
- Create: `src/lib/supabase/admin.ts`, `server.ts`, `middleware.ts`
- Create: `src/lib/env.ts`
- Create: `scripts/db-check.mjs`
- Create: `.env.example`

**Interfaces:**
- Produces: `AppRow`, `PublicApp`, `ClickEventRow`, `CheckRow`, `AppStatusRow`, `SettingsRow`, `SettingsInput`, `IncidentRow`; input types `NewClickEvent` (`{ app_id, clicked_at, referrer, user_agent, ip_hash, country, path }`) and `NewCheck` (`{ app_id, checked_at, ok, status_code, latency_ms, error }`).
- Produces: `getAdminClient()`, `createAuthServerClient()`, `getServerEnv()`.
- Produces data functions:
  - apps: `listVisibleApps(): Promise<PublicApp[]>`, `listAllApps(): Promise<AppRow[]>`, `getAppById(id)`, `getVisibleAppBySlug(slug): Promise<PublicApp | null>`, `createApp(input)`, `updateApp(id, input)`, `deleteApp(id)`, `setAppVisibility(id, visible)`, `setAppMonitorEnabled(id, enabled)`, `pauseAppMonitoring(id, until)`, `reorderApps(ids)`, `listAppsToCheck(now)`.
  - clicks: `insertClickEvent(event)`, `listClicksSince(since)`.
  - checks: `insertCheck(row)`, `listChecksSince(since)`, `listRecentChecks(appId, limit)`, `getStatus(appId)`, `listStatuses()`, `upsertStatus(row)`, `openIncident(appId, at, error)`, `closeOpenIncident(appId, at)`, `listIncidents(appId, limit)`.
  - settings: `getSettings()`, `updateSettings(input)`, `claimHealthRun(staleAfterSeconds = 30)`, `releaseHealthRun()`.

- [ ] **Step 1: Write the database schema migration**

Create `supabase/migrations/20261118000000_init.sql` with exactly these tables (snake_case columns as listed in the spec):

- `apps`: id uuid PK default `gen_random_uuid()`, slug unique with regex check, name 1–60, description, url, icon_url, sort_order int default 0, is_visible bool default true, monitor_enabled bool default true, monitoring_paused_until timestamptz, health_url, expected_status int default 200, timeout_ms int default 5000, created_at/updated_at timestamptz default now().
- `click_events`: id bigint identity PK, app_id FK cascade, clicked_at default now(), referrer, user_agent, ip_hash not null, country, path.
- `checks`: id bigint identity PK, app_id FK cascade, checked_at default now(), ok bool, status_code int, latency_ms int, error.
- `app_status`: app_id PK FK cascade, state text check in `('up','down','unknown')` default `'unknown'`, consecutive_failures int default 0, consecutive_slow int default 0, last_check_at, last_ok_at, last_down_at, last_down_alert_at, last_slow_alert_at.
- `incidents`: id bigint identity PK, app_id FK cascade, started_at default now(), resolved_at, first_error. Add `create unique index incidents_one_open_per_app on incidents(app_id) where resolved_at is null;`.
- `settings`: id smallint PK check (id = 1), telegram_chat_id, email_recipients text[] default `'{}'`, failure_threshold int default 3, slow_threshold_ms int default 2000, alerts_enabled bool default true, notify_recovery bool default true, repeat_reminder_minutes int default 0, health_run_locked_at timestamptz, updated_at. Insert the singleton row with `on conflict do nothing`.
- `ops_alerts`: key text PK, last_sent_at timestamptz not null.

Add indexes: `click_events(app_id, clicked_at desc)`, `click_events(clicked_at desc)`, `checks(app_id, checked_at desc)`, `checks(checked_at desc)`, `incidents(app_id, started_at desc)`.

Add a `touch_updated_at()` trigger on `apps` and `settings`.

Add `claim_health_run(stale_after_seconds int default 30) returns boolean` as a single atomic `update ... where health_run_locked_at is null or < now() - interval ... returning` wrapped in `select exists(...)`. Revoke execute from `anon, authenticated`.

- [ ] **Step 2: Write RLS migration**

In `20261118000100_rls.sql`, `alter table ... enable row level security` for all seven tables. Add **no policies** (service role bypasses RLS; everyone else is denied).

- [ ] **Step 3: Write dev seed**

`supabase/seed.sql` inserts two placeholder apps (`blog`, `shop`) only when the table is empty, plus a default settings row if missing.

- [ ] **Step 4: Write env validation and clients**

`src/lib/env.ts`: Zod schema for `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, `CRON_SECRET` (min 32), `IP_HASH_SALT` (min 16), `ADMIN_EMAILS`, optional `TELEGRAM_BOT_TOKEN`, `RESEND_API_KEY`, `ALERT_FROM_EMAIL` (default `onboarding@resend.dev`), `NEXT_PUBLIC_HUB_NAME` (default `Ecosystem Hub`). Export `getServerEnv()` that parses `process.env` on call (not at module load).

`src/lib/supabase/admin.ts`: `import 'server-only'`; lazy singleton `createClient(url, serviceRoleKey, { auth: { persistSession: false } })`.

`src/lib/supabase/server.ts`: cookie-bound `createServerClient` using `next/headers` for auth flows.

`src/lib/supabase/middleware.ts`: standard `updateSession(request)` that refreshes Supabase cookies and returns `{ response, user }`.

`.env.example` lists every variable with a placeholder and a comment that `.env.local` is gitignored.

- [ ] **Step 5: Write typed data functions**

`src/lib/db/types.ts` defines the row types, `PublicApp` (`Pick<AppRow, 'id'|'slug'|'name'|'description'|'url'|'icon_url'>`), and `SettingsInput` (`{ telegramChatId?: string; emailRecipients: string[]; failureThreshold: number; slowThresholdMs: number; alertsEnabled: boolean; notifyRecovery: boolean; repeatReminderMinutes: number }`). Every function in the Interfaces block goes in its module, uses `getAdminClient()`, and returns typed rows (`.returns<AppRow[]>()`).

`listAppsToCheck(now)` filters `monitor_enabled = true` and `(monitoring_paused_until is null or monitoring_paused_until <= now)`, ordered by `sort_order`.

`claimHealthRun` calls `.rpc('claim_health_run', { stale_after_seconds })`; `releaseHealthRun()` sets `health_run_locked_at = null`.

- [ ] **Step 6: Write the schema check script**

`scripts/db-check.mjs` reads `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from env, then:
1. Service client selects `id` from each table with `limit(1)` — fails loudly on a missing table.
2. Asserts `settings` has the singleton row.
3. Anon client selects `id` from `apps` — expects zero rows (RLS denying reads).

- [ ] **Step 7: Apply to Supabase and verify**

Create/choose the Supabase project, then either run `npx supabase link --project-ref <ref> && npx supabase db push`, or paste both migration files into the SQL editor in order. Put real values in `.env.local`, then run `npm run db:check`.
Expected: `db-check` prints OK for every table and confirms anon sees zero apps.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add Supabase schema, clients and data layer"
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

Create `tests/unit/components/hub-grid.test.tsx`. Assert:
- a card renders an accessible link named after the app with `href="/api/go/blog"`;
- the description is visible;
- an app without an icon shows the first letter of its name;
- zero apps shows `Chưa có ứng dụng nào`.

```tsx
render(<HubGrid apps={[{ id: '1', slug: 'blog', name: 'Blog', description: 'Ghi chép', url: 'https://blog.example.com', icon_url: null }]} />);
expect(screen.getByRole('link', { name: /Blog/ })).toHaveAttribute('href', '/api/go/blog');
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/unit/components/hub-grid.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `AppCard` and `HubGrid`**

Server-compatible components (no client hooks). Mobile-first Tailwind: one column on mobile, 2 on `sm`, 3 on `lg`. Each card is a single link to `/api/go/<slug>`; render the icon as a plain `<img alt="">` (icon URLs are arbitrary hosts, so `next/image` is not used), name, optional description, focus ring, hover state. Use `NEXT_PUBLIC_HUB_NAME` as the page title.

- [ ] **Step 4: Implement the page**

`src/app/page.tsx`: `export const dynamic = 'force-dynamic'`; `const apps = await listVisibleApps();` render a centered container, heading, short subtitle, `<HubGrid apps={apps} />`. `layout.tsx` sets Vietnamese `lang`, the hub name metadata, viewport, and theme color `#4f46e5`.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- tests/unit/components/hub-grid.test.tsx && npm run lint && npm run build`
Expected: PASS and a successful build.

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
- Produces: `buildClickEvent(input: { appId: string; headers: Headers; path: string; now: Date; salt: string }): NewClickEvent | null` (`null` means bot/skip). `NewClickEvent` includes `app_id`, `clicked_at`, `referrer`, `user_agent`, `ip_hash`, `country`, `path`.

- [ ] **Step 1: Write the failing payload tests**

`click-payload.test.ts` asserts:
- a normal Chrome UA returns an event with a 64-char lowercase hex `ip_hash` and `country` from `x-vercel-ip-country`;
- the same IP+UA+salt always produces the same hash, and a different IP produces a different hash;
- `Googlebot/2.1` returns `null`;
- a missing `x-forwarded-for` still returns an event (hash of `unknown`);
- `referrer` comes from the `referer` header.

- [ ] **Step 2: Write the failing route tests**

`tests/unit/api/go.test.ts` starts with `// @vitest-environment node` and mocks `@/lib/db/apps` and `@/lib/db/clicks`. Cases:
1. known visible app → 302 to `app.url`, `insertClickEvent` called once.
2. unknown slug → 404, no insert.
3. bot UA → 302, no insert.
4. response has `cache-control: no-store`.

Call the handler as `GET(new Request(...), { params: Promise.resolve({ slug: 'blog' }) })`.

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- tests/unit/analytics/click-payload.test.ts tests/unit/api/go.test.ts`
Expected: FAIL — modules missing.

- [ ] **Step 4: Implement the payload builder**

IP = first value of `x-forwarded-for` split on comma, trimmed; fallback `unknown`. Hash `sha256(ip + '|' + userAgent + '|' + salt)` with `node:crypto`. Bot regex: `/bot|crawler|spider|crawl|slurp|bingpreview|facebookexternalhit|headless/i`. Trim referrer/user-agent to 1000 chars. `path` is the input value (the route passes `new URL(request.url).pathname`), truncated to 500 chars.

- [ ] **Step 5: Implement the route handler**

`export const runtime = 'nodejs'` and `export const dynamic = 'force-dynamic'`. Look up the visible app; if absent return `new NextResponse('Not found', { status: 404 })`. Build the event; if non-null, insert it and swallow/log insert errors so the redirect still works. Return `NextResponse.redirect(app.url, 302)` with `cache-control: no-store`. Do not add UTM parameters.

- [ ] **Step 6: Verify and commit**

Run: `npm test -- tests/unit/analytics/click-payload.test.ts tests/unit/api/go.test.ts && npm run lint`
Expected: PASS.

```bash
git add -A
git commit -m "feat: count clicks on redirect"
```

---

### Task 5: Admin magic-link authentication

**Files:**
- Create: `src/lib/auth/admin.ts`
- Create: `src/app/auth/callback/route.ts`
- Create: `src/app/admin/login/page.tsx`
- Create: `src/app/admin/login/actions.ts`
- Create: `src/middleware.ts`
- Create: `src/app/admin/(protected)/layout.tsx`
- Test: `tests/unit/auth/admin.test.ts`

**Interfaces:**
- Produces: `isAdminEmail(email: string | undefined, allowlist: string): boolean`, `adminGate(input: { pathname: string; hasUser: boolean; email?: string; allowlist: string }): 'allow' | 'login' | 'forbidden'`, `requireAdmin(): Promise<{ id: string; email: string }>`.
- Produces: server actions `sendMagicLink(formData: FormData): Promise<void>` and `signOutAction(): Promise<void>`.

- [ ] **Step 1: Write the failing auth tests**

Assert:
- allowlist parsing is case-insensitive and trims spaces (`"a@x.com, B@Y.com"`);
- `/admin` without a user → `login`;
- `/admin` with a non-allowlisted email → `forbidden`;
- `/admin` with an allowlisted email → `allow`;
- `/admin/login` is always `allow`;
- non-admin paths (`/`, `/api/go/x`) are `allow`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/auth/admin.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement admin helpers and middleware**

`isAdminEmail` splits `ADMIN_EMAILS` on commas, trims, lowercases. `adminGate` returns `forbidden` for logged-in non-admins. `src/middleware.ts` calls `updateSession()`, then applies `adminGate`; `login` → redirect to `/admin/login`, `forbidden` → redirect to `/admin/login?error=forbidden`. Matcher excludes static assets and the service worker.

`requireAdmin()` in `src/lib/auth/admin.ts` creates the auth server client, gets the user, throws/redirects unless allowlisted. `src/app/admin/(protected)/layout.tsx` calls it and renders the admin nav (`Tổng quan`, `Ứng dụng`, `Cài đặt`) plus a sign-out form; the login page sits outside the `(protected)` route group so it never hits this layout.

- [ ] **Step 4: Implement login and callback**

Add `'use server'` at the top of `src/app/admin/login/actions.ts`. Login page: email input, submit button `Gửi link đăng nhập`, Vietnamese error messages. `sendMagicLink` validates the email is allowlisted before calling `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: \`${SITE_URL}/auth/callback\` } })`; always responds with the same "kiểm tra email" message to avoid enumeration.

`signOutAction` calls `supabase.auth.signOut()` and redirects to `/admin/login`. `/auth/callback/route.ts` handles both `code` (exchange for session) and `token_hash` + `type` (`verifyOtp`), then redirects to `/admin`; on failure redirect to `/admin/login?error=link`.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- tests/unit/auth/admin.test.ts && npm run lint && npm run build`
Expected: PASS. Manual check note: a real magic link is verified in Task 13.

```bash
git add -A
git commit -m "feat: add admin magic-link auth"
```

---

### Task 6: Admin app management (CRUD, reorder, pause)

**Files:**
- Create: `src/lib/validation/app.ts` (add `parseAppForm`)
- Create: `src/app/admin/(protected)/apps/actions.ts`
- Create: `src/app/admin/(protected)/apps/page.tsx`, `new/page.tsx`, `[id]/edit/page.tsx`
- Create: `src/components/admin/apps-table.tsx`, `status-badge.tsx`
- Test: `tests/unit/admin/apps-actions.test.ts`

**Interfaces:**
- Consumes: app data functions, `appInputSchema`, `requireAdmin()`.
- Produces: `parseAppForm(formData: FormData): { success: true; input: AppInput } | { success: false; errors: Record<string, string[]> }`, `pauseUntil(minutes: 30 | 60, now: Date): string`.
- Produces server actions: `createAppAction`, `updateAppAction`, `deleteAppAction`, `toggleVisibilityAction`, `toggleMonitorAction`, `pauseMonitoringAction`, `resumeMonitoringAction`, `reorderAppsAction`.

- [ ] **Step 1: Write the failing tests**

`apps-actions.test.ts` covers:
- `parseAppForm` maps FormData strings to the camelCase schema, defaults `expectedStatus` 200 and `timeoutMs` 5000, and reports a slug error for `Blog App`;
- empty `description`, `iconUrl`, `healthUrl` become `undefined`;
- `pauseUntil(30, new Date('2026-11-18T00:00:00Z'))` returns `'2026-11-18T00:30:00.000Z'`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/admin/apps-actions.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement parsing and actions**

Add `'use server'` at the top of `actions.ts`. `parseAppForm` reads `name`, `slug`, `description`, `url`, `iconUrl`, `healthUrl`, `expectedStatus`, `timeoutMs`; the form submits `healthUrl` empty when unchecked/blank. Each action calls `requireAdmin()`, validates, calls the db function, then `revalidatePath('/admin/apps')` and the dashboard. Delete also removes click/check history via cascade.

- [ ] **Step 4: Build the admin list**

`/admin/apps` fetches `listAllApps()` and `listStatuses()` and lists all apps (including hidden) with status badge, visibility/monitor toggles, pause buttons (`Tạm dừng 30 phút`, `Tạm dừng 60 phút`, `Tiếp tục`), edit and delete (confirm dialog). `apps-table.tsx` is a client component using `@dnd-kit` sortable rows; on drop it calls `reorderAppsAction(ids)` optimistically. Add an `Thêm ứng dụng` button and empty state.

- [ ] **Step 5: Build new/edit forms**

Shared form fields: name, slug (hint `chữ thường, số, dấu gạch ngang`), description, URL, icon URL, health URL (placeholder "mặc định dùng URL trên"), expected status, timeout. Show field errors returned by `parseAppForm`. Save redirects to `/admin/apps`.

- [ ] **Step 6: Verify and commit**

Run: `npm test -- tests/unit/admin/apps-actions.test.ts && npm run lint && npm run build`
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
- Produces: `dayKey(date: Date, tz: string): string`, `summarizeClicks(events: ClickEventRow[], now: Date, tz: string): { today: number; last7: number; last30: number; unique30: number }`, `dailyClickSeries(events, days, now, tz): { day: string; count: number }[]`, `clickCountsByApp(events): { appId: string; count: number }[]`, `uptimePercent(checks: CheckRow[]): number | null`, `averageLatency(checks: CheckRow[]): number | null`.

- [ ] **Step 1: Write the failing stats tests**

Use fixed dates around the VN boundary:
- `2026-11-17T16:59:00Z` belongs to `2026-11-17`; `2026-11-17T17:00:00Z` belongs to `2026-11-18`.
- `today` counts only VN-today events; `last7` the VN day plus 6 before.
- `dailyClickSeries` fills missing days with 0 and returns exactly `days` entries.
- `unique30` counts distinct `ip_hash` values.
- `uptimePercent` returns `50` for 1 ok / 2 checks, `null` for zero checks.
- `averageLatency` rounds to the nearest ms, `null` for zero checks.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/analytics/stats.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement the helpers**

Use `Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' })` for `YYYY-MM-DD`. Filter with `Date` timestamps, not string comparison. Keep functions pure (no DB calls).

- [ ] **Step 4: Build the overview page**

`/admin` fetches in parallel: `listAllApps()`, `listClicksSince(now − 30 days)`, `listChecksSince(now − 24h)`, `listStatuses()`. Render:
- KPI cards: `Lượt bấm hôm nay`, `7 ngày`, `30 ngày`, `Khách riêng 30 ngày`, `Ứng dụng đang chạy` (visible/total), `Đang lỗi` (state down), `Độ trễ TB 24h`.
- A staleness banner: if the newest check is older than 10 minutes (or none), show `Lần kiểm tra cuối: ...` in amber; otherwise show the relative time in muted text.
- Click chart (Recharts client component, 30 days) and a per-app table sorted by clicks with status badge and last latency.

All labels Vietnamese. Use `Asia/Ho_Chi_Minh` for display dates.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- tests/unit/analytics/stats.test.ts && npm run lint && npm run build`
Expected: PASS.

```bash
git add -A
git commit -m "feat: add analytics helpers and admin overview"
```

---

### Task 8: Health-check engine, notifications, and cron endpoint

**Files:**
- Create: `src/lib/health/evaluate.ts`, `ping.ts`, `schedule.ts`, `runner.ts`, `deps.ts`
- Create: `src/lib/auth/cron.ts`
- Create: `src/app/api/cron/health/route.ts`
- Test: `tests/unit/health/evaluate.test.ts`, `ping.test.ts`, `runner.test.ts`, `tests/unit/api/cron-health.test.ts`

**Interfaces:**
- Produces: `type CheckResult = { ok: boolean; statusCode: number | null; latencyMs: number; error: string | null }`.
- Produces: `type HealthAlert = { kind: 'down' | 'recovered' | 'slow' | 'down-reminder'; app: AppRow; check: CheckResult; at: Date; downtimeMs?: number }`.
- Produces: `evaluateCheck({ previous: AppStatusRow | null; check: CheckResult; settings: Pick<SettingsRow, 'failure_threshold'|'slow_threshold_ms'|'notify_recovery'|'repeat_reminder_minutes'>; now: Date }): Evaluation` where `Evaluation = { status: Omit<AppStatusRow, 'app_id'>; incident: 'open' | 'close' | null; alert: HealthAlert['kind'] | null }`. The runner adds `app_id` when persisting.
- Produces: `isMonitoredNow(app: AppRow, now: Date): boolean`.
- Produces: `pingApp(app: AppRow, fetchImpl?: typeof fetch): Promise<CheckResult>`.
- Produces: `runHealthChecks(deps: HealthDeps): Promise<{ checked: number; skipped: boolean }>` with:
  ```ts
  type HealthDeps = {
    listAppsToCheck(now: Date): Promise<AppRow[]>;
    listStatuses(): Promise<AppStatusRow[]>;
    insertCheck(row: NewCheck): Promise<void>;
    upsertStatus(row: AppStatusRow): Promise<void>;
    openIncident(appId: string, at: Date, error: string | null): Promise<void>;
    closeOpenIncident(appId: string, at: Date): Promise<void>;
    getSettings(): Promise<SettingsRow>;
    notify(alert: HealthAlert): Promise<void>;
    now(): Date;
    ping(app: AppRow): Promise<CheckResult>;
  };
  ```
- Produces: `verifyCronSecret(header: string | null, secret: string): boolean` in `src/lib/auth/cron.ts`.
- Route: `POST /api/cron/health`.

- [ ] **Step 1: Write the failing evaluator tests**

`evaluate.test.ts`:
1. unknown app + 1 failure → state `unknown`, `consecutive_failures` 1, no alert.
2. up + 2 failures → still `up`, no alert.
3. up + 3 failures → `down`, incident `open`, alert `down`, `last_down_at` set.
4. down + another failure with `repeat_reminder_minutes=0` → no incident, no alert.
5. down + ok → `up`, incident `close`, alert `recovered`.
6. recovery with `notify_recovery=false` → no alert, incident still closes.
7. ok + latency 2500 for 3 consecutive checks → alert `slow` on the third only; a fourth slow check within an hour → no alert; a fifth slow check after `last_slow_alert_at` is 61 minutes old → alert again (hourly throttle, not a new 3-check requirement).
8. down for 61 minutes with `repeat_reminder_minutes=60` → alert `down-reminder`; `0` disables it.
9. a failed check resets `consecutive_slow` to 0.

- [ ] **Step 2: Write the failing ping/runner/route tests**

`ping.test.ts` (inject a fake fetch):
- 200 → ok, latency ≥ 0;
- 503 → not ok, `statusCode` 503;
- thrown network error → not ok with `error`;
- a fetch that respects `AbortSignal` and resolves after 50ms with `timeoutMs=10` → not ok, error `timeout`.

`runner.test.ts`:
- paused app (`monitoring_paused_until` in the future) is filtered by `isMonitoredNow` and never pinged (Review Focus).
- a down transition opens one incident and sends one alert even when `runHealthChecks` is called twice with the same previous state.
- a timeout result is persisted as a failed check and the run still returns `{ checked: 1 }` (Review Focus).
- `releaseHealthRun` is called even when a ping throws.

`cron-health.test.ts` (start with `// @vitest-environment node`):
- wrong/missing `x-cron-secret` → 401, no run;
- `claimHealthRun()` false → 202 `{ skipped: true }`;
- valid secret + claim true → 200 with `{ checked: n }`, and the secret comparison is length-independent (test a shorter wrong secret).

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- tests/unit/health tests/unit/api/cron-health.test.ts`
Expected: FAIL.

- [ ] **Step 4: Implement the evaluator**

`status` fields: `state`, `consecutive_failures`, `consecutive_slow`, `last_check_at`, `last_ok_at`, `last_down_at`, `last_down_alert_at`, `last_slow_alert_at`. Rules exactly as the spec: 3 failures → down + open + down alert; first ok after down → close + recovery alert (if enabled); slow streak 3 with 1-hour throttle; repeat reminder only while already down. Return `{ status, incident: 'open'|'close'|null, alert: 'down'|'recovered'|'slow'|'down-reminder'|null }`.

- [ ] **Step 5: Implement ping, schedule, runner, deps, and route**

`pingApp`: GET `app.health_url ?? app.url`, `redirect: 'follow'`, `AbortSignal.timeout(app.timeout_ms)`, measure with `performance.now()`, treat status `!== app.expected_status` as failure, map exceptions to `error` (`timeout` for `AbortError`). Never throw.

`isMonitoredNow`: `monitor_enabled && (monitoring_paused_until === null || Date.parse(...) <= now.getTime())`.

`runner`: claim is handled by the route; filter apps with `isMonitoredNow`; `Promise.all` pings; load statuses in one call; for each app evaluate, insert check, upsert status, open/close incident, and send alert through `deps.notify`. The runner builds the `HealthAlert` (`app`, `check`, `now`; for recovery, `downtimeMs = now - previous.last_down_at`). Wrap each app's persistence in its own try/catch so one failure does not abort the rest; alert errors are caught and logged and never fail the run. `deps` includes all data functions plus `notify`, `now`, `ping`; tests inject fakes. In this task `deps.notify` is a no-op placeholder; Task 9 replaces it with `deliverAlert`.

Route: `runtime='nodejs'`, `dynamic='force-dynamic'`, `maxDuration=60`. Verify secret (hash both inputs with SHA-256 and `timingSafeEqual`), call `claimHealthRun()`, run, `finally releaseHealthRun()`. The route gets its dependencies by importing `src/lib/health/deps.ts`; `cron-health.test.ts` mocks that module and `@/lib/db/settings`.

- [ ] **Step 6: Verify and commit**

Run: `npm test -- tests/unit/health tests/unit/api/cron-health.test.ts && npm run lint && npm run build`
Expected: PASS.

```bash
git add -A
git commit -m "feat: add health check engine and cron endpoint"
```

---

### Task 9: Alert delivery + settings page

**Files:**
- Create: `src/lib/health/alerts.ts`
- Create: `src/lib/validation/settings.ts`
- Create: `src/lib/format.ts`
- Create: `src/app/admin/(protected)/settings/page.tsx`, `actions.ts`
- Modify: `src/lib/health/deps.ts` to use `deliverAlert`
- Test: `tests/unit/health/alerts.test.ts`, `tests/unit/validation/settings.test.ts`

**Interfaces:**
- Produces: `formatDateTime(iso: string): string` (VN `dd/MM/yyyy HH:mm`).
- Produces: `formatAlert(alert: HealthAlert, siteUrl: string): { subject: string; text: string }`, `deliverAlert(alert: HealthAlert, settings: SettingsRow, env: { telegramBotToken?: string; resendApiKey?: string; alertFromEmail: string }): Promise<{ telegram: 'sent'|'skipped'|'failed'; email: 'sent'|'skipped'|'failed' }>`, `settingsInputSchema`, `parseSettingsForm`.
- Produces actions: `saveSettingsAction`, `sendTestAlertAction`.

- [ ] **Step 1: Write the failing alert tests**

- down message contains the app name, `đang chết`, status/error, latency, VN timestamp, and `${siteUrl}/admin/apps/${id}`.
- recovered message contains `đã hoạt động lại` and downtime duration.
- slow message contains `phản hồi chậm` and the latency.
- `deliverAlert` with no chat id and no email recipients returns `{ telegram: 'skipped', email: 'skipped' }`.
- Telegram fetch is called at `https://api.telegram.org/bot<token>/sendMessage` with `chat_id` and `text`; a thrown fetch returns `failed` without throwing.
- Email is skipped when `RESEND_API_KEY` or recipients are missing; a Resend failure returns `failed`.
- No `parse_mode` is sent (plain text avoids escaping bugs).

- [ ] **Step 2: Write the failing settings validation tests**

`settingsInputSchema` coerces strings, defaults threshold 3 / slow 2000 / repeat 0, rejects threshold 0 and 11, parses comma/newline-separated recipients into a trimmed, lowercased array, and rejects an invalid email.

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- tests/unit/health/alerts.test.ts tests/unit/validation/settings.test.ts`
Expected: FAIL.

- [ ] **Step 4: Implement alerts and settings**

`formatDateTime` uses `Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date(iso))` and joins the parts as `dd/MM/yyyy HH:mm`. Use plain text (no Markdown) for Telegram. `deliverAlert` sends Telegram (if `settings.telegram_chat_id` and `TELEGRAM_BOT_TOKEN`) and Resend email (if recipients and `RESEND_API_KEY`) with `Promise.allSettled`; log failures; never throw. Resend `from` is `ALERT_FROM_EMAIL`; subject from `formatAlert`. Wire `deps.notify` to `deliverAlert` in `src/lib/health/deps.ts`.

- [ ] **Step 5: Build the settings page**

Add `'use server'` at the top of `actions.ts`. Fields: Telegram chat id, email recipients (textarea, one per line or comma), failure threshold, slow threshold, alerts enabled, notify recovery, repeat reminder minutes. Buttons: `Lưu cài đặt`, `Gửi thử`. Show a success banner via `?saved=1`; the test button sends a fake down alert and reports whether each channel was sent/skipped/failed. All actions require `requireAdmin()`.

- [ ] **Step 6: Verify and commit**

Run: `npm test -- tests/unit/health/alerts.test.ts tests/unit/validation/settings.test.ts && npm run lint && npm run build`
Expected: PASS.

```bash
git add -A
git commit -m "feat: add alert delivery and settings"
```

---

### Task 10: App detail page and small format helpers

**Files:**
- Modify: `src/lib/format.ts` (add helpers)
- Modify: `src/app/admin/(protected)/apps/[id]/page.tsx`
- Create: `src/components/charts/latency-chart.tsx`
- Test: `tests/unit/format.test.ts` (create; it also covers `formatDateTime` from Task 9)

**Interfaces:**
- Consumes: `formatDateTime` from Task 9.
- Produces: `formatUptime(value: number | null): string` (`"—"` for null, else `"99.9%"`), `formatLatency(ms: number | null): string` (`"123 ms"` or `"—"`).

- [ ] **Step 1: Write the failing format tests**

Create `tests/unit/format.test.ts` with cases: null → `—`, 99.94 → `99.9%`, 123.4 → `123 ms`, and `2026-11-18T07:05:00Z` → `18/11/2026 14:05`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/format.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement helpers and page**

Detail page fetches the app (404 if missing), 30-day clicks, 7-day checks, recent 20 checks, incidents. Shows: current status, uptime 24h/7d, average latency, 30-day click chart, 7-day latency chart, recent checks table (`Thời điểm`, `Trạng thái`, `HTTP`, `Độ trễ`, `Lỗi`), and incident history. Link back to `/admin/apps`.

- [ ] **Step 4: Verify and commit**

Run: `npm test -- tests/unit/format.test.ts && npm run lint && npm run build`
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
- Create: `scripts/generate-icons.mjs`, `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`
- Test: `tests/unit/manifest.test.ts`

**Interfaces:**
- Produces: manifest with `name`/`short_name` from `NEXT_PUBLIC_HUB_NAME`, `start_url: '/'`, `display: 'standalone'`, `lang: 'vi'`, `theme_color: '#4f46e5'`, background `'#0f172a'`, icons 192/512 + maskable.

- [ ] **Step 1: Write the failing manifest test**

Assert the manifest returns the values above, `start_url === '/'`, and every icon has `sizes` and `type: 'image/png'`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/unit/manifest.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement manifest, icons, and service worker**

Create a source SVG (`public/icons/icon.svg`, simple rounded square with the letter H in indigo), then `scripts/generate-icons.mjs` uses `sharp` to emit the three PNGs. Run it once and commit the PNGs.

`next.config.ts` wraps the config with `withSerwistInit({ swSrc: 'src/app/sw.ts', swDest: 'public/sw.js', cacheOnNavigation: true, reloadOnOnline: true, disable: process.env.NODE_ENV === 'development' })`. `src/app/sw.ts` uses `defaultCache`, `skipWaiting`, `clientsClaim`, and a document fallback to `/offline`. Ensure `public/sw.js` is gitignored.

`/offline`: static Vietnamese page (`Bạn đang offline`) explaining the last visited hub page is available from cache when installed.

`layout.tsx` exports `metadata` with `manifest: '/manifest.webmanifest'`, `appleWebApp` title, and theme color.

- [ ] **Step 4: Build and verify**

Run: `npm test -- tests/unit/manifest.test.ts && npm run build`
Expected: build succeeds and prints/generates `public/sw.js`.

Manual check (recorded in the commit message): `npm run start`, open Chrome DevTools → Application → Service Workers, confirm the worker is activated; set Network to Offline, reload `/` and confirm the cached hub or `/offline` renders.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add PWA manifest and offline support"
```

---

### Task 12: Supabase cron, watchdog, and runbook

**Files:**
- Create: `supabase/migrations/20261118000200_cron.sql`
- Create: `docs/runbook.md`
- Modify: `docs/superpowers/specs/2026-11-18-ecosystem-hub-design.md` only if implementation forces a documented deviation

**Interfaces:**
- Produces SQL functions: `trigger_health_check()`, `watchdog_check()`.
- Produces cron schedules: health every minute, watchdog every 5 minutes, cleanup daily at 03:15.

- [ ] **Step 1: Write the cron migration**

`trigger_health_check()` reads `hub_site_url` and `cron_secret` from `vault.decrypted_secrets`, returns early if either is missing, and calls `net.http_post` to `<site>/api/cron/health` with header `x-cron-secret`, body `{}`, timeout 15000ms.

`watchdog_check()`:
- returns early if no app is monitored and unpaused;
- reads `max(checked_at)` from `checks`;
- returns if the newest check is < 10 minutes old;
- returns if `ops_alerts` has `watchdog:stale` newer than 60 minutes;
- reads `telegram_chat_id`, the bot token, and `hub_site_url`; returns if missing;
- posts a Vietnamese plain-text message to Telegram: `⚠️ Bộ giám sát không chạy: lần kiểm tra cuối <dd/MM/yyyy HH:mm> (giờ VN). Kiểm tra Supabase Cron / CRON_SECRET. <site_url>`;
- upserts `ops_alerts('watchdog:stale', now())`.

Schedule with `cron.schedule('hub-health-check', '* * * * *', ...)`, `hub-watchdog` every 5 minutes, and cleanup deleting checks older than 30 days at `15 3 * * *`. Before each schedule, run `select cron.unschedule(jobname) from cron.job where jobname = '<name>';` (a no-op when absent) so re-running the migration is safe.

- [ ] **Step 2: Apply and verify the SQL**

In Supabase: enable `pg_cron` and `pg_net`, create Vault secrets `hub_site_url`, `cron_secret`, `telegram_bot_token`, then run the migration. Verify:
- after one minute, `select count(*) from checks;` increases and the Vercel function log shows a 200;
- `select public.watchdog_check();` is a no-op when checks are fresh;
- set `checked_at = now() - interval '20 minutes'` on all checks (dev project only), run the function, confirm a Telegram message arrives, then run again and confirm no duplicate within an hour.

- [ ] **Step 3: Write the runbook**

`docs/runbook.md` in Vietnamese covers: creating the Supabase project and running migrations, the three Vault secrets, creating the Telegram bot with BotFather and getting the chat id, Resend API key + verified domain (or the `onboarding@resend.dev` test sender), Vercel env vars, deploy, Supabase Auth site/redirect URLs, first admin login, adding apps, pausing before deploy, and the acceptance checklist. No secrets in the file.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: schedule health checks and add watchdog"
```

---

### Task 13: Deploy to Vercel and run acceptance

**Files:**
- Modify: `docs/runbook.md` with the deployed URL and any fixes
- Create: `supabase/seed.sql` edits only if the owner supplies real apps before deploy

**Interfaces:**
- Consumes everything above.

- [ ] **Step 1: Deploy**

Create the Vercel project from the repo, add every env var from `.env.example` (real values), set `NEXT_PUBLIC_SITE_URL` to the deployed URL, and deploy. Add the deployed `/auth/callback` URL to Supabase Auth redirect URLs. Sign in once with the allowlisted email to create the admin user.

- [ ] **Step 2: Add the owner's real apps**

Add the 5–10 apps through `/admin/apps` with name, slug, URL, short description, icon URL, and health URL if it differs from the public URL. Confirm each appears on `/`.

- [ ] **Step 3: Run the acceptance checklist**

Record the result of each in the runbook:
1. Hub loads on a phone; tapping a card lands on the app.
2. A click appears in `/admin` within one refresh.
3. Install the PWA; airplane mode + reopen shows the cached hub or `/offline`.
4. Add a temporary app pointing at `https://httpstat.us/503`; after ~3–5 minutes receive Telegram + email; remove it.
5. Pause an app for 30 minutes, deploy it, confirm no alert; confirm checks resume after the pause.
6. Stop the health cron for 10+ minutes; confirm the watchdog Telegram message arrives once (≤ 15 minutes, no duplicate within the hour), then restore it.
7. The dashboard staleness banner turns amber while the cron is stopped.

- [ ] **Step 4: Final verification and commit**

Run: `npm test && npm run lint && npm run build`
Expected: all green.

```bash
git add -A
git commit -m "docs: record deployment and acceptance results"
```
