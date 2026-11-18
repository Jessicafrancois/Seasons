# Seasons

Run `npm run dev` with Node.js 22 or later, then open the site on port 3000. Set `PORT` to use a different port.

The site serves the supplied Seasons design export at `public/index.html`. The export bundles its own fonts, imagery, styling, and hash-based navigation. Season 1 ~ Fall includes the project collection, track detail pages, artist profile, and inquiry brief download.

The export uses placeholder recordings and playlist destinations. The inquiry form downloads a brief locally. A live Notion source, Spotify and Apple Music destinations, and contact delivery are pending.

## Install and use offline

Open Seasons over HTTPS or localhost. Use the browser's install action where available. On iOS, use Safari’s Share menu and choose **Add to Home Screen**. Once the first online visit has finished registering the service worker, the bundled pages and artwork can reopen offline. External destinations need a connection.

The service worker looks for a fresh home document on online visits. Bump the cache version in `public/service-worker.js` when changing the cached manifest, icons, or registration script.
