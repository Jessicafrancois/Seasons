import { fall } from '../seasons/fall/content.js';
import { seasons } from './content/index.js';
import { head } from './components/page-head.js';
import { home } from './pages/home.js';
import { season, seasonIndex } from './pages/seasons.js';
import { explore } from './pages/collection.js';
import { project } from './pages/project.js';
import { track } from './pages/track.js';
import { profile } from './pages/profile.js';
import { inquire } from './pages/inquiry.js';

const notFound = () => head('404', 'A page yet to be written.');
const chapterBySlug = slug => seasons.find(chapter => chapter.slug === slug);

export function route(page, slug, number) {
  switch (page) {
    case 'home': return home();
    case 'seasons': {
      const chapter = chapterBySlug(slug);
      return chapter ? season(chapter) : slug ? notFound() : seasonIndex();
    }
    case 'explore':
    case 'listen':
    case 'visuals': return explore(page);
    case 'projects': return project(slug);
    case 'tracks': return number ? track(chapterBySlug(slug), number) : track(fall, slug);
    case 'profile': return profile();
    case 'inquire': return inquire();
    default: return notFound();
  }
}
