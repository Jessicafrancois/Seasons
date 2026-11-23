-- Distributed fail-closed authentication throttle across all server instances.
create table if not exists public.seasons_studio_auth_limits (
 identifier_hash text primary key check(identifier_hash ~ '^[a-f0-9]{64}$'),
 window_started_at timestamptz not null default now(),
 attempts integer not null default 0 check(attempts >= 0),
 updated_at timestamptz not null default now()
);
alter table public.seasons_studio_auth_limits enable row level security;
revoke all on public.seasons_studio_auth_limits from public,anon,authenticated;
grant select,insert,update,delete on public.seasons_studio_auth_limits to service_role;

create or replace function public.seasons_studio_auth_limit_check(p_identifier_hash text,p_max_attempts integer,p_window_seconds integer)
returns boolean language plpgsql security invoker set search_path=''
as $$
declare v_attempts integer;
begin
 if p_identifier_hash !~ '^[a-f0-9]{64}$'
    or p_max_attempts < 1 or p_max_attempts > 30
    or p_window_seconds < 60 or p_window_seconds > 86400 then return false; end if;
 insert into public.seasons_studio_auth_limits(identifier_hash,window_started_at,attempts,updated_at)
 values(p_identifier_hash,now(),1,now())
 on conflict(identifier_hash) do update
 set attempts=case when public.seasons_studio_auth_limits.window_started_at < now()-make_interval(secs=>p_window_seconds)
                   then 1 else public.seasons_studio_auth_limits.attempts+1 end,
     window_started_at=case when public.seasons_studio_auth_limits.window_started_at < now()-make_interval(secs=>p_window_seconds)
                         then now() else public.seasons_studio_auth_limits.window_started_at end,
     updated_at=now()
 returning attempts into v_attempts;
 return v_attempts<=p_max_attempts;
end;
$$;
revoke all on function public.seasons_studio_auth_limit_check(text,integer,integer) from public,anon,authenticated;
grant execute on function public.seasons_studio_auth_limit_check(text,integer,integer) to service_role;
