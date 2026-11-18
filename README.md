# Seasons

Run `npm run dev` with Node.js 22 or later and open port 3000. Set `PORT` to use a different port.

`public/index.html` is the shared shell. The Fall export's styling is in `public/styles/seasons.css`, with shared fonts and profile artwork in `public/assets`. The hash router, page modules, and shared components are in `public/js`. Each season has a folder in `public/seasons/<slug>/` for its content module and bundled artwork.

## Add another season

1. Create `public/seasons/<season-slug>/content.js` using `public/seasons/fall/content.js` as the example with a unique season slug, number, title, intro, themes, description, quote, cover, CTA labels, playlist URLs, projects, and tracks. Keep project IDs unique across seasons because projects use `/#/projects/<id>`.
2. Put its bundled artwork in the same season folder. Import the new module in `public/js/content/index.js`, add it to the season list, and set `currentSeason` when it launches. The homepage shows the active season, the Seasons tab lists all chapters, and Explore can filter by season. New seasons use `/#/seasons/<slug>` and `/#/tracks/<slug>/<number>`. Fall's existing links are preserved.
3. Add the new local module and assets to `STATIC_FILES` in `public/service-worker.js` and bump its cache version so the new season can open offline.

The current content model uses one recording collection per season. Audio, Notion, and contact delivery are pending. The inquiry form downloads a brief locally.

## Install and use offline

Use HTTPS or localhost and choose the browser's install action. On iOS, use Safari’s Share menu and choose **Add to Home Screen**. After the first online visit, the bundled pages and artwork can reopen offline. External destinations need a connection.

## Content and storage foundation

The Fall design is the UI reference. Use the current placeholder content to check mobile and desktop layouts, track interactions, keyboard navigation, and offline routes before adding live content.

- **Notion is the editorial source of truth.** Seasons owns the active chapter, intro, cover reference, quote, CTA, and playlist links. Projects relate to Seasons. Tracks relate to album projects and carry ordering, duration, credits, and availability. These are proposed mappings for the selected Notion databases.
- **Supabase Storage holds media.** Store approved cover art and previews as files. Notion records reference a stable storage object path. Public assets can use public URLs. Private objects need authorization and short-lived signed URLs issued by the server.
- **The app renders a published content model.** Keep the page and component code independent of the source. When connecting Notion, map its published records server-side and keep credentials on the server. Keep Supabase privileged keys on the server as well. The app shell and bundled fixtures support offline use. Remote media can be handled separately according to its access rules.

Live connections are pending. The existing local Fall module is the UI fixture until the Notion databases and Supabase project are selected.
