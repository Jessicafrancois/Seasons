create table if not exists public.seasons_studio_notion_sources (
 source_key text primary key check (source_key in ('seasons','fall','opening','records','references','inspiration')),
 source_id uuid not null,
 registered_by uuid not null references auth.users(id),
 registered_at timestamptz not null default now()
);
alter table public.seasons_studio_notion_sources enable row level security;
revoke all on table public.seasons_studio_notion_sources from public, anon, authenticated;
grant select, insert, update, delete on table public.seasons_studio_notion_sources to service_role;
