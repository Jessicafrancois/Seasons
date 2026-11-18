import { fall } from '../../seasons/fall/content.js';


export function tracklist(season){return `<div class="tracks">${season.tracks.map((t,i)=>`<div class="track"><small>0${i+1}</small><button disabled aria-label="Audio not yet uploaded">▷</button><a href="${trackPath(season, i + 1)}">${t}</a><small>—:—</small><button data-menu="${i+1}" data-track-path="${trackPath(season, i + 1)}" aria-label="Options for ${t}">•••</button></div>`).join('')}</div>`}

export function trackPath(season, number) {
  return season === fall ? '#/tracks/' + number : '#/tracks/' + season.slug + '/' + number;
}
