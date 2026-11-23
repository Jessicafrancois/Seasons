import { quote } from '../components/season-hero.js';
import { grid } from '../components/project-card.js';
import { currentSeason, projects } from '../content/index.js';

export function featured(season) {
  const items = projects.filter(project => project.season === season).slice(0,3);
  const tiles = items.map((project,index) => {
    const category = ['Recordings','Visual studies','Writing & reflection'][index];
    return `<a class="home-feature-tile home-feature-tile--${index+1}" href="#/projects/${project.id}" style="--tile-art: url('${season.cover}')">
      <span class="home-feature-tile-art" aria-hidden="true"></span>
      <span class="home-feature-tile-shade" aria-hidden="true"></span>
      <span class="home-feature-tile-label">${category}</span>
      <span class="home-feature-tile-title">${project.title}</span>
      <span class="home-feature-tile-arrow" aria-hidden="true">↗</span>
    </a>`;
  });
  tiles.push(`<a class="home-feature-tile home-feature-tile--4" href="#/seasons/${season.slug}" style="--tile-art: url('${season.cover}')">
    <span class="home-feature-tile-art" aria-hidden="true"></span>
    <span class="home-feature-tile-shade" aria-hidden="true"></span>
    <span class="home-feature-tile-label">The chapter</span>
    <span class="home-feature-tile-title">Season ${season.number} ~ ${season.title}</span>
    <span class="home-feature-tile-arrow" aria-hidden="true">↗</span>
  </a>`);
  return `<section class="home-feature-section" aria-label="Explore four paths through the current season">
    <div class="home-feature-grid">${tiles.join('')}</div>
  </section>`;
}

/**
 * The public home is a JavaScript page component, not a standalone HTML file.
 * The reference composition is full-bleed photography, fine navigation rules,
 * one centered editorial message, an outlined CTA and a subtle slide marker.
 */
export function home() {
  const season = currentSeason;
  return `
  <section class="editorial-home" aria-labelledby="editorial-title">
    <img class="editorial-home-image" src="${season.cover}" alt="${season.coverAlt || 'Current season artwork'}" fetchpriority="high">
    <div class="editorial-home-shade" aria-hidden="true"></div>
    <div class="editorial-home-content">
      <h1 id="editorial-title">A life, in seasons.</h1>
      <p class="editorial-home-description">An evolving body of original music, visual art, and human experience.<br>Each chapter holds a different perspective on the things that change us.</p>
      <a class="editorial-home-cta" href="#/seasons/${season.slug}">EXPLORE THE CHAPTER</a>
    </div>
    <div class="editorial-home-pagination" aria-label="One seasonal photograph currently featured">
      <span class="editorial-home-pagination-current" aria-hidden="true"></span>
    </div>
    <div class="editorial-home-credit">SEASON ${season.number} &nbsp;·&nbsp; ${season.title.toUpperCase()} &nbsp;·&nbsp; TIME / LOVE / INTENTIONS</div>
  </section>
  <section class="editorial-home-introduction section">
    <div><div class="eyebrow">SEASON ${season.number} / ${season.title.toUpperCase()}</div><h2>The art of<br>becoming.</h2></div>
    <div><p>We change through the people we love, the experiences we survive, and the intentions we carry into the world. Seasons follows those chapters through original work.</p><a class="text-link" href="#/seasons/${season.slug}">Enter ${season.title} ↗</a></div>
  </section>
  ${featured(season)}${quote(season)}
  <section class="section about-strip"><div><div class="eyebrow">The person behind the work</div><h2>Always<br>becoming.</h2></div><div><p>Seasons is an ongoing creative exploration told through original music and connected artistic work. Each chapter makes room for a different perspective on time, relationships, and the ways we change.</p><a class="text-link" href="#/profile">Meet the artist ↗</a></div></section>`;
}
