import {oauthTokensForServer} from './studio-oauth.js';
import {notionSourceDefinitions} from './studio-notion-sources.js';

// Only these explicitly chosen destinations and source property names are eligible.
// Eligibility is metadata, not a publishing or synchronization permission.
const field=(key,label,type,preferred,visibility='private',alternatives=[])=>({key,label,type,preferred,visibility,allowed:[preferred,...alternatives]});
const definitions={
 seasons:[field('title','Workspace title','title','title','private',['Name'])],
 fall:[field('title','Chapter title','title','title','review',['Name'])],
 opening:[
  field('chapter','Chapter','title','Chapter','review'),
  field('photos','Opening photographs','rich_text','Photos','review'),
  field('solidColor','Tile color','rich_text','Tile Color','review'),
  field('letterColor','Letter color','rich_text','Letter Color','review'),
  field('centerWord','Center word','rich_text','Center Word','review'),
  field('rotation','Initial rotation (degrees)','number','Tilt','review'),
  field('gap','Tile gap (pixels)','number','Tile Gap','review'),
  field('fadeSeconds','Fade (seconds)','number','Fade Seconds','review'),
  field('revealSeconds','Reveal (seconds)','number','Reveal Seconds','review'),
  field('zoomSeconds','Zoom (seconds)','number','Zoom Seconds','review')
 ],
 records:[
  field('title','Song title','title','Record','review'),
  field('concept','Concept','rich_text','Concept','private'),
  field('stage','Production stage','status','Stage'),
  field('themes','Themes','multi_select','Theme'),
  field('bpm','BPM','number','BPM'),
  field('key','Musical key','rich_text','Key'),
  field('trackNumber','Track number','number','Track Number','review'),
  field('audioFiles','Audio files','files','Audio Files'),
  field('references','Related references','relation','References'),
  field('inspiration','Related notes','relation','Inspiration Notes')
 ],
 references:[
  field('title','Reference title','title','Reference'),
  field('creator','Creator','rich_text','Creator'),
  field('medium','Medium','select','Medium'),
  field('source','Source link','url','Source'),
  field('themes','Themes','multi_select','Theme'),
  field('reflection','What resonates','rich_text','What Resonates'),
  field('records','Related records','relation','Related Records')
 ],
 inspiration:[
  field('title','Note title','title','Note'),
  field('details','Creative notes','rich_text','Details'),
  field('kind','Kind','select','Kind'),
  field('stage','Development stage','select','Stage'),
  field('themes','Themes','multi_select','Theme'),
  field('capturedOn','Captured on','date','Captured On'),
  field('records','Related records','relation','Related Records')
 ]
};
const table='seasons_studio_notion_mappings';
async function store(tableName,method,query,body){
 const url=new URL(process.env.SUPABASE_URL);
 const token=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(url.protocol!=='https:'||!token)throw Error('Mapping store unavailable');
 const response=await fetch(url.origin+'/rest/v1/'+tableName+query,{
  method,headers:{apikey:token,Authorization:'Bearer '+token,'Content-Type':'application/json',...(method==='POST'?{Prefer:'resolution=merge-duplicates,return=representation'}:{})},
  ...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(5000)
 });
 if(!response.ok)throw Error('Mapping store unavailable');
 return response.json();
}
function failure(status,message){return {status,body:{ok:false,message}}}
async function context(key){
 const source=notionSourceDefinitions.find(s=>s.key===key);
 if(!source)return failure(404,'Unknown source.');
 const filter='?source_key=eq.'+encodeURIComponent(key);
 const rows=await store('seasons_studio_notion_sources','GET',filter+'&select=source_key,source_id');
 if(!rows.some(row=>row.source_id===source.id))return failure(409,'Register this source before mapping it.');
 const connection=await oauthTokensForServer('notion');
 if(!connection?.accessToken)return failure(409,'Reconnect Notion first.');
 const response=await fetch('https://api.notion.com/v1/'+(source.kind==='page'?'pages':'data_sources')+'/'+source.id,{
  headers:{Authorization:'Bearer '+connection.accessToken,'Notion-Version':'2025-09-03'},
  redirect:'error',signal:AbortSignal.timeout(5000)
 });
 if(!response.ok)return failure(409,'Notion source access could not be verified (HTTP '+response.status+').');
 const data=await response.json();
 if(data.id!==source.id||data.object!==source.kind||data.archived||data.in_trash)return failure(409,'Notion source is unavailable.');
 const properties=Object.entries(data.properties||{}).map(([name,p])=>({name,id:p?.id,type:p?.type})).filter(p=>typeof p.id==='string'&&typeof p.type==='string');
 return {source,properties,filter};
}
export function availableMappings(key,properties,saved=[]){
 return (definitions[key]||[]).map(f=>{
  const choices=properties.filter(p=>p.type===f.type&&f.allowed.includes(p.name)).map(p=>({id:p.id,name:p.name,type:p.type}));
  const previous=saved.find(p=>p.destination===f.key);
  const selected=previous?choices.find(p=>p.id===previous.propertyId):choices.find(p=>p.name===f.preferred)||choices[0];
  return {destination:f.key,label:f.label,type:f.type,visibility:f.visibility,direction:'notion_to_studio',choices,propertyId:selected?.id||'',enabled:Boolean(selected)&&(previous?previous.enabled===true:true),stale:Boolean(previous?.propertyId&&!selected)};
 });
}
export function validateMappings(available,input){
 if(!Array.isArray(input)||input.length!==available.length)return null;
 const result=[];
 for(const f of available){
  const matches=input.filter(x=>x?.destination===f.destination);
  if(matches.length!==1)return null;
  const m=matches[0];
  if(typeof m.enabled!=='boolean'||typeof m.propertyId!=='string')return null;
  const selected=f.choices.find(p=>p.id===m.propertyId);
  if((m.enabled||m.propertyId)&&!selected)return null;
  result.push({destination:f.destination,propertyId:selected?.id||'',propertyName:selected?.name||null,type:f.type,enabled:m.enabled,visibility:f.visibility,direction:'notion_to_studio'});
 }
 return result;
}
export async function getNotionMappings(key){
 const ctx=await context(key);
 if(!ctx.source)return ctx;
 const saved=(await store(table,'GET',ctx.filter+'&select=mappings,updated_at'))[0];
 return {status:200,body:{ok:true,source:ctx.source.name,destination:ctx.source.destination,savedAt:saved?.updated_at||null,fields:availableMappings(key,ctx.properties,saved?.mappings||[]),planned:ctx.source.kind==='page'?['Description, themes, cover and quotes require explicit structured fields or block mapping in a later phase.']:[]}};
}
export async function saveNotionMappings(key,input,identity){
 if(!identity?.id)return failure(403,'Authentication required.');
 const ctx=await context(key);
 if(!ctx.source)return ctx;
 const available=availableMappings(key,ctx.properties);
 const mappings=validateMappings(available,input?.mappings);
 if(!mappings)return failure(422,'Invalid mapping. Reload the current source schema and try again.');
 const rows=await store(table,'POST','',{source_key:key,mappings,updated_by:identity.id,updated_at:new Date().toISOString()});
 return {status:200,body:{ok:true,message:'Draft field mappings saved. No Notion content was imported, changed or published.',savedAt:rows[0]?.updated_at||null}};
}
