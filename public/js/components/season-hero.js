import { currentSeason, seasonLabel } from '../content/index.js';


export function hero(season, inSeason = false){return `<div class="hero"><img src="${season.cover}" alt="${season.coverAlt}"><div class="hero-corner">${season === currentSeason ? "THE CURRENT CHAPTER" : "FROM THE ARCHIVE"}</div><span class="hero-number">${season.number}</span><div class="hero-content"><div><p>${season.themes.join(' · ')}</p><h2>${seasonLabel(season)}</h2></div><a class="pill" href="${inSeason?'#/explore':'#/seasons/' + season.slug}">${inSeason?season.cta.explore:season.cta.enter} <span>↗</span></a></div></div>`}

export function quote(season){return `<section class="quote"><div class="eyebrow">A question for this season</div><blockquote>“${season.quote}”</blockquote><p>From the Season ${Number(season.number)} creative direction</p></section>`}
