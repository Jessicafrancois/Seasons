create table if not exists public.seasons_atelier_documents (
 id uuid primary key, owner_id uuid not null references auth.users(id),
 name text not null check (char_length(name) between 1 and 200),
 kind text not null check (kind in ('page','section','component','editorial','experience','scene','moodboard','storyboard','experiment')),
 document jsonb not null check (jsonb_typeof(document)='object' and octet_length(document::text)<=250000),
 revision integer not null check (revision>=1),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists seasons_atelier_documents_owner_updated on public.seasons_atelier_documents(owner_id,updated_at desc);
create table if not exists public.seasons_atelier_revisions (
 document_id uuid not null references public.seasons_atelier_documents(id),
 revision integer not null check(revision>=1), name text not null, document jsonb not null,
 created_at timestamptz not null default now(), primary key(document_id,revision)
);
alter table public.seasons_atelier_documents enable row level security;
alter table public.seasons_atelier_revisions enable row level security;
revoke all on public.seasons_atelier_documents,public.seasons_atelier_revisions from public,anon,authenticated;
grant select,insert,update on public.seasons_atelier_documents to service_role;
grant select,insert on public.seasons_atelier_revisions to service_role;
create or replace function public.seasons_atelier_record_revision() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='UPDATE' and (new.revision<>old.revision+1 or new.owner_id<>old.owner_id or new.id<>old.id or new.kind<>old.kind) then raise exception 'Invalid Atelier revision'; end if;
 insert into public.seasons_atelier_revisions(document_id,revision,name,document) values(new.id,new.revision,new.name,new.document);
 return new;
end;
$$;
revoke all on function public.seasons_atelier_record_revision() from public,anon,authenticated;
grant execute on function public.seasons_atelier_record_revision() to service_role;
create trigger seasons_atelier_revision_snapshot after insert or update on public.seasons_atelier_documents for each row execute function public.seasons_atelier_record_revision();