import { getSql } from '@/lib/db/client';

export async function countRecentLoginFailures(
  ipHash: string,
  since: Date,
): Promise<number> {
  const sql = getSql();
  const [row] = await sql<{ count: number }[]>`
    select count(*)::int as count
    from login_attempts
    where ip_hash = ${ipHash} and attempted_at >= ${since}
  `;
  return row?.count ?? 0;
}

export async function recordLoginFailure(ipHash: string): Promise<void> {
  const sql = getSql();
  await sql`insert into login_attempts (ip_hash) values (${ipHash})`;
}

export async function clearLoginFailures(ipHash: string): Promise<void> {
  const sql = getSql();
  await sql`delete from login_attempts where ip_hash = ${ipHash}`;
}
