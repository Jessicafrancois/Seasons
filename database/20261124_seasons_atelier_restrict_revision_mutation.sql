revoke all on public.seasons_atelier_documents,public.seasons_atelier_revisions from service_role;
grant select,insert,update on public.seasons_atelier_documents to service_role;
grant select,insert on public.seasons_atelier_revisions to service_role;