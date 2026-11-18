import { hero, quote } from '../components/season-hero.js';
import { head } from '../components/page-head.js';
import { grid } from '../components/project-card.js';
import { currentSeason, projects, seasonLabel, seasons } from '../content/index.js';


export function season(season){const chapter = "Chapter " + season.number + (season === currentSeason ? " · The current season" : ""); return `${head(chapter, seasonLabel(season), season.description)}<div style="margin:0 4%">${hero(season, true)}</div><section class="section"><div class="section-head"><div><div class="eyebrow">Inside the season</div><h2>Three threads.<br>One chapter.</h2></div><a class="pill" href="#/listen">Explore the music ↗</a></div><p class="notice">Design preview: project titles and artwork below demonstrate the experience. Original recordings and final releases have not been supplied.</p>${grid(projects.filter(project => project.season === season))}</section>${quote(season)}<section class="section about-strip"><h2>The listening<br>companion.</h2><div><p>A place for the music that accompanies this chapter.</p>${playlistLinks(season)}</div></section>`}

function playlistLinks(season) {
  const destinations = [['Spotify', season.playlist.spotify], ['Apple Music', season.playlist.appleMusic]];
  const links = destinations.filter(([, url]) => url).map(([name, url]) => `<a class="pill" href="${url}">${name} ↗</a>`);
  return links.length ? links.join(' ') : '<span class="badge">Playlist links to be added</span><p>Spotify and Apple Music destinations will appear here when the season playlists are selected.</p>';
}

export function seasonIndex() {
  return head('The chapters', 'A world for every season.', 'Each chapter has its own atmosphere. Begin with ' + currentSeason.title + '.') +
    seasons.map(chapter => `<section class="collection">${hero(chapter)}</section>`).join('');
}
