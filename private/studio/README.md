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

- Activation and independent security audit of the new individual MFA login, server-side sessions, and encrypted credential management.
- Reliable serverless/database-backed editor versions, revisions, history, preview URLs and public publishing.
- Notion bidirectional editorial sync.
- Real media library, upload processing, copyright/license management.
- Inquiry reply workflow, assignment, status editing, and full pagination.
- Automatic alert ingestion, analytics, and full health checks.
- Production-ready anti-abuse, validation and privileged audit logging.

## Verification

Run `npm test` and `node --check` against all changed JavaScript, or review the `Seasons Studio checks` GitHub workflow. Tests cover the canonical 14-route fixture, protected asset delivery, disabled integration behavior, draft guards and settings validation. Browser visual inspection and all connected-service integration tests remain necessary before deployment.

This code is on main but remains an opt-in security implementation, not a production approval.


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

**Security boundary:** Shared Basic authorization remains for trusted local testing only. The in-app encrypted credential-entry form is available exclusively after individual MFA sign-in with a valid Founder membership, a CSRF-protected session, and a configured versioned keyring. Deployment hardening and independent security review are still required before production activation.

A successful test establishes only that a particular provider's credential-level endpoint responded, not that data synchronization, email delivery, publishing, or licensing is live.

## Click-to-authorize account connections (November 23, 2026)

The Integrations screen is now a clickable service directory. Select any service to open a permission review dialog. Notion and Spotify support a real provider-hosted authorization flow when explicitly configured. Other providers explain their developer-key or product-specific setup instead of presenting an imitation OAuth screen.

**Server-side encrypted OAuth vault**: `database/20261123_studio_oauth_connections.sql` (applied to the connected Seasons Supabase project). The table is RLS protected with no anon/authenticated access; only the trusted server stores AES-256-GCM-encrypted tokens. The encryption key is never stored in Supabase.

**Required settings for opt-in Codespace development only:**

```text
STUDIO_OAUTH_ENABLED=true
STUDIO_OAUTH_ORIGIN=https://YOUR-CODESPACE-FORWARDED-PORT-3000-URL
STUDIO_SESSION_CSRF_KEY=<64 random hex characters>
SUPABASE_URL=<your existing Seasons Supabase URL>
SUPABASE_SERVICE_ROLE_KEY=<server-only key>
NOTION_OAUTH_CLIENT_ID=<public Notion integration client ID>
NOTION_OAUTH_CLIENT_SECRET=<server-only Notion client secret>
SPOTIFY_CLIENT_ID=<Spotify developer application client ID>
SPOTIFY_CLIENT_SECRET=<server-only Spotify client secret>
```

Configure **the exact callback URI** `<STUDIO_OAUTH_ORIGIN>/studio/oauth/callback` in both providers' application dashboards before testing. The origin must match the current Codespace forwarded HTTPS address. Generating a new Codespace URL requires updating the provider's allowlisted redirect URL and `STUDIO_OAUTH_ORIGIN`.

For Notion: create a **public** Notion integration with the required capabilities and provide only the pages/databases you select. The provider's consent screen determines the final access. For Spotify: only the `user-read-private` scope is requested; nothing is added to a library or playlist.

Click **Continue to Notion** or **Continue to Spotify** from the permission dialog. On success, Studio stores encrypted access/refresh tokens and displays the account's connection status. The **Disconnect from Studio** action removes stored tokens, but does not revoke the grant at the provider; use the provider's connected-app settings for complete revocation.

**Safety:** `STUDIO_OAUTH_ENABLED` is ineffective until `STUDIO_AUTH_MODE=secure` is configured with individual MFA-verified sessions and the versioned encryption keyring. The complete production access upgrade (individual Supabase Auth login, MFA, hardened sessions and CSRF/security review) must precede activation of OAuth in a public-facing administrative Studio. The UI may be viewed on the deployed site, but it will explain that real account authorization needs configuration or the secure login upgrade.

Provider authentication success does not synchronize Notion content or publish a release. Those remain separate, explicit workflows. The server does not return raw OAuth tokens to the browser.

## Production security foundation: staged on main (2026-11-23)

The application now includes opt-in individual authentication, TOTP enrollment and challenge verification, server-revocable opaque sessions, permission checks, CSRF validation, and founder-only encrypted credential entry.

**Do not enable on a public production deployment without passing the security checklist and reviewing your actual Node deployment architecture.** The former Basic login may still operate in a trusted Codespace development environment. The production default denies Studio when the secure mode is not configured. Never set `STUDIO_AUTH_MODE=local-basic` in production.

### 1. Provision the first founder identity

Use the **existing Seasons Supabase project**. From Authentication → Users, invite or create your own account with a verified email. Enable **TOTP MFA** in the Supabase Auth settings. Create an active membership only after verifying the real Auth user ID:

```sql
insert into public.seasons_studio_members
 (user_id, role, confidentiality_clearance, is_active)
values ('<verified-auth-user-uuid>', 'Founder', 'Founder Private', true);
```

Replace the placeholder with the actual verified `auth.users.id`. Never insert directly into `auth.users`, and never grant a membership based only on an unverified email. Initially, public Studio registration is disabled. To enroll TOTP, open `/studio/login`, select **First time here? Set up your authenticator**, enter your own credentials, copy the provided one-time authenticator secret into your authenticator app, and verify its current six-digit code. Then sign in normally.

### 2. Configure private server secrets

Set these secrets in Codespaces and in your **actual server runtime** (which may differ from the frontend hosting deployment). Restart or redeploy the runtime after saving them:

```text
STUDIO_AUTH_MODE=secure
STUDIO_PUBLIC_ORIGIN=https://your-real-studio-domain
STUDIO_SESSION_CSRF_KEY=<independent 64-hex-character random value>
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<private server-side credential>
SUPABASE_PUBLISHABLE_KEY=<Supabase publishable key>
STUDIO_VAULT_ACTIVE_KEY_ID=key2026
STUDIO_VAULT_KEYS={"key2026":"<another independent 64-hex-character random value>"}
```

Use Node's `crypto.randomBytes(32).toString('hex')` to generate **different** random values for the session CSRF signing key and the vault encryption key. Never publish these values in GitHub, chats, analytics or logs. Store the keyring in a restricted environment-secret manager. A managed KMS is recommended for mature deployments; this version uses versioned environment-managed keys and requires a documented, tested rotation procedure.

The server requires `STUDIO_PUBLIC_ORIGIN` to match the browser's **exact HTTPS origin** in production. Local Codespaces testing may use HTTP only on localhost or a securely forwarded environment. Verify deployment routing, TLS, trusted proxy headers and persistence before switching production traffic. Supabase tables are versioned in `database/20261123_studio_revocable_sessions_credentials.sql`; the audit table is described in `database/20261123_studio_credential_events.sql`.

### 3. Connect a provider

From Studio → Notion & Integrations, click a card.

- **Notion and Spotify:** configure OAuth client ID and secret in the server environment, `STUDIO_OAUTH_ENABLED=true` and `STUDIO_OAUTH_ORIGIN` (exact HTTPS origin). Register `/studio/oauth/callback` with each provider. Provider permission consent starts through a CSRF-protected action. Tokens are encrypted under the versioned `STUDIO_VAULT_KEYS` keyring; the separate legacy `STUDIO_OAUTH_ENCRYPTION_KEY` is no longer used.
- **Resend, Supabase, Apple Music and Plausible:** a signed-in founder can securely enter the required credential fields into the Studio dialog. The server runs a read-only provider check and, only on success, encrypts and saves the credentials. The browser never sees saved values again. Replacing and deleting credentials are supported. Encryption changes are audited.
- **Limits:** A successfully verified and saved credential is not automatically a live email pipeline, content synchronization, music-account authorization, or publishing grant. The existing inquiry backend uses the primary Supabase server environment; saved additional Supabase credentials do not change it automatically. Individual integrations must be activated through separately permissioned workflows.

### 4. Session and account operations

- Session identifiers are random 256-bit values. Only their SHA-256 hashes are stored in Supabase, with a 30-minute inactivity expiry and an eight-hour absolute maximum.
- The cookie is `HttpOnly`, `SameSite=Lax` (required for OAuth redirect callbacks), and `Secure` in production.
- Session status and active membership are checked on each protected request. Sign-out revokes the server-side session. Deactivating a Studio membership blocks that member immediately.
- The session endpoint supplies a CSRF token only to the authenticated private browser UI; credential writes and account connection changes require it and a trusted origin. Credential management is Founder-only and requires a recent (within ten minutes) MFA sign-in.
- To terminate all sessions in an incident, revoke the affected user's rows in `seasons_studio_sessions` in the protected database and deactivate the membership. Revoke relevant provider credentials separately.

### Production review gates still required

Review MFA account recovery; rate limiting that is shared across all server instances (the current in-memory throttle is not sufficient for horizontally scaled deployments); login and session activity monitoring; load tests; key rotation and KMS options; deployment-origin and reverse-proxy assumptions; backup/recovery; provider permission audits; OAuth token refresh/revocation; and complete end-to-end security tests. These are not waived by a passing syntax check.

`npm test` includes authentication and encryption regression tests. No real credentials are used in these tests.

### Check setup before enabling secure mode

Run `npm run studio:preflight` in the Codespace after its secrets are loaded. It prints only variable names and OK/MISSING indicators, not secret values. Fix any missing settings before opening `/studio/login`. Passing preflight does **not** confirm MFA enrollment, database membership, provider authorization, session revocation, deployment safety, or full integration tests. The public Vercel site may be on a separate runtime from your Codespace and requires its own secrets and deployment checks.
