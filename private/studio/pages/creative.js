import {el,section,button,field,note,table} from '../components/ui.js';
import {renderEditor} from '../editor/opening.js';
const endpoint='/studio/api/creative/drafts';
const badge=d=>d.revision?'Private draft · v'+d.revision:'Source only';
function publicLink(d){const a=el('a','View live page ↗');a.href='/'+d.route;a.target='_blank';a.rel='noopener noreferrer';return a;}
export async function renderCreativeWorkspace(root,route,session,navigate,target){
 root.append(note('Loading creative workspace…'));
 try{
  const response=await fetch(endpoint,{credentials:'same-origin',cache:'no-store'});
  const body=await response.json();
  if(!response.ok)throw Error(body.error||'Creative workspace unavailable');
  if(!root.isConnected)return;
  root.replaceChildren();
  const drafts=body.drafts;
  const pages=drafts.filter(d=>d.category!=='Motion');
  const mapping=()=>navigate('mapping');
  const persist=async(d,values)=>{
   const res=await fetch(endpoint,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-Studio-CSRF':session.csrf},body:JSON.stringify({key:d.key,revision:d.revision,values})});
   const saved=await res.json();if(!res.ok)throw Error(saved.error||'Could not save');
   Object.assign(d,saved);return saved;
  };
  if(route==='motion'){
   const d=drafts.find(x=>x.key==='motion:opening');
   const toolbar=section('Opening motion','Private draft');
   toolbar.append(el('p','Adjust grid motion, color and timing. Save the settings separately from the live site.','muted'),button('Opening field mapping',mapping,true));
   root.append(toolbar);const panel=el('div');root.append(panel);
   renderEditor(panel,{enabled:true,draft:d.values,savedAt:d.savedAt},values=>persist(d,values));return;
  }
  if(route==='editor'){
   const toolbar=section('Choose a page','Private editor');
   const selected=pages.find(d=>d.key===target)||pages[0];
   const picker=field('Page','select',selected.key,()=>show(picker.input.value),pages.map(d=>[d.key,d.title+' · '+d.category]));
   toolbar.append(picker.wrap,button('Opening motion',()=>navigate('motion'),true),button('Field mapping',mapping,true));root.append(toolbar);
   const area=el('div');root.append(area);let dirty=false;
   function show(key){
    if(dirty&&!confirm('Discard unsaved changes?')){picker.input.value=area.dataset.key;return;}
    dirty=false;area.dataset.key=key;area.replaceChildren();
    const d=pages.find(p=>p.key===key);
    const layout=el('div','','grid-two');
    const controls=section(d.title,badge(d)),preview=section('Draft content preview','Not the live renderer');
    const fields=el('div','','creative-fields'),values={...d.values};
    const status=el('p',d.savedAt?'Last saved '+new Date(d.savedAt).toLocaleString():'No private draft saved','creative-status');status.setAttribute('role','status');
    const surface=el('div','','creative-preview');
    function draw(){surface.replaceChildren(el('h2',values.title||d.title));for(const f of d.fields.filter(x=>x.key!=='title')){const block=el('div');block.append(el('div',f.label,'creative-field-meta'),el(f.key==='quote'?'blockquote':'p',values[f.key]||'—'));surface.append(block)}}
    for(const f of d.fields){
     const wrap=el('label','','field'),input=document.createElement(f.multiline?'textarea':'input');
     if(!f.multiline)input.type='text';input.value=values[f.key];input.maxLength=f.max;
     input.addEventListener('input',()=>{values[f.key]=input.value;dirty=true;status.textContent='Unsaved changes';draw()});
     wrap.append(el('span',f.label),input);fields.append(wrap);
    }
    const save=button('Save private draft',async()=>{
     save.disabled=true;status.textContent='Saving…';
     try{const saved=await persist(d,values);dirty=false;status.textContent='Saved revision '+saved.revision+' · '+new Date(saved.savedAt).toLocaleString();}
     catch(e){status.textContent=e.message}
     finally{save.disabled=false}
    });
    const actions=el('div','','actions');actions.append(save,publicLink(d));
    controls.append(note('This edits a private Studio copy. Notion and the public site are unchanged.'),fields,actions,status);
    preview.append(surface);layout.append(controls,preview);area.append(layout);draw();
   }
   show(selected.key);return;
  }
  if(route==='pages'){
   const card=section('Page inventory',pages.length+' routes');
   const filters=el('div','','creative-toolbar'),result=el('div');
   const search=field('Find a page','search','',update);
   search.input.addEventListener('input',update);
   const category=field('Category','select','All',update,['All','Core','Season','Project','Track'].map(x=>[x,x]));
   const statusFilter=field('Draft status','select','all',update,[['all','All'],['saved','Saved draft'],['source','Source only']]);
   filters.append(search.wrap,category.wrap,statusFilter.wrap);
   card.append(note('Live routes are sourced from the existing public content registry. Drafts remain private.'),filters,result);
   root.append(card);
   function update(){
    const q=search.input.value.toLowerCase(),kind=category.input.value,status=statusFilter.input.value;
    const shown=pages.filter(d=>(kind==='All'||d.category===kind)&&(!q||(d.title+' '+d.route).toLowerCase().includes(q))&&(status==='all'||(status==='saved'?d.revision>0:d.revision===0)));
    result.replaceChildren();
    if(!shown.length){result.append(el('p','No matching pages','muted'));return;}
    result.append(table(['Page','Category','Draft','Actions'],shown,(d,i)=>{
     if(i===0)return el('span',d.title);
     if(i===1)return d.category;
     if(i===2)return badge(d);
     const row=el('div','','actions');row.append(button('Edit draft',()=>navigate('editor',d.key),true),publicLink(d));return row;
    }));
   }
   update();return;
  }
  const isSeason=route==='seasons';
  const records=pages.filter(d=>isSeason?d.category==='Season':['Project','Track'].includes(d.category));
  const card=section(isSeason?'Season chronology':'Creative catalog',records.length+' configured');
  const grid=el('div','','creative-records');
  card.append(note(isSeason?'Only the configured Fall chapter is live. Winter, Spring and Summer remain future chapter work.':'This is the public content registry, not an imported Notion catalog. Placeholder works remain labeled.'),button('Field mapping',mapping,true),grid);
  for(const d of records){
   const item=el('div','','card');item.append(el('span',d.category+(d.placeholder?' · Placeholder':''),'creative-field-meta'),el('h3',d.values.title||d.title),el('p',d.values.description||d.route,'muted'),el('p',badge(d),'muted'));
   const actions=el('div','','actions');actions.append(button('Edit draft',()=>navigate('editor',d.key),true),publicLink(d));item.append(actions);grid.append(item);
  }
  root.append(card);
  if(isSeason){const chronology=section('Chapter sequence','Planned chronology');chronology.append(el('p','Season 1 · Fall → Winter → Spring → Summer','muted'),note('Future chapter creation, activation and historical archive access are not changed by editing a draft.'));root.append(chronology);}
 }catch(error){if(root.isConnected){root.replaceChildren(note(error.message||'Creative workspace unavailable',true),button('Retry',()=>renderCreativeWorkspace(root,route,session,navigate,target),true))}}
}
