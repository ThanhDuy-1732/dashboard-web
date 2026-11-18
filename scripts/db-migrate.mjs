import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is missing');
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1, onnotice: () => {} });

try {
  await sql`
    create table if not exists schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )
  `;

  const dir = path.join(process.cwd(), 'db/migrations');
  const files = (await readdir(dir)).filter((file) => file.endsWith('.sql')).sort();

  for (const file of files) {
    const [applied] = await sql`select 1 from schema_migrations where name = ${file}`;
    if (applied) {
      console.log(`skip ${file}`);
      continue;
    }

    const text = await readFile(path.join(dir, file), 'utf8');
    await sql.begin(async (tx) => {
      await tx.unsafe(text);
      await tx`insert into schema_migrations (name) values (${file})`;
    });
    console.log(`applied ${file}`);
  }

  console.log('db-migrate OK');
} catch (error) {
  console.error('db-migrate failed:', error);
  process.exitCode = 1;
} finally {
  await sql.end();
}
