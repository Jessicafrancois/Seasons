# Atelier implementation register

Phase 1 was built against the existing Seasons application. The working checkout contained staged and unstaged changes, so implementation used a clean clone of remote main. The master directive permits proceeding without the previous implementation package. The candidate ZIP and detailed integration handoff were unavailable.

| Feature | Workspace | Dependencies | Implementation | Tests and acceptance evidence | Configuration | Deployment | Limitations and outstanding requirements |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Shared playback clock | Canvas and Motion | Browser animation frames and Web Animations API | Entrance tracks share a clock in the timeline and canvas preview. Timeline play, stop and scrub use the same animation time. | Node clock and cancellation tests. Chromium exercised timeline playback and reset after stop. | Native browser runtime | Vercel deployment successful | Hover, click and viewport effects run from their event triggers. |
| Plugin registry and settings | Canvas and Plugin Library | Studio secure session and Seasons Supabase | Validated built-in manifests, searchable library, enablement and default duration. Existing disabled effects remain in documents and render without animation. | Chromium exercised secure sign-in, settings save and reload, effect application, disabled state and preview fallback with a fixture Supabase backend. | Settings migration applied to Seasons. RLS is enabled and direct access is revoked for browser roles. | Database configured. Vercel deployment successful. | Runtime availability reports browser Web Animations support. Planned integrations have no runtime or controls. |
| Versioned documents and trusted mutation checks | Canvas and Compose | Existing revision store and plugin registry | Schema v2 identifies the plugin behind each effect. Version 1 normalizes in memory. Saves validate plugin ownership and enablement and use the existing revision conflict check. An exact restore of an owned historical snapshot creates a new revision. | Node contract tests. Chromium verified legacy save, invalid preset ownership, CSRF, disabled effect updates, stale saves and historical restore. | Existing Studio authorization and revision trigger | Vercel deployment successful | Existing snapshots retain their original schema and contents. |
| Approved integrations | Motion through Film Composition | Motion, Theatre.js, Lenis, Rive, Konva.js, dotLottie, WaveSurfer.js, Three.js, Mux, Remotion | Planned in that order | Pending | Pending | Pending | Detailed handoff outstanding. Paid infrastructure and experimental publication require approval. |

## Phase 1 verification

The Phase 1 code commit `f41b631` reported a successful [Vercel deployment](https://vercel.com/jessicafrancois-projects/seasons/DDokrWsFdpQYBosVrVkjAjVyx9dV). The focused suite passed 14 checks. The full suite passed 66 of 67 checks, with the same PostHog failure observed on baseline. The authenticated Chromium test ran locally with fixture data. Live login and writes were outside that run.

## Repeat verification

Run `node --test tests/studio-atelier-*.test.js tests/studio.test.js` for the focused automated checks. Run `npm test` for the full suite. The audited baseline had a PostHog test failure while parsing an undefined request body.

To repeat the browser flow on Linux with Chromium installed, use Playwright Core 1.65.1 in a temporary directory. The harness exercises the real Studio HTTP server, login UI, session cookie, CSRF and Atelier routes with simulated Supabase responses. It creates no live documents or settings.

```sh
npm install --prefix /tmp/seasons-browser playwright-core@1.65.1
ATELIER_PLAYWRIGHT=/tmp/seasons-browser/node_modules/playwright-core/index.mjs \
  node tests/browser/atelier-phase-1.mjs
```

Set `ATELIER_CHROMIUM` if Chromium is installed outside `/usr/bin/chromium`.
