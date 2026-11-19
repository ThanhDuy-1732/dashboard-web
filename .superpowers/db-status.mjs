import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
const rows = await sql`
  select a.slug, a.name, s.state, s.consecutive_failures, c.status_code, c.latency_ms
  from apps a
  left join app_status s on s.app_id = a.id and s.target = 'app'
  left join lateral (
    select status_code, latency_ms from checks
    where app_id = a.id and target = 'app'
    order by checked_at desc limit 1
  ) c on true
  order by a.sort_order
`;
console.table(rows);
await sql.end();
