import {el,button,note} from '../components/ui.js';
import {renderNotionMappings} from './notion-mappings.js';

export function renderNotionSources(parent,session,autoLoad=false){
 const panel=el('div','',autoLoad?'card stack':'integration-modal-setup');
 const heading=el('h3','Shared sources');
 const intro=el('p','Verify the existing Seasons sources and register only those you want to use in Studio. Nothing is imported or published.','muted');
 const status=el('p','','muted');status.setAttribute('role','status');
 const list=el('div','',autoLoad?'stack':'integration-secrets');
 let busy=false;
 const refresh=button('Discover shared sources',()=>load(),true);
 panel.append(heading,intro,refresh,status,list);parent.append(panel);
 const labels={accessible:'Accessible',not_shared:'Not shared or inaccessible',authorization_expired:'Authorization expired',not_connected:'Not connected',rate_limited:'Rate limited · retry',unavailable:'Unable to verify'};
 async function load(){
  if(busy)return;
  busy=true;refresh.disabled=true;status.textContent='Checking Notion source access…';list.replaceChildren();
  try{
   const response=await fetch('/studio/api/notion/sources',{cache:'no-store',credentials:'same-origin'});
   const body=await response.json();
   if(!response.ok)throw Error(body.error||'Source discovery failed.');
   status.textContent=body.sources.filter(x=>x.access==='accessible').length+' of '+body.sources.length+' known Seasons sources accessible. '+body.sources.filter(x=>x.registered).length+' registered.';
   for(const source of body.sources){
    const row=el('div','','card');
    const title=el('strong',source.name);
    const detail=el('p',source.destination+' · '+(source.kind==='data_source'?'Database':'Page'),'muted');
    const access=el('p',(labels[source.access]||'Unknown')+' · '+(source.registered?'Registered':'Not registered'),'muted');
    const toggle=button(source.registered?'Remove registration':'Register source',async()=>{
     toggle.disabled=true;refresh.disabled=true;status.textContent='Saving source selection…';
     try{
      const res=await fetch('/studio/api/notion/sources',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-Studio-CSRF':session?.csrf||''},body:JSON.stringify({key:source.key,registered:!source.registered})});
      const result=await res.json();
      if(!res.ok)throw Error(result.message||result.error||'Could not save registration.');
      await load();
     }catch(error){status.textContent=error.message;toggle.disabled=false}
     finally{refresh.disabled=false}
    },true);
    toggle.disabled=!source.registered&&source.access!=='accessible';
    row.append(title,detail,access,toggle);
    if(source.registered&&source.access==='accessible'){
     const mappingPanel=el('div');
     const mappingButton=button('Map fields',()=>renderNotionMappings(mappingPanel,source,session),true);
     row.append(mappingButton,mappingPanel);
    }
    list.append(row);
   }
  }catch(error){status.textContent=error.message||'Source discovery unavailable.'}
  finally{busy=false;refresh.disabled=false}
 }
 if(autoLoad)load();
}
