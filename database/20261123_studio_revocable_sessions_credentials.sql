-- Studio security: no anonymous or browser access to private credentials / sessions.
create table if not exists public.seasons_studio_sessions (
 session_hash text primary key check (session_hash ~ '^[a-f0-9]{64}$'),
 user_id uuid not null references auth.users(id) on delete cascade,
 csrf_hash text not null check (csrf_hash ~ '^[a-f0-9]{64}$'),
 mfa_verified_at timestamptz not null,
 created_at timestamptz not null default now(),
 last_seen_at timestamptz not null default now(),
 idle_expires_at timestamptz not null,
 absolute_expires_at timestamptz not null,
 revoked_at timestamptz,
 constraint studio_session_lifetime check (idle_expires_at <= absolute_expires_at)
);
create index if not exists seasons_studio_sessions_user_idx on public.seasons_studio_sessions(user_id);
alter table public.seasons_studio_sessions enable row level security;
revoke all on public.seasons_studio_sessions from public,anon,authenticated;
grant select,insert,update,delete on public.seasons_studio_sessions to service_role;
create table if not exists public.seasons_studio_credentials (
 provider text primary key check (provider in ('supabase','email','apple-music','analytics')),
 key_id text not null check (length(key_id) between 1 and 48),
 ciphertext text not null,
 configured_by uuid not null references auth.users(id),
 configured_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.seasons_studio_credentials enable row level security;
revoke all on public.seasons_studio_credentials from public,anon,authenticated;
grant select,insert,update,delete on public.seasons_studio_credentials to service_role;
