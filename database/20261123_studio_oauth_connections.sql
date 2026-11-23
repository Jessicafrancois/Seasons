-- Apply in the Seasons Supabase project before enabling the private OAuth connection flow.
-- The encrypted tokens require STUDIO_OAUTH_ENCRYPTION_KEY on the server, not in SQL or source control.
create table if not exists public.seasons_studio_oauth_connections (
 provider text primary key check (provider in ('notion','spotify')),
 encrypted_access_token text not null,
 encrypted_refresh_token text,
 token_expires_at timestamptz,
 external_account_label text,
 connected_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.seasons_studio_oauth_connections enable row level security;
revoke all on public.seasons_studio_oauth_connections from public, anon, authenticated;
grant select, insert, update, delete on public.seasons_studio_oauth_connections to service_role;
