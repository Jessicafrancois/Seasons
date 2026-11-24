import {creativeGroups,allCreativeRoutes} from './creative-navigation.js';
export const sections = [
 { group:'Operations', items:[['Overview','overview'],['Inquiries','inquiries'],['Opportunities','opportunities'],['Alerts','alerts'],['Analytics','analytics']] },
 { group:'Creative management', groups:creativeGroups },
 { group:'Platform', items:[['Publishing','publishing'],['Notion & Integrations','integrations'],['Field Mapping','mapping'],['System & Security','system'],['Settings','settings']] }
];
export const descriptions = {
 overview:['Overview','Your entire creative platform, at a glance.'],
 inquiries:['Inquiries','Review requests concerning your work.'],
 opportunities:['Opportunities','Creative relationships, contracts, and rights review.'],
 alerts:['Alerts','Operational events and records that need attention.'],
 analytics:['Analytics','Audience intelligence across Seasons.'],
 pages:['Page Inventory','Public pages, seasonal content, and routes.'],
 editor:['Page Editor','Compose and refine the opening experience.'],
 seasons:['Seasons Manager','Manage the chronological chapters of Seasons.'],
 projects:['Projects & Records','The evolving collection of creative work.'],
 media:['Media Library','Visual, audio and video storage.'],
 design:['Design System','Shared visual language and typography.'],
 motion:['Motion Studio','The rhythm and movement of each season.'],
 publishing:['Publishing','Review, preview and release changes.'],
 integrations:['Notion & Integrations','Connections powering the creative platform.'],
 mapping:['Field Mapping','Manage shared Notion sources and their Studio fields.'],
 system:['System & Security','Technical status and access controls.'],
 settings:['Settings','Workspace preferences and configuration.']
};
for(const item of Object.values(allCreativeRoutes))if(!descriptions[item.key])descriptions[item.key]=[item.label,item.description];
descriptions.editor=['Canvas Editor','Page content and private draft preview.'];
descriptions.motion=['Motion Editor','Opening motion and animation preview.'];
descriptions.seasons=['Active Chapter','Manage the current seasonal chapter.'];
export function el(tag, text='', className='') { const node=document.createElement(tag);node.textContent=String(text);if(className)node.className=className;return node; }
export function clear(node) { node.replaceChildren();return node; }
export function section(title,tag='') { const card=el('section','','card');const head=el('div','','section-title');head.append(el('h2',title));if(tag)head.append(el('span',tag,'tag'));card.append(head);return card; }
export function item(parent,title,description) { const div=el('div','','item');div.append(el('strong',title),el('p',description,'muted'));parent.append(div);return div; }
export function button(text,action,secondary=false){const b=el('button',text,'button'+(secondary?' secondary':''));b.type='button';b.addEventListener('click',action);return b;}
export function note(text,warning=false){return el('div',text,'notice'+(warning?' warn':''));}
export function field(label,kind,value,onChange,options=[]) {
 const wrap=el('label','','field'), title=el('span',label);let input;
 if(kind==='select'){input=document.createElement('select');for(const [v,t] of options){const op=document.createElement('option');op.value=v;op.textContent=t;input.append(op);}input.value=value;}
 else {input=document.createElement('input');input.type=kind;input.value=value;if(kind==='checkbox')input.checked=Boolean(value);}
 input.addEventListener(kind==='range'?'input':'change',()=>onChange(kind==='checkbox'?input.checked:input.value));
 wrap.append(title,input);return {wrap,input};
}
export function table(headers,records,renderCell){
 const wrap=el('div','','table-wrap'),table=el('table','','data-table'),head=document.createElement('thead'),headRow=document.createElement('tr'),body=document.createElement('tbody');
 for(const h of headers)headRow.append(el('th',h));head.append(headRow);
 for(const record of records){const row=document.createElement('tr');headers.forEach((_,i)=>{const td=document.createElement('td');const value=renderCell(record,i);if(value instanceof Node)td.append(value);else td.textContent=String(value??'');row.append(td)});body.append(row);}
 table.append(head,body);wrap.append(table);return wrap;
}
