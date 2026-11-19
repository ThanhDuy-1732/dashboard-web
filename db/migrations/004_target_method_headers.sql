alter table apps add column if not exists health_method text not null default 'GET';
alter table apps add column if not exists health_headers jsonb not null default '{}';
