import { seasons, currentSeason } from '../public/js/content/index.js';

// Same content modules as the public router. These are available routes,
// not proof that a browser has successfully loaded each page.
export function pageInventory() {
  const pages = [
    ['Opening / Home', '#/', 'Core'],
    ['Seasons Index', '#/seasons', 'Core'],
    ['Explore', '#/explore', 'Core'],
    ['Listen', '#/listen', 'Core'],
    ['Visuals', '#/visuals', 'Core'],
    ['Profile', '#/profile', 'Core'],
    ['Inquiries', '#/inquire', 'Core']
  ].map(([title, route, category]) => ({ title, route, category, source: 'Local module', status: 'Route configured' }));
  for (const season of seasons) {
    pages.push({ title: 'Season ' + Number(season.number) + ' / ' + season.title, route: '#/seasons/' + season.slug, category: 'Season', source: 'Local module', status: 'Route configured' });
    for (const project of season.projects) {
      pages.push({ title: project.title, route: '#/projects/' + project.id, category: 'Project', season: season.title, source: 'Local module', status: 'Route configured' });
    }
    season.tracks.forEach((title, index) => {
      pages.push({ title, route: '#/tracks/' + season.slug + '/' + (index + 1), category: 'Track', season: season.title, source: 'Local module', status: 'Route configured' });
    });
  }
  return pages;
}

export function overview() {
  const pages = pageInventory();
  return {
    generatedAt: new Date().toISOString(),
    activeSeason: { number: Number(currentSeason.number), title: currentSeason.title, slug: currentSeason.slug },
    pages,
    pageCount: pages.length,
    metrics: { visitors: null, inquiries: null, drafts: null },
    connections: { analytics: 'not_connected', inquiries: 'not_connected', alerts: 'not_connected', notion: 'not_connected' }
  };
}
