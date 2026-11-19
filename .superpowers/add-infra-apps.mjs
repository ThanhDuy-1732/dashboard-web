import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });

const apps = [
  {
    slug: 'neon-hidden-term-65742193',
    name: 'Neon Hidden Term',
    url: 'https://console.neon.tech/api/v2/projects/hidden-term-65742193',
    headers: { Authorization: `Bearer ${process.env.NEON_API_KEY}` },
    order: 9,
  },
  {
    slug: 'neon-cold-rice-20739054',
    name: 'Neon Cold Rice',
    url: 'https://console.neon.tech/api/v2/projects/cold-rice-20739054',
    headers: { Authorization: `Bearer ${process.env.NEON_API_KEY}` },
    order: 10,
  },
  {
    slug: 'neon-purple-wind-74663054',
    name: 'Neon Purple Wind',
    url: 'https://console.neon.tech/api/v2/projects/purple-wind-74663054',
    headers: { Authorization: `Bearer ${process.env.NEON_API_KEY}` },
    order: 11,
  },
  {
    slug: 'upstash-valued-bee',
    name: 'Upstash Valued Bee',
    url: `${process.env.UPSTASH_URL}/ping`,
    headers: { Authorization: `Bearer ${process.env.UPSTASH_TOKEN}` },
    order: 12,
  },
];

await sql.begin(async (tx) => {
  for (const app of apps) {
    await tx`
      insert into apps (slug, name, url, sort_order, is_visible, monitor_app, monitor_supabase, expected_status, health_method, health_headers)
      values (${app.slug}, ${app.name}, ${app.url}, ${app.order}, false, true, false, 200, 'GET', ${JSON.stringify(app.headers)}::jsonb)
      on conflict (slug) do update set
        name = excluded.name,
        url = excluded.url,
        health_method = 'GET',
        health_headers = excluded.health_headers
    `;
  }
});

const rows = await sql`select slug, name, url from apps order by sort_order`;
console.log(rows.map((r) => ({ slug: r.slug, url: r.url.slice(0, 60) })));
await sql.end();
