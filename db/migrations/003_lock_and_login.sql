alter table settings add column if not exists health_run_token uuid;

drop function if exists claim_health_run(integer);
create function claim_health_run(stale_after_seconds integer default 120)
returns uuid
language sql
as $$
  with claimed as (
    update settings
       set health_run_locked_at = now(),
           health_run_token = gen_random_uuid()
     where id = 1
       and (
         health_run_locked_at is null
         or health_run_locked_at < now() - make_interval(secs => stale_after_seconds)
       )
    returning health_run_token
  )
  select health_run_token from claimed;
$$;

drop function if exists release_health_run();
create function release_health_run(token uuid)
returns void
language sql
as $$
  update settings
     set health_run_locked_at = null,
         health_run_token = null
   where id = 1
     and health_run_token = token;
$$;

create table if not exists login_attempts (
  id bigserial primary key,
  ip_hash text not null,
  attempted_at timestamptz not null default now()
);

create index if not exists login_attempts_ip_time_idx
  on login_attempts (ip_hash, attempted_at desc);
