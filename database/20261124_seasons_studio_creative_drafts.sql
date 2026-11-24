create table if not exists public.seasons_studio_creative_drafts (
 draft_key text primary key check (length(draft_key) between 1 and 160),
 payload jsonb not null check (jsonb_typeof(payload)='object'),
 revision integer not null default 1 check (revision>0),
 updated_by uuid not null references auth.users(id),
 updated_at timestamptz not null default now()
);
alter table public.seasons_studio_creative_drafts enable row level security;
revoke all on table public.seasons_studio_creative_drafts from public, anon, authenticated;
grant select,insert,update on table public.seasons_studio_creative_drafts to service_role;