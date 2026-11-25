create table if not exists public.seasons_atelier_plugin_settings (
 owner_id uuid not null references auth.users(id),
 plugin_id text not null check (plugin_id in ('motion-effects','cinematic-transitions','interactive-motion')),
 enabled boolean not null,
 duration integer not null check (duration between 100 and 10000),
 primary key (owner_id,plugin_id)
);
alter table public.seasons_atelier_plugin_settings enable row level security;
revoke all on public.seasons_atelier_plugin_settings from public,anon,authenticated;
grant select,insert,update on public.seasons_atelier_plugin_settings to service_role;
