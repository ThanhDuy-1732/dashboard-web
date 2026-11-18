import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is missing');
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1, onnotice: () => {} });

try {
  await sql`insert into settings (id) values (1) on conflict (id) do nothing`;

  const rows = [
    {
      slug: 'blog',
      name: 'Blog',
      description: 'Ghi chép và bài viết',
      url: 'https://example.com/blog',
      sort_order: 1,
    },
    {
      slug: 'shop',
      name: 'Shop',
      description: 'Cửa hàng trực tuyến',
      url: 'https://example.com/shop',
      sort_order: 2,
    },
  ];

  for (const app of rows) {
    await sql`
      insert into apps (slug, name, description, url, sort_order, monitor_supabase)
      values (${app.slug}, ${app.name}, ${app.description}, ${app.url}, ${app.sort_order}, false)
      on conflict (slug) do nothing
    `;
  }

  const [{ count }] = await sql`select count(*)::int as count from apps`;
  console.log(`db-seed OK (${count} apps)`);
} catch (error) {
  console.error('db-seed failed:', error);
  process.exitCode = 1;
} finally {
  await sql.end();
}
