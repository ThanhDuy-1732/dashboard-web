create or replace function claim_health_run(stale_after_seconds integer default 30)
returns boolean
language sql
as $$
  with claimed as (
    update settings
       set health_run_locked_at = now()
     where id = 1
       and (
         health_run_locked_at is null
         or health_run_locked_at < now() - make_interval(secs => stale_after_seconds)
       )
    returning id
  )
  select exists(select 1 from claimed);
$$;

create or replace function release_health_run()
returns void
language sql
as $$
  update settings set health_run_locked_at = null where id = 1;
$$;
