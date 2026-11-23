# Task 10 — Fix Report

## Finding addressed

**Admin SW activate deletes its own cache** — `public/admin/sw.js` activation cleanup filtered only on `key.startsWith('ecosystem-admin-')`, so the active cache (`ecosystem-admin-v1`) was deleted during activation. This contradicted the spec's "delete only prefix caches" intent and diverged from the reviewer's current standard of excluding the current cache.

## Controller ruling applied

Filter cleanup as `key.startsWith('ecosystem-admin-') && key !== CACHE`, leaving the hub SW unchanged.

## Changes

- `public/admin/sw.js`: activation cleanup filter now excludes the current `CACHE`:
  ```js
  keys
    .filter((key) => key.startsWith('ecosystem-admin-') && key !== CACHE)
    .map((key) => caches.delete(key)),
  ```
- `tests/unit/pwa/service-worker-cache.test.ts`: the "deletes only caches owned by each app" test now asserts admin SW contains the `key !== CACHE` guard while the hub SW remains unchanged (`not.toContain('key !== CACHE')`).

## Verification

- Focused SW/cache/header/register/adminGate tests: 4 files, 27 tests passed.
  - `tests/unit/pwa/service-worker-cache.test.ts`, `tests/unit/pwa/sw-headers.test.ts`, `tests/unit/pwa/register.test.ts`, `tests/unit/auth/admin.test.ts`
- Full suite (`npm test`): 45 files, 254 tests passed.
- Lint (`npm run lint`): 0 errors. 4 pre-existing warnings in `tests/unit/health/ping.test.ts` (unused vars), unrelated to this change.
- Type check (`npx tsc --noEmit`): clean, no errors.

## Commit

`fix: exclude current admin SW cache from cleanup`
