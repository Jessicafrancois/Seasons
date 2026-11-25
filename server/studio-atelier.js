import {getPlugin,pluginSettings,settingsFor} from '../private/studio/atelier/plugin-registry.js';
import {randomUUID} from 'node:crypto';
import {kinds,validateDocument,emptyDocument,seedFromFields} from '../private/studio/atelier/model.js';
import {listCreativeDrafts} from './studio-creative-drafts.js';
const docs='seasons_atelier_documents',revs='seasons_atelier_revisions';
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
const failure=(status,error)=>({status,body:{error}});
const result=body=>({status:200,body});
const goodName=v=>typeof v==='string'&&v.trim().length>0&&v.length<=200;
async function db(table,method,query='',body,prefer){
 const url=new URL(process.env.SUPABASE_URL),key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(url.protocol!=='https:'||!key)throw Error('Document store unavailable');
 const response=await fetch(url.origin+'/rest/v1/'+table+query,{method,headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',...(prefer?{Prefer:prefer}:{})},...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(7000)});
 if(!response.ok)throw Error('Document store unavailable');
 return response.json();
}
const ownerFilter=id=>'owner_id=eq.'+encodeURIComponent(id);
const safeRow=row=>({id:row.id,name:row.name,kind:row.kind,revision:row.revision,savedAt:row.updated_at,document:row.document});
async function owned(id,identity){
 if(!uuid(id))return null;
 return (await db(docs,'GET','?id=eq.'+id+'&'+ownerFilter(identity.id)+'&select=id,name,kind,revision,document,updated_at'))[0]||null;
}
const pluginTable='seasons_atelier_plugin_settings';
async function readSettings(identity){
 const rows=await db(pluginTable,'GET','?'+ownerFilter(identity.id)+'&select=plugin_id,enabled,duration');
 return Object.fromEntries(rows.filter(row=>getPlugin(row.plugin_id))
  .map(row=>[row.plugin_id,pluginSettings({enabled:row.enabled,duration:row.duration})]));
}
export function changedPluginEffects(before,after){
 const previous=new Map();
 const changed=new Set();
 function visit(nodes,locked,callback){
  for(const node of nodes){
   const effectiveLock=locked||node.locked;
   callback(node,effectiveLock);
   visit(node.children,effectiveLock,callback);
  }
 }
 visit(before.nodes,false,(node,locked)=>previous.set(node.id,{motion:node.motion,locked}));
 visit(after.nodes,false,node=>{
  const prior=previous.get(node.id);
  if(JSON.stringify(node.motion)===JSON.stringify(prior?.motion))return;
  if(prior?.locked)throw Error('Cannot change an effect on a locked layer');
  if(node.motion)changed.add(node.motion.pluginId);
 });
 return changed;
}
export async function atelierRequest(method,route,input,identity){
 if(!identity?.id)return failure(403,'Access denied');
 if(route==='plugins'&&method==='GET')return result({settings:await readSettings(identity)});
 if(route==='plugins'||route.startsWith('plugins/')){
  if(method!=='PUT'||route==='plugins')return failure(405,'Method not allowed');
  const id=route.slice('plugins/'.length);
  if(!getPlugin(id))return failure(404,'Plugin not found');
  let settings;
  try{settings=pluginSettings(input)}catch(error){return failure(422,error.message)}
  await db(pluginTable,'POST','?on_conflict=owner_id,plugin_id',
   {owner_id:identity.id,plugin_id:id,...settings},'resolution=merge-duplicates,return=representation');
  return result({id,settings});
 }

 if(route==='documents'){
  if(method==='GET'){
   const rows=await db(docs,'GET','?'+ownerFilter(identity.id)+'&select=id,name,kind,revision,updated_at&order=updated_at.desc&limit=100');
   return result({documents:rows.map(safeRow)});
  }
  if(method!=='POST')return failure(405,'Method not allowed');
  if(!goodName(input?.name)||!kinds.includes(input.kind))return failure(422,'Choose a document name and supported type.');
  let document=emptyDocument();
  if(input.source){
   if(input.kind!=='page'&&input.kind!=='editorial')return failure(422,'Source copies require page or editorial type.');
   const source=(await listCreativeDrafts()).find(d=>d.key===input.source&&d.category!=='Motion');
   if(!source)return failure(422,'Source draft not found');
   document=seedFromFields(source.fields,source.values);
  }
  const rows=await db(docs,'POST','',{id:randomUUID(),owner_id:identity.id,name:input.name.trim(),kind:input.kind,document,revision:1},'return=representation');
  return result(safeRow(rows[0]));
 }
 const parts=route.split('/'),id=parts[0];
 const row=await owned(id,identity);
 if(!row)return failure(404,'Document not found');
 if(parts[1]==='revisions'){
  if(method!=='GET')return failure(405,'Method not allowed');
  const filter='?document_id=eq.'+id;
  if(parts.length===3){
   if(!/^[1-9][0-9]{0,8}$/.test(parts[2]))return failure(400,'Invalid revision');
   const saved=(await db(revs,'GET',filter+'&revision=eq.'+parts[2]+'&select=revision,name,document,created_at'))[0];
   return saved?result(saved):failure(404,'Revision not found');
  }
  const rows=await db(revs,'GET',filter+'&select=revision,name,created_at&order=revision.desc&limit=100');
  return result({revisions:rows});
 }
 if(parts.length!==1)return failure(404,'Unknown action');
 if(method==='GET')return result(safeRow(row));
 if(method!=='PUT')return failure(405,'Method not allowed');
 if(!goodName(input?.name)||!Number.isSafeInteger(input.revision)||input.revision<1)return failure(422,'Invalid name or revision');
 if(row.revision!==input.revision)return failure(409,'A newer revision exists. Reopen the document before saving.');
 let document;
 try{document=validateDocument(input.document)}catch(e){return failure(422,e.message)}
 let restoring=false;
 if(Number.isSafeInteger(input.restoreFrom)&&input.restoreFrom>=1&&input.restoreFrom<=row.revision){
  const [saved]=await db(revs,'GET','?document_id=eq.'+id+'&revision=eq.'+input.restoreFrom+'&select=document,name');
  restoring=Boolean(saved&&saved.name===input.name.trim()&&
   JSON.stringify(validateDocument(saved.document))===JSON.stringify(document));
 }
 if(!restoring){
  let changed;
  try{changed=changedPluginEffects(validateDocument(row.document),document)}
  catch(e){return failure(422,e.message)}
  if(changed.size){
   const settings=await readSettings(identity);
   for(const id of changed)if(!settingsFor(settings,id).enabled)return failure(422,'Enable '+getPlugin(id).name+' before saving new effects.');
  }
 }
 const rows=await db(docs,'PATCH','?id=eq.'+id+'&'+ownerFilter(identity.id)+'&revision=eq.'+input.revision,{name:input.name.trim(),document,revision:input.revision+1,updated_at:new Date().toISOString()},'return=representation');
 return rows.length===1?result(safeRow(rows[0])):failure(409,'A newer revision exists. Reopen the document before saving.');
}
