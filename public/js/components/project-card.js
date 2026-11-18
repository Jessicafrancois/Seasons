

export function art(p,extra=''){return `<div class="art ${p.art} ${extra}"><small>Season ${p.season.number} / ${p.season.title}</small><span>${p.cover}</span><b class="arrow">↗</b></div>`}

export function card(p){return `<a class="card" href="#/projects/${p.id}">${art(p)}<div class="card-meta"><span>${p.type}</span><span>Season ${p.season.number}</span></div><h3>${p.title}</h3><p>${p.label}</p></a>`}

export function grid(ps){return `<div class="grid">${ps.map(card).join('')}</div>`}
