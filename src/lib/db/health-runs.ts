import { getSql } from '@/lib/db/client';
import type { HealthRunRow, NewHealthRun } from '@/lib/db/types';

export async function insertHealthRun(row: NewHealthRun): Promise<void> {
  const sql = getSql();
  await sql`
    insert into health_runs (started_at, finished_at, ok, checked, failures, error)
    values (
      ${row.started_at}, ${row.finished_at}, ${row.ok},
      ${row.checked}, ${row.failures}, ${row.error}
    )
  `;
}

export async function listRecentHealthRuns(limit = 20): Promise<HealthRunRow[]> {
  const sql = getSql();
  return sql<HealthRunRow[]>`
    select * from health_runs order by started_at desc limit ${limit}
  `;
}
