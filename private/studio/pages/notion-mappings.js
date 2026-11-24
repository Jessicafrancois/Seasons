import {el,button} from '../components/ui.js';

export async function renderNotionMappings(root,source,session){
 root.replaceChildren();
 const status=el('p','Loading current Notion schema…','muted');status.setAttribute('role','status');
 const panel=el('div','','integration-modal-setup');
 const heading=el('h3','Field Mapping · '+source.name);
 const info=el('p','Choose which fields Studio may read in a later import. All mappings are draft, one-way from Notion to Studio, and never publish automatically.','muted');
 const fields=el('div','','integration-secrets');
 const actions=el('div','','actions');
 panel.append(heading,info,status,fields,actions);root.append(panel);
 const endpoint='/studio/api/notion/mappings/'+encodeURIComponent(source.key);
 try{
  const response=await fetch(endpoint,{credentials:'same-origin',cache:'no-store'});
  const body=await response.json();
  if(!response.ok)throw Error(body.message||body.error||'Unable to load mappings.');
  const controls=[];
  status.textContent=body.savedAt?'Saved draft mapping · '+new Date(body.savedAt).toLocaleString():'Suggested mappings · not yet saved';
  for(const f of body.fields){
   const card=el('div','','card');
   const select=document.createElement('select');select.setAttribute('aria-label',f.label+' Notion property');
   const off=document.createElement('option');off.value='';off.textContent='Not mapped';select.append(off);
   for(const p of f.choices){const option=document.createElement('option');option.value=p.id;option.textContent=p.name;select.append(option)}
   select.value=f.propertyId;
   const check=document.createElement('input');check.type='checkbox';check.checked=f.enabled;check.disabled=!select.value;
   const checkLabel=el('label');checkLabel.append(check,document.createTextNode(' Include in future import'));
   select.addEventListener('change',()=>{check.disabled=!select.value;check.checked=Boolean(select.value);status.textContent='Unsaved changes'});
   check.addEventListener('change',()=>{status.textContent='Unsaved changes'});
   card.append(el('strong',f.label),el('p',f.type+' · Notion → Studio · '+(f.visibility==='review'?'Requires separate publication approval':'Private only'),'muted'),select,checkLabel);
   if(f.stale||!f.choices.length)card.append(el('p','Expected property unavailable or incompatible. Mapping remains disabled.','muted'));
   fields.append(card);controls.push({f,select,check});
  }
  for(const message of body.planned||[])fields.append(el('p',message,'muted'));
  const save=button('Save draft mappings',async()=>{
   save.disabled=true;status.textContent='Saving…';
   try{
    const res=await fetch(endpoint,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-Studio-CSRF':session?.csrf||''},body:JSON.stringify({mappings:controls.map(({f,select,check})=>({destination:f.destination,propertyId:select.value,enabled:check.checked}))})});
    const data=await res.json();
    if(!res.ok)throw Error(data.message||data.error||'Save failed');
    status.textContent=data.message;
   }catch(error){status.textContent=error.message}
   finally{save.disabled=false}
  });
  actions.append(save,button('Reload schema',()=>renderNotionMappings(root,source,session),true),button('Close mapping',()=>root.replaceChildren(),true));
 }catch(error){status.textContent=error.message;actions.append(button('Retry',()=>renderNotionMappings(root,source,session),true))}
}
