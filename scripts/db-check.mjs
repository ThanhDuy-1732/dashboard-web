import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is missing');
  process.exit(1);
}

const expected = {
  apps: [
    'id', 'slug', 'name', 'description', 'url', 'icon_url', 'supabase_ref',
    'supabase_health_url', 'sort_order', 'is_visible', 'monitor_app',
    'monitor_supabase', 'monitoring_paused_until', 'expected_status',
    'timeout_ms', 'created_at', 'updated_at',
  ],
  click_events: ['id', 'app_id', 'clicked_at', 'referrer', 'user_agent', 'ip_hash', 'country'],
  checks: ['id', 'app_id', 'target', 'checked_at', 'ok', 'status_code', 'latency_ms', 'error'],
  app_status: [
    'app_id', 'target', 'state', 'consecutive_failures', 'consecutive_slow',
    'last_check_at', 'last_ok_at', 'last_down_at', 'last_down_alert_at', 'last_slow_alert_at',
  ],
  incidents: ['id', 'app_id', 'target', 'started_at', 'resolved_at', 'first_error'],
  settings: [
    'id', 'telegram_chat_id', 'email_recipients', 'failure_threshold',
    'slow_threshold_ms', 'alerts_enabled', 'notify_recovery',
    'repeat_reminder_minutes', 'health_run_locked_at', 'last_cleanup_at', 'updated_at',
  ],
  schema_migrations: ['name', 'applied_at'],
};

const sql = postgres(url, { prepare: false, max: 1, onnotice: () => {} });

try {
  let failed = false;

  for (const [table, columns] of Object.entries(expected)) {
    const rows = await sql`
      select column_name from information_schema.columns
      where table_schema = 'public' and table_name = ${table}
    `;
    const actual = new Set(rows.map((row) => row.column_name));
    if (actual.size === 0) {
      console.error(`missing table: ${table}`);
      failed = true;
      continue;
    }
    for (const column of columns) {
      if (!actual.has(column)) {
        console.error(`missing column: ${table}.${column}`);
        failed = true;
      }
    }
  }

  const [{ count }] = await sql`select count(*)::int as count from settings where id = 1`;
  if (count !== 1) {
    console.error(`settings singleton count is ${count}, expected 1`);
    failed = true;
  }

  const functions = await sql`
    select proname from pg_proc
    where proname in ('claim_health_run', 'release_health_run')
  `;
  const names = new Set(functions.map((row) => row.proname));
  for (const name of ['claim_health_run', 'release_health_run']) {
    if (!names.has(name)) {
      console.error(`missing function: ${name}`);
      failed = true;
    }
  }

  if (failed) {
    process.exitCode = 1;
  } else {
    console.log('db-check OK');
  }
} catch (error) {
  console.error('db-check failed:', error);
  process.exitCode = 1;
} finally {
  await sql.end();
}
