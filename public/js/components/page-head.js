

export function head(eye,title,desc=''){return `<section class="page-head"><div class="eyebrow">${eye}</div><h1>${title}</h1>${desc?`<p>${desc}</p>`:''}</section>`}
