import {pageInventory} from './studio-data.js';
import {seasons} from '../public/js/content/index.js';
import {validateDraft} from './studio-drafts.js';

const plain=value=>String(value??'').replace(/<br\s*\/?>/gi,'\n');
const textField=(key,label,value,max=200,multiline=false)=>({key,label,value:plain(value),max,multiline});
export function creativeDefinitions(){
 const definitions=pageInventory().map(page=>{
  let fields=[textField('title','Title',page.title)];
  const season=seasons.find(s=>page.route==='#/seasons/'+s.slug);
  const project=seasons.flatMap(s=>s.projects).find(p=>page.route==='#/projects/'+p.id);
  const opening=page.route==='#/';
  if(season)fields=[textField('title','Chapter title',season.title),textField('description','Description',season.description,4000,true),textField('quote','Highlighted quote',season.quote,1000,true),textField('themes','Themes (one per line)',season.themes.join('\n'),500,true),textField('coverAlt','Cover accessibility description',season.coverAlt,500)];
  else if(project)fields=[textField('title','Title',project.title),textField('description','Description',project.description,4000,true),textField('theme','Theme',project.theme),textField('label','Editorial label',project.label),textField('cover','Cover lettering',project.cover,500,true)];
  else if(opening){
   const active=seasons[0];fields=[textField('title','Workspace title',page.title),textField('intro','Intro text',active.intro,4000,true),textField('enter','Enter button',active.cta.enter),textField('explore','Explore button',active.cta.explore)];
  }
  return {key:page.route,...page,fields,projectType:project?.type||(page.category==='Track'?'Song':null),placeholder:Boolean(project?.label?.toLowerCase().includes('placeholder')||page.category==='Track'||project?.label?.includes('study'))};
 });
 definitions.push({key:'motion:opening',title:'Opening motion',category:'Motion',fields:[],source:'Studio preview'});
 return definitions;
}
const defaults={rotation:8,tileSize:64,gap:4,duration:900,mode:'independent',solidColor:'#a4a99b',straightenOnZoom:true,fillViewport:true};
function initial(definition){return definition.key==='motion:opening'?{...defaults}:Object.fromEntries(definition.fields.map(f=>[f.key,f.value]));}
export function validateCreativeDraft(key,values){
 const def=creativeDefinitions().find(d=>d.key===key);
 if(!def||!values||typeof values!=='object'||Array.isArray(values))throw Error('Invalid draft target');
 if(key==='motion:opening')return validateDraft(values);
 if(Object.keys(values).some(k=>!def.fields.some(f=>f.key===k)))throw Error('Invalid draft field');
 const result={};
 for(const f of def.fields){
  const value=values[f.key];
  if(typeof value!=='string'||value.length>f.max||(f.key==='title'&&!value.trim()))throw Error('Invalid '+f.label);
  result[f.key]=value;
 }
 return result;
}
const table='seasons_studio_creative_drafts';
async function store(method,query='',body,prefer){
 const url=new URL(process.env.SUPABASE_URL);
 const token=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(url.protocol!=='https:'||!token)throw Error('Draft storage unavailable');
 const response=await fetch(url.origin+'/rest/v1/'+table+query,{
  method,headers:{apikey:token,Authorization:'Bearer '+token,'Content-Type':'application/json',...(prefer?{Prefer:prefer}:{})},
  ...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(6000)
 });
 if(!response.ok)throw Error('Draft storage unavailable');
 return response.json();
}
export async function listCreativeDrafts(){
 const rows=await store('GET','?select=draft_key,payload,revision,updated_at');
 return creativeDefinitions().map(def=>{
  const row=rows.find(r=>r.draft_key===def.key);
  return {...def,values:row?validateCreativeDraft(def.key,row.payload):initial(def),revision:row?.revision||0,savedAt:row?.updated_at||null};
 });
}
export async function saveCreativeDraft(input,identity){
 const key=input?.key,revision=input?.revision;
 if(!identity?.id)return {status:403,body:{error:'Permission denied'}};
 if(!Number.isSafeInteger(revision)||revision<0)return {status:422,body:{error:'Invalid revision'}};
 let payload;
 try{payload=validateCreativeDraft(key,input.values)}catch(e){return {status:422,body:{error:e.message}}}
 const record={draft_key:key,payload,revision:revision+1,updated_by:identity.id,updated_at:new Date().toISOString()};
 const rows=revision===0
  ?await store('POST','?on_conflict=draft_key',record,'resolution=ignore-duplicates,return=representation')
  :await store('PATCH','?draft_key=eq.'+encodeURIComponent(key)+'&revision=eq.'+revision,record,'return=representation');
 if(rows.length!==1)return {status:409,body:{error:'This draft changed in another session. Reload before saving again.'}};
 return {status:200,body:{key,values:payload,revision:rows[0].revision,savedAt:rows[0].updated_at}};
}
