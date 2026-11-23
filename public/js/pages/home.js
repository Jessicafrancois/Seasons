import { quote } from '../components/season-hero.js';
import { grid } from '../components/project-card.js';
import { currentSeason, projects } from '../content/index.js';

// Use season-managed content and assets; never substitute commercial stock images.
export function featured(season){
 return `<section class="section"><div class="section-head"><div><div class="eyebrow">${season.number} / Selected explorations</div><h2>Work in becoming.</h2></div><a class="text-link" href="#/explore">Explore all work ↗</a></div>${grid(projects.filter(project=>project.season===season))}</section>`;
}
export function home(){
 const season=currentSeason;
 return `<section class="editorial-home" aria-labelledby="editorial-title">
  <img class="editorial-home-image" src="${season.cover}" alt="${season.coverAlt||'Seasonal visual artwork'}" fetchpriority="high">
  <div class="editorial-home-shade" aria-hidden="true"></div>
  <div class="editorial-home-content">
   <div class="editorial-home-label">A LIVING BODY OF ART, MUSIC & MEMORY</div>
   <h1 id="editorial-title">A life, <em>in seasons.</em></h1>
   <p class="editorial-home-description">An ongoing collection of original music, visual art, and the stories that make us human.</p>
   <a class="editorial-home-cta" href="#/seasons/${season.slug}">ENTER SEASON ${season.number} <span aria-hidden="true">↗</span></a>
  </div>
  <div class="editorial-home-bottom">
   <span>SEASON ${season.number} <span class="editorial-home-separator">/</span> ${season.title.toUpperCase()}</span>
   <span class="editorial-home-pagination" aria-label="Current seasonal image, 1 of 1"><i aria-hidden="true"></i></span>
   <span>TIME · LOVE · INTENTIONS</span>
  </div>
 </section>
 <section class="editorial-home-introduction section">
  <div><div class="eyebrow">THE FIRST CHAPTER · ${season.title.toUpperCase()}</div><h2>What stays with us,<br>as we change?</h2></div>
  <div><p>Seasons is an evolving body of work, shaped by time, love, intention, and the quiet transformations of ordinary life.</p><a class="text-link" href="#/seasons/${season.slug}">Discover the chapter ↗</a></div>
 </section>
 ${featured(season)}${quote(season)}
 <section class="section about-strip"><div><div class="eyebrow">The person behind the work</div><h2>Always<br>becoming.</h2></div><div><p>Seasons is an ongoing creative exploration told through original music and connected artistic work. Each chapter makes room for a different perspective on time, relationships, and the ways we change.</p><a class="text-link" href="#/profile">Meet the artist ↗</a></div></section>`;
}
