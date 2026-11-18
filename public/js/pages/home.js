import { hero, quote } from '../components/season-hero.js';
import { grid } from '../components/project-card.js';
import { currentSeason, projects } from '../content/index.js';


export function featured(season){return `<section class="section"><div class="section-head"><div><div class="eyebrow">${season.number} / Selected explorations</div><h2>Work in becoming.</h2></div><a class="text-link" href="#/explore">Explore all work ↗</a></div>${grid(projects.filter(project => project.season === season))}</section>`}

export function home(){return `<section class="intro"><div class="intro-top"><div class="eyebrow"><i class="dot"></i> A living body of art & music</div><span class="right-note">By Jessica Francois · Independent by nature</span></div><div class="title-row"><h1>A life, <em>in seasons.</em></h1><p class="description">${currentSeason.intro}</p></div>${hero(currentSeason)}</section>${featured(currentSeason)}${quote(currentSeason)}<section class="section about-strip"><div><div class="eyebrow">The person behind the work</div><h2>Always<br>becoming.</h2></div><div><p>Seasons is an ongoing creative exploration told through original music and connected artistic work. Each chapter makes room for a different perspective on time, relationships, and the ways we change.</p><a class="text-link" href="#/profile">Meet the artist ↗</a></div></section>`}
