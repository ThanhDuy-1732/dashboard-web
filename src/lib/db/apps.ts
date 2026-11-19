import { getSql } from '@/lib/db/client';
import type { AppRow, AppWriteInput, PublicApp } from '@/lib/db/types';

export async function listVisibleApps(): Promise<PublicApp[]> {
  const sql = getSql();
  return sql<PublicApp[]>`
    select id, slug, name, description, url, icon_url
    from apps
    where is_visible = true
    order by sort_order asc, name asc
  `;
}

export async function listAllApps(): Promise<AppRow[]> {
  const sql = getSql();
  return sql<AppRow[]>`select * from apps order by sort_order asc, name asc`;
}

export async function getAppById(id: string): Promise<AppRow | null> {
  const sql = getSql();
  const [row] = await sql<AppRow[]>`select * from apps where id = ${id}`;
  return row ?? null;
}

export async function getVisibleAppBySlug(slug: string): Promise<PublicApp | null> {
  const sql = getSql();
  const [row] = await sql<PublicApp[]>`
    select id, slug, name, description, url, icon_url
    from apps
    where slug = ${slug} and is_visible = true
  `;
  return row ?? null;
}

export async function createApp(input: AppWriteInput): Promise<AppRow> {
  const sql = getSql();
  const [row] = await sql<AppRow[]>`
    insert into apps (
      name, slug, description, url, icon_url, supabase_ref, supabase_health_url,
      sort_order, is_visible, monitor_app, monitor_supabase, expected_status, timeout_ms
    ) values (
      ${input.name}, ${input.slug}, ${input.description}, ${input.url}, ${input.icon_url},
      ${input.supabase_ref}, ${input.supabase_health_url}, ${input.sort_order},
      ${input.is_visible}, ${input.monitor_app}, ${input.monitor_supabase},
      ${input.expected_status}, ${input.timeout_ms}
    )
    returning *
  `;
  if (!row) throw new Error('createApp returned no row');
  return row;
}

export async function updateApp(id: string, input: AppWriteInput): Promise<AppRow> {
  const sql = getSql();
  const [row] = await sql<AppRow[]>`
    update apps set
      name = ${input.name},
      slug = ${input.slug},
      description = ${input.description},
      url = ${input.url},
      icon_url = ${input.icon_url},
      supabase_ref = ${input.supabase_ref},
      supabase_health_url = ${input.supabase_health_url},
      sort_order = ${input.sort_order},
      is_visible = ${input.is_visible},
      monitor_app = ${input.monitor_app},
      monitor_supabase = ${input.monitor_supabase},
      expected_status = ${input.expected_status},
      timeout_ms = ${input.timeout_ms}
    where id = ${id}
    returning *
  `;
  if (!row) throw new Error('updateApp returned no row');
  return row;
}

export async function deleteApp(id: string): Promise<void> {
  const sql = getSql();
  await sql`delete from apps where id = ${id}`;
}

export async function setAppVisibility(id: string, visible: boolean): Promise<void> {
  const sql = getSql();
  await sql`update apps set is_visible = ${visible} where id = ${id}`;
}

export async function setAppMonitor(
  id: string,
  target: 'app' | 'supabase',
  enabled: boolean,
): Promise<void> {
  const sql = getSql();
  if (target === 'app') {
    await sql`update apps set monitor_app = ${enabled} where id = ${id}`;
  } else {
    await sql`update apps set monitor_supabase = ${enabled} where id = ${id}`;
  }
}

export async function pauseAppMonitoring(id: string, until: Date | null): Promise<void> {
  const sql = getSql();
  await sql`update apps set monitoring_paused_until = ${until} where id = ${id}`;
}

export async function reorderApps(ids: string[]): Promise<void> {
  const sql = getSql();
  await sql.begin(async (tx) => {
    for (const [index, id] of ids.entries()) {
      await tx`update apps set sort_order = ${index} where id = ${id}`;
    }
  });
}

export async function listAppsToCheck(now: Date): Promise<AppRow[]> {
  const sql = getSql();
  const rows = await sql<AppRow[]>`
    select *,
      coalesce(health_method, 'GET') as health_method,
      coalesce(health_headers, '{}'::jsonb) as health_headers
    from apps
    where (monitoring_paused_until is null or monitoring_paused_until <= ${now})
      and (monitor_app = true or monitor_supabase = true)
    order by sort_order asc, name asc
  `;

  return rows.map((row) => ({
    ...row,
    health_headers:
      typeof row.health_headers === 'string'
        ? (JSON.parse(row.health_headers || '{}') as Record<string, string>)
        : (row.health_headers ?? {}),
  }));
}
