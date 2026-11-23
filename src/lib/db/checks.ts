import { getSql } from '@/lib/db/client';
import type {
  AppStatusRow,
  CheckRow,
  IncidentRow,
  NewCheck,
  NewIncident,
  Target,
} from '@/lib/db/types';

export type RecentIncidentRow = IncidentRow & {
  app_name: string;
  app_slug: string;
  app_paused: boolean;
};

export async function insertCheck(row: NewCheck): Promise<void> {
  const sql = getSql();
  await sql`
    insert into checks (app_id, target, checked_at, ok, status_code, latency_ms, error)
    values (
      ${row.app_id}, ${row.target}, ${row.checked_at}, ${row.ok},
      ${row.status_code}, ${row.latency_ms}, ${row.error}
    )
    on conflict (app_id, target, checked_at) do nothing
  `;
}

export async function listChecksSince(since: Date): Promise<CheckRow[]> {
  const sql = getSql();
  return sql<CheckRow[]>`
    select * from checks
    where checked_at >= ${since}
    order by checked_at asc
  `;
}

export async function listChecksForAppSince(appId: string, since: Date): Promise<CheckRow[]> {
  const sql = getSql();
  return sql<CheckRow[]>`
    select * from checks
    where app_id = ${appId} and checked_at >= ${since}
    order by checked_at asc
  `;
}

export async function listRecentChecks(appId: string, limit: number): Promise<CheckRow[]> {
  const sql = getSql();
  return sql<CheckRow[]>`
    select * from checks
    where app_id = ${appId}
    order by checked_at desc
    limit ${limit}
  `;
}

export async function getStatuses(): Promise<AppStatusRow[]> {
  const sql = getSql();
  return sql<AppStatusRow[]>`select * from app_status`;
}

export async function upsertStatus(row: AppStatusRow): Promise<void> {
  const sql = getSql();
  await sql`
    insert into app_status (
      app_id, target, state, consecutive_failures, consecutive_slow,
      last_check_at, last_ok_at, last_down_at, last_down_alert_at, last_slow_alert_at
    ) values (
      ${row.app_id}, ${row.target}, ${row.state}, ${row.consecutive_failures},
      ${row.consecutive_slow}, ${row.last_check_at}, ${row.last_ok_at},
      ${row.last_down_at}, ${row.last_down_alert_at}, ${row.last_slow_alert_at}
    )
    on conflict (app_id, target) do update set
      state = excluded.state,
      consecutive_failures = excluded.consecutive_failures,
      consecutive_slow = excluded.consecutive_slow,
      last_check_at = excluded.last_check_at,
      last_ok_at = excluded.last_ok_at,
      last_down_at = excluded.last_down_at,
      last_down_alert_at = excluded.last_down_alert_at,
      last_slow_alert_at = excluded.last_slow_alert_at
  `;
}

export async function openIncident(row: NewIncident): Promise<void> {
  const sql = getSql();
  try {
    await sql`
      insert into incidents (app_id, target, started_at, first_error)
      values (${row.app_id}, ${row.target}, ${row.started_at}, ${row.first_error})
    `;
  } catch (error) {
    if ((error as { code?: string }).code !== '23505') throw error;
  }
}

export async function closeOpenIncident(
  appId: string,
  target: Target,
  at: Date,
): Promise<void> {
  const sql = getSql();
  await sql`
    update incidents
    set resolved_at = ${at}
    where app_id = ${appId} and target = ${target} and resolved_at is null
  `;
}

export async function listIncidents(appId: string, limit: number): Promise<IncidentRow[]> {
  const sql = getSql();
  return sql<IncidentRow[]>`
    select * from incidents
    where app_id = ${appId}
    order by started_at desc
    limit ${limit}
  `;
}

export async function listRecentIncidents(
  limit: number,
): Promise<RecentIncidentRow[]> {
  const sql = getSql();
  return sql<RecentIncidentRow[]>`
    select i.*, a.name as app_name, a.slug as app_slug,
      (a.monitoring_paused_until is not null and a.monitoring_paused_until > now()) as app_paused
    from incidents i join apps a on a.id = i.app_id
    order by i.started_at desc
    limit ${limit}
  `;
}
