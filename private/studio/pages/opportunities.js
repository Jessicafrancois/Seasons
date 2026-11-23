import {el,clear} from '../components/ui.js';

// Fictional preview records. The real opportunity API and contract storage are not connected.
const records=[
 {id:'OPP-LIC-26-001',name:'Original Score for Short Film',contact:'Maya Chen',type:'Licensing',stage:'Negotiation',value:'$4,500',source:'INQ-LIC-26-001',rights:'Master and composition synchronization',docs:[['Music Licensing Agreement','v3','Partially signed','Licensee signed; Seasons unsigned'],['Music Licensing Agreement','v2','Superseded draft','No signatures'],['Scope of Use','v1','Agreed in principle','No signatures']]},
 {id:'OPP-SMP-26-001',name:'Sample Clearance for New Release',contact:'Elias Morgan',type:'Sampling',stage:'Rights Review',value:'$1,200',source:'INQ-SMP-26-001',rights:'Sample clearance under review',docs:[['Sample License','v1','Under negotiation','Unsigned']]},
 {id:'OPP-COL-26-001',name:'Spring Editorial Collaboration',contact:'Atelier Form',type:'Collaboration',stage:'Proposal',value:'Unpriced',source:'INQ-COL-26-001',rights:'To be negotiated',docs:[['Creative Proposal','v2','Draft','No signatures']]}
];
function b(label,klass,fn){const n=el('button',label,klass);n.type='button';n.addEventListener('click',fn);return n}
function summary(label,value){const n=el('div','','opp-field');n.append(el('span',label),el('strong',value));return n}
export function renderOpportunities(root){
 const host=el('div','','opp-page');root.append(host);
 let type='All',search='',selected=null,tab='Overview',doc=0,notes=[],blob=null,originFocus=null;
 const close=()=>{selected=null;if(blob)URL.revokeObjectURL(blob);blob=null;document.removeEventListener('keydown',escape);render();originFocus?.focus()};
 const escape=e=>{if(e.key==='Escape'&&selected)close()};
 function render(){
  clear(host);const header=el('div','','opp-page-header'),title=el('div');
  title.append(el('div','SEASONS / STUDIO / OPERATIONS','opp-eyebrow'),el('h2','Opportunities'),el('p','Creative relationships, agreements, and possibilities.'));
  header.append(title,el('span','DEMONSTRATION · FICTIONAL RECORDS','opp-demo'));host.append(header);
  const metrics=el('div','','opp-metrics');
  for(const [key,val] of [['Open opportunities','3'],['Rights review','1'],['In negotiation','1']])metrics.append(summary(key,val));
  host.append(metrics);
  const bar=el('div','','opp-bar');
  for(const name of ['All','Licensing','Sampling','Collaboration'])bar.append(b(name,'opp-filter'+(type===name?' active':''),()=>{type=name;render()}));
  const input=el('input');input.type='search';input.placeholder='Search opportunities';input.value=search;input.setAttribute('aria-label','Search opportunities');
  input.addEventListener('input',()=>{search=input.value;render();const next=host.querySelector('input[type=search]');next.focus()});bar.append(input);host.append(bar);
  const cards=el('div','','opp-cards');
  const shown=records.filter(r=>(type==='All'||type===r.type)&&[r.id,r.name,r.contact].join(' ').toLowerCase().includes(search.toLowerCase()));
  if(!shown.length)cards.append(el('p','No matching opportunities.'));
  for(const r of shown){
   const card=b('','opp-card',()=>{originFocus=document.activeElement;selected=r;tab='Overview';doc=0;document.addEventListener('keydown',escape);render()});
   const head=el('div','','opp-card-head');head.append(el('span',r.id),el('span','↗'));
   card.append(head,el('h3',r.name),el('p',r.contact+' · '+r.type));
   const footer=el('div','','opp-card-foot');footer.append(el('span',r.stage,'opp-pill'),el('strong',r.value));card.append(footer,el('small',r.docs.length+' document version(s)'));cards.append(card);
  }
  host.append(cards,el('p','Demo only. No rights approvals, signatures, or document uploads occur here.','opp-footnote'));
  if(selected)modal();
 }
 function modal(){
  const r=selected,overlay=el('div','','opp-overlay'),dialog=el('section','','opp-dialog');
  dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','opp-dialog-title');
  const head=el('div','','opp-dialog-head'),identity=el('div');
  identity.append(el('span',r.id+' · '+r.source,'opp-eyebrow'),el('h2',r.name),el('p',r.contact+' · '+r.stage));
  identity.querySelector('h2').id='opp-dialog-title';
  head.append(identity,b('✕','opp-close',close));dialog.append(head);
  const tabs=el('nav','','opp-tabs'),body=el('div','','opp-body');
  for(const t of ['Overview','Terms & Rights','Documents','Activity'])tabs.append(b(t,'opp-tab'+(tab===t?' active':''),()=>{tab=t;renderBody()}));
  dialog.append(tabs,body,el('div','Private preview · No real agreement or rights granted','opp-dialog-foot'));
  overlay.append(dialog);host.append(overlay);
  overlay.addEventListener('mousedown',e=>{if(e.target===overlay)close()});
  renderBody();dialog.querySelector('.opp-close').focus();
  function renderBody(){
   clear(body);tabs.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x.textContent===tab));
   if(tab==='Overview'){
    const fields=el('div','','opp-fields');
    for(const [k,v] of [['Type',r.type],['Stage',r.stage],['Proposed value',r.value],['Source inquiry',r.source],['Rights requested',r.rights]])fields.append(summary(k,v));
    body.append(el('h3','Opportunity overview'),fields,el('h3','Documents'));
    r.docs.forEach((d,i)=>body.append(documentButton(d,i)));
   }else if(tab==='Terms & Rights'){
    const fields=el('div','','opp-fields');
    for(const [k,v] of [['Proposed price',r.value],['Requested rights',r.rights],['Negotiation stage',r.stage],['Related inquiry',r.source]])fields.append(summary(k,v));
    body.append(el('h3','Terms & rights'),fields,el('p','Requested terms are not an executed grant. Confirm ownership, signatories, and any payment or clearance conditions before activation.'));
   }else if(tab==='Documents'){
    const cols=el('div','','opp-doc-layout'),left=el('div','','opp-doc-list'),right=el('div','','opp-doc-preview');
    left.append(el('h3','Versions'));r.docs.forEach((d,i)=>left.append(documentButton(d,i)));
    const d=r.docs[doc];right.append(el('h3',d[0]+' · '+d[1]),el('span',d[2],'opp-pill'),summary('Signature record',d[3]));
    right.append(el('div','PDF preview area. No real contract is stored for this demonstration.','opp-pdf-placeholder'));
    const upload=document.createElement('input');upload.type='file';upload.accept='application/pdf';upload.setAttribute('aria-label','Preview PDF locally');
    upload.addEventListener('change',()=>{const file=upload.files?.[0];if(!file)return;if(file.type!=='application/pdf'){alert('Select a PDF.');return}if(blob)URL.revokeObjectURL(blob);blob=URL.createObjectURL(file);const old=right.querySelector('iframe');old?.remove();const frame=document.createElement('iframe');frame.src=blob;frame.title='Local PDF preview: '+file.name;frame.className='opp-pdf-frame';right.append(frame)});
    right.append(el('p','Preview a PDF locally (not uploaded or saved).'),upload);
    cols.append(left,right);body.append(cols);
   }else{
    body.append(el('h3','Private negotiation notes'),el('p','Temporary notes in this preview are not saved to a server.'));
    const area=document.createElement('textarea');area.rows=4;area.placeholder='Add a private note';area.setAttribute('aria-label','Private note');
    body.append(area,b('Add demo note','opp-submit',()=>{if(area.value.trim()){notes.push({id:r.id,text:area.value.trim()});renderBody()}}));
    notes.filter(n=>n.id===r.id).forEach(n=>body.append(el('p',n.text,'opp-note')));
   }
  }
  function documentButton(d,i){const btn=b('','opp-document'+(doc===i?' active':''),()=>{doc=i;tab='Documents';renderBody()});btn.append(el('strong',d[0]+' · '+d[1]),el('span',d[2]));return btn}
 }
 render();
}
