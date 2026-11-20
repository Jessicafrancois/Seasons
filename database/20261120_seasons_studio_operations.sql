-- Seasons Studio: server-managed inquiry and alert records.
-- Apply in Supabase SQL Editor after reviewing the target project.
create extension if not exists pgcrypto;

create table if not exists public.seasons_inquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  contact_name text not null check (char_length(contact_name) between 1 and 120),
  contact_email text not null check (char_length(contact_email) between 3 and 254),
  inquiry_type text not null check (inquiry_type in ('Collaboration','Sampling inquiry','Commercial use','General inquiry')),
  message text not null check (char_length(message) between 10 and 5000),
  project_id text,
  status text not null default 'new' check (status in ('new','reviewing','awaiting_reply','resolved','closed')),
  internal_notes text not null default '',
  source text not null default 'seasons_pwa'
);
create index if not exists seasons_inquiries_status_created_idx on public.seasons_inquiries(status, created_at desc);

create table if not exists public.seasons_alerts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  severity text not null check (severity in ('critical','attention','info')),
  category text not null,
  title text not null,
  details text not null default '',
  source_key text,
  status text not null default 'open' check (status in ('open','acknowledged','resolved'))
);
create index if not exists seasons_alerts_open_idx on public.seasons_alerts(status, created_at desc);

alter table public.seasons_inquiries enable row level security;
alter table public.seasons_alerts enable row level security;

-- No anon/authenticated RLS policies. Only server-held service-role credentials
-- may read or write through PostgREST; never expose them to the browser.
revoke all on public.seasons_inquiries, public.seasons_alerts from anon, authenticated;
grant all on public.seasons_inquiries, public.seasons_alerts to service_role;
