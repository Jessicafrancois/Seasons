# Seasons Studio: modular workspace

Seasons Studio is a private control room separate from the public PWA, available at `/studio/` only after server authentication.

## Architecture

```text
private/studio/
  index.html               minimal application shell
  app.js                   navigation and data loader
  styles/studio.css        responsive shared design system
  components/ui.js         reusable controls, cards and tables
  pages/workspace.js       Overview, Inquiries, Alerts, Inventory, seasonal and platform views
  editor/opening.js        Opening Grid Editor with preview controls
  data/opening-draft.json  generated locally, not part of source control

server/
  studio-data.js           public route registry from canonical season modules
  studio-operations.js     inquiry intake and read-only operational summaries
  studio-drafts.js         validated, development-only local editor drafts
```

Only allowlisted Studio assets are accessible via `/studio/assets/*` and require the same authentication as the Studio document. No private data directory is served over HTTP. The existing public PWA stays in `public/` and is not reorganized.

## Local development

Use Node.js 22+. Set `STUDIO_USERNAME` and a unique long `STUDIO_PASSWORD` as environment variables outside Git. Launch `npm run dev` and visit `http://localhost:3000/studio/`. The temporary HTTP Basic protection is acceptable only for trusted local testing. A deployment requires HTTPS and proper session authentication; **do not expose this version as an admin panel on a public host**.

To enable a locally persisted editor draft, set `STUDIO_LOCAL_DRAFTS=true` and ensure `NODE_ENV` is not `production`. Draft files are written under `private/studio/data/` on the local filesystem and never published. Keep that path out of version control. Serverless deployment cannot be trusted to preserve local file changes.

For the future inquiry inbox, configure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` server-side after applying `database/20261120_seasons_studio_operations.sql` to the chosen project. The form fails clearly when the integration is unavailable. Never place privileged keys in public files.

## Current functionality

- Responsive operational workspace, modular sidebar and page navigation.
- Overview using real route registry and available operational records; analytics and drafts remain unreported if not connected.
- Inquiry Center with local filtering for latest 25 stored records when Supabase is configured, read-only.
- Alerts reading stored records only; automated monitoring is not yet operational.
- Searchable/filterable page inventory of public PWA routes.
- Current season overview and read-only catalog of project/track routes.
- Opening grid property preview and validated local draft save in opted-in development.
- Integration and system status views with clear unavailable states.
- Reusable UI primitives and shared styles.

## Not implemented yet

- Modern production login with accounts, MFA, roles and server-signed sessions.
- Reliable serverless/database-backed editor versions, revisions, history, preview URLs and public publishing.
- Notion bidirectional editorial sync.
- Real media library, upload processing, copyright/license management.
- Inquiry reply workflow, assignment, status editing, and full pagination.
- Automatic alert ingestion, analytics, and full health checks.
- Production-ready anti-abuse, validation and privileged audit logging.

## Verification

Run `npm test` and `node --check` against all changed JavaScript, or review the `Seasons Studio checks` GitHub workflow. Tests cover the canonical 14-route fixture, protected asset delivery, disabled integration behavior, draft guards and settings validation. Browser visual inspection and all connected-service integration tests remain necessary before deployment.

This branch is a development implementation, not a production release.


## Integrations register (November 2026)

Studio → **Notion & Integrations** now shows a credential-safe read-only register supplied by `GET /studio/api/integrations` through the existing private Studio auth gate. The endpoint never returns token values, URLs, email addresses or private object names. Status definitions:

- **Configured · not verified:** required environment variables are present but no external access check is implied.
- **Setup pending:** some server configuration exists, but the feature (such as storage uploads or mail delivery) still needs implementation or verification.
- **Not configured:** necessary server-side settings are absent.
- **Planned:** no service has been connected or authenticated.

The register groups Notion editorial content, Supabase operations and storage, email, Spotify, Apple Music, and privacy-conscious analytics. It never sends mail, alters editorial content, publishes a release, or grants rights.

**Configuration responsibilities:** Notion is the editorial source; Supabase is the protected operational database and asset store; any email provider must support verified-domain outbound delivery and signed inbound webhooks. Public music links are distinct from user OAuth access. Access to confidential integrations must remain server-side.

**Next implementation gates:** authenticate the founder with a production-safe Studio session; verify Notion database and page scopes; probe Supabase read permissions and storage buckets; choose email provider and domain; create webhook verification and message threading; add consent-aware analytics. Record failed checks without leaking credentials. Never treat a credential-presence check as successful remote validation.

Tests: `tests/studio-integrations.test.js`. In Codespaces run `npm test`. The main-branch GitHub Actions workflow includes the server module in syntax checks.


## Configure integrations from the Studio dashboard

Select **Notion & Integrations** in the private Studio and choose **Configure** beside a provider. The panel lists the exact server environment variables and links to the provider's own setup area. Select **Copy name** to help create each secret. Keep secret **values** in [GitHub Codespaces secrets](https://github.com/settings/codespaces) or your deployed server's environment settings, not in a client form or GitHub source files. Restart the Codespace after updating secrets. Choose **Test connection** to check the server's credentials against the supported provider API and read the result inline. Tests never persist or disclose credentials, and do not perform editorial, media, email-delivery or rights mutations.

Supported tests:
- **Notion:** get current integration/bot user. Requires `NOTION_TOKEN`. Does not validate access to all Seasons pages, which must also be shared.
- **Supabase Database:** read-only zero-row query to the existing Seasons inquiries table. Requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- **Supabase Storage:** retrieve the named bucket metadata. The default bucket name is `seasons-private-documents`, override with `SEASONS_PRIVATE_BUCKET`. A successful response does not prove upload/download authorization.
- **Email:** Resend domain list check. Requires `SEASONS_EMAIL_PROVIDER=resend` and `SEASONS_EMAIL_API_KEY`. Mail sending, inbound webhooks and threading remain disabled.
- **Spotify:** app-level OAuth client credentials test. Requires `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`. Not a user Spotify account connection.
- **Apple Music:** catalog API developer-token test. Requires `APPLE_MUSIC_DEVELOPER_TOKEN`. Not MusicKit listener authorization.
- **Analytics:** read-only Plausible aggregate query. Requires `PLAUSIBLE_SITE_ID` and `PLAUSIBLE_API_KEY`. No browser analytics script is installed.

**Security boundary:** The existing shared Basic authorization in Studio is still for trusted local testing. Because full production sessions, MFA, CSRF hardening, and key rotation have not been completed, this build deliberately does **not** accept token/secret values in a Studio browser form. Once those prerequisites are ready, we can implement an encrypted credential vault and provider OAuth connection flows. Do not expose a public administrator site behind a shared Basic password.

A successful test establishes only that a particular provider's credential-level endpoint responded, not that data synchronization, email delivery, publishing, or licensing is live.
