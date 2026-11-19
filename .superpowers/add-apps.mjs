import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });

const apps = [
  { slug: 'secret-story', name: 'Secret Story', url: 'https://secret-story-seven.vercel.app', visible: true, order: 1 },
  { slug: 'dashboard-games', name: 'Dashboard Games', url: 'https://dashboard-games-iota.vercel.app', visible: true, order: 2 },
  { slug: 'money-app', name: 'Money App', url: 'https://money-app-brown-eight.vercel.app', visible: true, order: 3 },
  { slug: 'english-sudy-web', name: 'English Study', url: 'https://english-sudy-web-taupe.vercel.app', visible: true, order: 4 },
  { slug: 'qr-app', name: 'QR App', url: 'https://qr-app-gamma-silk.vercel.app', visible: true, order: 5 },
  { slug: 'dashboard-web', name: 'Ecosystem Hub (self)', url: 'https://dashboard-web-pi-five.vercel.app', visible: false, order: 6 },
  { slug: 'supabase-thanhduy-1732', name: 'Supabase ThanhDuy-1732', url: `https://zweodslsxsdrhgmzhsbf.supabase.co/auth/v1/health?apikey=${process.env.SUP1_ANON}`, visible: false, order: 7 },
  { slug: 'supabase-thankz-plus1', name: 'Supabase ThankZ-Plus1', url: `https://hqqhvnaisqqeouomcnun.supabase.co/auth/v1/health?apikey=${process.env.SUP2_ANON}`, visible: false, order: 8 },
];

await sql.begin(async (tx) => {
  await tx`delete from apps where slug in ('blog', 'shop')`;
  for (const app of apps) {
    await tx`
      insert into apps (slug, name, url, sort_order, is_visible, monitor_app, monitor_supabase, expected_status)
      values (${app.slug}, ${app.name}, ${app.url}, ${app.order}, ${app.visible}, true, false, 200)
      on conflict (slug) do update set
        name = excluded.name,
        url = excluded.url,
        is_visible = excluded.is_visible,
        monitor_app = true,
        monitor_supabase = false
    `;
  }
});

const rows = await sql`select slug, name, is_visible from apps order by sort_order`;
console.log(rows);
await sql.end();
