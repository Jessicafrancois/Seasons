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

## Individual identity and founder permissions: staged foundation (Nov 23, 2026)

The connected Seasons Supabase project now contains `public.seasons_studio_members`, keyed to `auth.users(id)`.
This private registry holds `role`, `confidentiality_clearance`, `is_active` and invitation/audit metadata.
RLS is enabled with no public read policies; the server-side service role is the only currently granted data-access role.
No users or founder memberships have been fabricated.

The server-only `server/studio-permissions.js` defines a **deny-by-default policy** for the planned
Founder, Studio Manager, Reviewer, and Viewer roles. Founder Private records require a Founder role
and Founder Private clearance. Replying and managing records are separate from making founder
approval decisions, converting inquiries into opportunities, signing agreements, or activating rights.
Tests are in `tests/studio-permissions.test.js`.

**Not activated:** the current HTTP Basic gate in `server.js` does not yet check this membership
registry. Do **not** mistake the existence of this table or policy module for live per-user authorization.
Inquiries and Opportunities are still server-only/read-only under the existing basic gate, and their
newly created protected readers are not yet wired into the modular Studio UI.

### Safe cutover requirements

1. Enroll a real founder account through Supabase Auth, with verified email and MFA appropriate to
   the chosen authentication method. Never hand-write records into `auth.users`.
2. Assign Founder membership through a trusted administrative operation after independently
   verifying the account identity. No self-service Founder grants.
3. Build a secure server-side session (HttpOnly, Secure, SameSite cookies; session expiry/revocation),
   verify it on every Studio API request and resolve an active member from the private table.
4. Apply `studioCan` to every server endpoint and filter every private record by clearance before
   returning it. Protect audit trails, membership changes, and founder decision flows separately.
5. Test unauthenticated requests, role downgrade/revocation, active session expiry, account mismatch,
   Founder Private access denial, and all signed-document/rights state transitions.
6. Remove the shared-password fallback before considering a public Studio deployment. Keep Studio
   disabled when auth configuration or membership resolution fails.

No email sending, signing, rights activation, or Notion sync is enabled by this foundation.
