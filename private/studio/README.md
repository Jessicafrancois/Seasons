# Seasons Studio foundation (Stage 1)

Branch: `feature/seasons-studio-foundation`.

The existing public site and PWA remain unchanged. The private operational shell is served at `/studio/` from outside `public/`, so its source cannot be fetched by ordinary static-file URLs.

## Local preview

Run Node.js 22+:

```sh
STUDIO_USERNAME=admin STUDIO_PASSWORD='replace-with-a-unique-long-secret' npm run dev
```

Open `http://localhost:3000/studio/` and enter the local credentials. Without both environment variables, Studio returns 503 and stays unavailable. Never put these values in the public folder, browser JavaScript, or Git history.

In a hosted environment, **require HTTPS** before using HTTP Basic authentication. This is temporary single-owner scaffolding, not the final authentication system. Before deploying Studio publicly, replace Basic authentication with secure managed login, server-validated sessions, MFA, role-based authorization, CSRF protection for write actions, request throttling, audit logs, and short session lifetimes. Do not reuse the password on any other service.

## What is implemented

- Separate private Studio URL and server-enforced authentication.
- Editorial overview layout with navigation for all planned sections.
- Explicit unavailable states, not invented visitor counts or alerts.
- A public-site link.
- No new dependencies and no changes to existing offline caching.

## Still to implement

- Real page inventory from current route and season registries.
- Inquiry intake and private inbox (current public form only downloads an unsent brief).
- Database-backed alert records, analytics integration, and content-status reporting.
- Notion synchronization and media storage.
- Page editor, versioning, preview and publishing workflows.
- Production-grade authentication and authorization.

No inquiry forms, data storage, or publishing actions are active in this stage. Do not enter live personal inquiry data here.
