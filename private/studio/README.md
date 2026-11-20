# Seasons Studio operations foundation (Stages 1–2)

Branch: `feature/seasons-studio-foundation`. The branch is not deployed or merged.

## Local startup

With Node.js 22+, set local environment variables outside version control:

- `STUDIO_USERNAME` and `STUDIO_PASSWORD` for temporary Basic authentication to `/studio/`.
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` for live server-only inquiry and alert storage.

Run `npm run dev`, then visit `http://localhost:3000/studio/`. Without Studio credentials, the private route fails closed with HTTP 503. Without Supabase credentials, inquiry POST requests return HTTP 503 and the UI explicitly says they were not delivered.

Apply `database/20261120_seasons_studio_operations.sql` in the intended Supabase project before enabling credentials. The script creates restricted inquiry and alert tables. Do not put the service-role key in Git, any public file, or frontend JavaScript.

The published PWA must use HTTPS in production. **The Stage 1 Basic authentication is only temporary local scaffolding. Do not deploy the admin interface publicly with this authentication.** Replace it with a managed identity provider, MFA, server-verified short sessions, authorization, logout/revocation, request protections, and audit logs. Add dedicated abuse protection such as server-side CAPTCHA verification and persistent rate limiting before publicly enabling submission. The current rate limiter is per Node process only.

## Implemented on branch

- `GET /studio/api/overview`: protected, no-cache JSON containing the current route inventory, season metadata, and available operations records.
- Route inventory derives from the same seasonal content modules used by the public router, including core pages, chapters, projects, and tracks. Its count means *configured routes*, not independently tested page health.
- `POST /api/inquiries`: same-origin JSON intake, input validation, honeypot and process-local rate limit, with private Supabase insertion when configured.
- Public inquiry form provides explicit successful/failed delivery messages. The original brief download is replaced on this branch.
- Schema for `seasons_inquiries` and `seasons_alerts` with RLS and no public table access.
- Studio Overview renders counts and recent records when connected; otherwise it reports the missing integration.
- Public PWA cache version updated to v5.

## Testing required before merge or deployment

1. Run `node --check server.js`, `node --check server/studio-data.js`, `node --check server/studio-operations.js`, and `node --check public/js/app.js`.
2. Confirm `/studio/` and `/studio/api/overview` are inaccessible without credentials, and that no files under `private/` can be reached as static assets.
3. Confirm route inventory shows 14 configured routes for current Fall fixture (7 core + 1 season + 3 projects + 3 tracks). Future content can change this count.
4. With storage unset, confirm inquiry submission returns 503 and the form does not claim success.
5. On a nonproduction Supabase project with schema applied, send a test inquiry and verify one row is saved and visible only to the authenticated Studio API. Test malformed inputs and rate limits.
6. Verify the published PWA still loads, navigates, and works offline after cache migration.
7. Verify mobile layout, accessibility, and safe handling of user-submitted content.

## Still pending

- Production authentication, security review and deployment.
- Full inquiry inbox with read, reply, assignment, notes and status workflows.
- Real system health monitoring that produces alert rows. The alert table is only a foundation.
- Notion synchronization and media integrations.
- True analytics, draft management, page previews, editing and publishing.
- Reliable global inquiry counts beyond the latest 25 records; summary currently labels this scope explicitly.

No Supabase project has been connected by these code changes alone.
