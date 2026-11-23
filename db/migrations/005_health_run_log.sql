create unique index if not exists checks_app_target_time_key
  on checks (app_id, target, checked_at);

create table if not exists health_runs (
  id bigserial primary key,
  started_at timestamptz not null,
  finished_at timestamptz not null,
  ok boolean not null,
  checked integer not null default 0,
  failures integer not null default 0,
  error text
);

create index if not exists health_runs_started_at_idx
  on health_runs (started_at desc);
