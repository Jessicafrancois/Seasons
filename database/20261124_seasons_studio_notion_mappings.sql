create table if not exists public.seasons_studio_notion_mappings (
 source_key text primary key references public.seasons_studio_notion_sources(source_key) on delete cascade,
 mappings jsonb not null check (jsonb_typeof(mappings) = 'array' and jsonb_array_length(mappings) <= 40),
 updated_by uuid not null references auth.users(id),
 updated_at timestamptz not null default now()
);
alter table public.seasons_studio_notion_mappings enable row level security;
revoke all on table public.seasons_studio_notion_mappings from public, anon, authenticated;
grant select, insert, update, delete on table public.seasons_studio_notion_mappings to service_role;