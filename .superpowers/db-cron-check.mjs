import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
const rows = await sql`
  select checked_at, ok, status_code, latency_ms from checks
  order by checked_at desc limit 3
`;
console.log(rows);
await sql.end();
