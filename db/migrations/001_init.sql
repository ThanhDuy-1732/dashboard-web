create table if not exists schema_migrations (
  name text primary key,
  applied_at timestamptz not null default now()
);

create table if not exists apps (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 60),
  description text,
  url text not null,
  icon_url text,
  supabase_ref text,
  supabase_health_url text,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  monitor_app boolean not null default true,
  monitor_supabase boolean not null default true,
  monitoring_paused_until timestamptz,
  expected_status integer not null default 200 check (expected_status between 100 and 599),
  timeout_ms integer not null default 5000 check (timeout_ms between 1000 and 30000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists click_events (
  id bigserial primary key,
  app_id uuid not null references apps(id) on delete cascade,
  clicked_at timestamptz not null default now(),
  referrer text,
  user_agent text,
  ip_hash text not null,
  country text
);

create table if not exists checks (
  id bigserial primary key,
  app_id uuid not null references apps(id) on delete cascade,
  target text not null check (target in ('app', 'supabase')),
  checked_at timestamptz not null default now(),
  ok boolean not null,
  status_code integer,
  latency_ms integer not null,
  error text
);

create table if not exists app_status (
  app_id uuid not null references apps(id) on delete cascade,
  target text not null check (target in ('app', 'supabase')),
  state text not null default 'unknown' check (state in ('up', 'down', 'unknown')),
  consecutive_failures integer not null default 0,
  consecutive_slow integer not null default 0,
  last_check_at timestamptz,
  last_ok_at timestamptz,
  last_down_at timestamptz,
  last_down_alert_at timestamptz,
  last_slow_alert_at timestamptz,
  primary key (app_id, target)
);

create table if not exists incidents (
  id bigserial primary key,
  app_id uuid not null references apps(id) on delete cascade,
  target text not null check (target in ('app', 'supabase')),
  started_at timestamptz not null default now(),
  resolved_at timestamptz,
  first_error text
);

create table if not exists settings (
  id smallint primary key default 1 check (id = 1),
  telegram_chat_id text,
  email_recipients text[] not null default '{}',
  failure_threshold integer not null default 3 check (failure_threshold between 1 and 10),
  slow_threshold_ms integer not null default 2000 check (slow_threshold_ms between 100 and 60000),
  alerts_enabled boolean not null default true,
  notify_recovery boolean not null default true,
  repeat_reminder_minutes integer not null default 0 check (repeat_reminder_minutes between 0 and 1440),
  health_run_locked_at timestamptz,
  last_cleanup_at timestamptz,
  updated_at timestamptz not null default now()
);

insert into settings (id) values (1) on conflict (id) do nothing;

create index if not exists click_events_app_time_idx
  on click_events (app_id, clicked_at desc);
create index if not exists click_events_time_idx
  on click_events (clicked_at desc);
create index if not exists checks_app_target_time_idx
  on checks (app_id, target, checked_at desc);
create index if not exists checks_time_idx
  on checks (checked_at desc);
create index if not exists incidents_app_time_idx
  on incidents (app_id, started_at desc);
create unique index if not exists incidents_one_open_per_target_idx
  on incidents (app_id, target) where resolved_at is null;

create or replace function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists apps_touch_updated_at on apps;
create trigger apps_touch_updated_at
  before update on apps
  for each row execute function touch_updated_at();

drop trigger if exists settings_touch_updated_at on settings;
create trigger settings_touch_updated_at
  before update on settings
  for each row execute function touch_updated_at();
