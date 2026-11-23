-- Audit only changes to encrypted integration credentials. Never record plaintext secrets.
create table if not exists public.seasons_studio_credential_events (
 id uuid primary key default gen_random_uuid(),
 provider text not null,
 event_type text not null check (event_type in ('created','replaced','removed')),
 performed_by uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
alter table public.seasons_studio_credential_events enable row level security;
revoke all on public.seasons_studio_credential_events from public,anon,authenticated;
grant select,insert on public.seasons_studio_credential_events to service_role;
