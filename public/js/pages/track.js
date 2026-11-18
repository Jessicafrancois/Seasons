import { head } from '../components/page-head.js';
import { art } from '../components/project-card.js';
import { trackPath } from '../components/track-list.js';
import { projects, seasonLabel } from '../content/index.js';


export function track(season, id){const n=Number(id);if(!season || !Number.isInteger(n) || n<1 || n>season.tracks.length)return head('404','Track not found.');const album = projects.find(project => project.season === season && project.type === 'Album'); return `${head(seasonLabel(season) + ' · Recording placeholder',season.tracks[n-1],'An individual page for the recording, its story, visuals, and credits.')}<section class="split"><div>${art(album,'full')}</div><div><span class="badge">Audio forthcoming</span><h3>Listening & lyrics</h3><p class="notice">Audio, lyrics, duration, and credits will appear once supplied and approved for publication.</p><div class="actions"><button class="pill" data-menu="${n}" data-track-path="${trackPath(season, n)}">Track options •••</button><button class="pill" data-share>Share ↗</button></div><h3>Connected to</h3><a class="text-link" href="#/projects/${album.id}">${album.title} ↗</a></div></section>`}
