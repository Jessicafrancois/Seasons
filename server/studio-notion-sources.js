import {oauthTokensForServer} from './studio-oauth.js';

const SOURCES=Object.freeze([
 {key:'seasons',id:'41a3bfec-cf32-8118-8925-de4ee71b85bb',kind:'page',name:'Seasons headquarters',destination:'Creative foundation'},
 {key:'fall',id:'4173bfec-cf32-81ea-9799-f5b78c4e2fb1',kind:'page',name:'Season 1 · Fall',destination:'Seasons Manager'},
 {key:'opening',id:'41e3bfec-cf32-8153-b5f9-000be12e3dce',kind:'data_source',name:'Opening Settings',destination:'Motion Studio'},
 {key:'records',id:'b11de37b-c342-4240-b851-e69c786f2a34',kind:'data_source',name:'Records',destination:'Projects & Records'},
 {key:'references',id:'755ddb91-9de6-4932-9480-35301a187431',kind:'data_source',name:'References',destination:'Private creative references'},
 {key:'inspiration',id:'93366d67-cca5-4782-b62d-35db6d5a0dcc',kind:'data_source',name:'Inspiration Notes',destination:'Private creative notes'}
]);
const findSource=key=>SOURCES.find(source=>source.key===key);
const table='seasons_studio_notion_sources';
async function registry(method='GET',key=null,record=null){
 const origin=new URL(process.env.SUPABASE_URL);
 if(origin.protocol!=='https:')throw Error('Registry unavailable');
 const filter=key?'?source_key=eq.'+encodeURIComponent(key):'?select=source_key,source_id,registered_at';
 const token=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!token)throw Error('Registry unavailable');
 const response=await fetch(origin.origin+'/rest/v1/'+table+filter,{
  method,headers:{apikey:token,Authorization:'Bearer '+token,'Content-Type':'application/json',...(method==='POST'?{Prefer:'resolution=merge-duplicates,return=minimal'}:{})},
  ...(record?{body:JSON.stringify(record)}:{}),redirect:'error',signal:AbortSignal.timeout(5000)
 });
 if(!response.ok)throw Error('Registry unavailable');
 return method==='GET'?await response.json():null;
}
export async function checkNotionSource(source,token){
 if(!token)return 'not_connected';
 if(!SOURCES.includes(source))return 'unknown';
 try{
  const response=await fetch('https://api.notion.com/v1/'+(source.kind==='page'?'pages':'data_sources')+'/'+source.id,{
   method:'GET',headers:{Authorization:'Bearer '+token,'Notion-Version':'2025-09-03'},redirect:'error',signal:AbortSignal.timeout(4500)
  });
  // Never return Notion response bodies, private property values or access tokens.
  if(response.status===200){
   const data=await response.json();
   return data.object===source.kind&&data.id===source.id&&!data.archived&&!data.in_trash?'accessible':'unavailable';
  }
  if(response.status===401)return 'authorization_expired';
  if(response.status===403||response.status===404)return 'not_shared';
  if(response.status===429)return 'rate_limited';
  return 'unavailable';
 }catch{return 'unavailable'}
}
export async function discoverNotionSources(){
 const [connection,registered]=await Promise.all([oauthTokensForServer('notion'),registry()]);
 const token=connection?.accessToken;
 const statuses=await Promise.all(SOURCES.map(source=>checkNotionSource(source,token)));
 return {connected:Boolean(token),checkedAt:new Date().toISOString(),sources:SOURCES.map((source,i)=>{
  const row=registered.find(x=>x.source_key===source.key&&x.source_id===source.id);
  return {key:source.key,name:source.name,kind:source.kind,destination:source.destination,access:statuses[i],registered:Boolean(row),registeredAt:row?.registered_at||null};
 })};
}
export async function registerNotionSource(input,identity){
 const source=findSource(input?.key);
 if(!source||typeof input?.registered!=='boolean')return {status:400,body:{ok:false,message:'Invalid source selection.'}};
 if(!identity?.id)return {status:403,body:{ok:false,message:'Authentication required.'}};
 if(!input.registered){
  await registry('DELETE',source.key);
  return {status:200,body:{ok:true,message:'Source registration removed. Notion content was not changed.'}};
 }
 const connection=await oauthTokensForServer('notion');
 const status=await checkNotionSource(source,connection?.accessToken);
 if(status!=='accessible')return {status:409,body:{ok:false,message:'Source access could not be verified. Refresh discovery and review sharing permissions.'}};
 await registry('POST',null,{source_key:source.key,source_id:source.id,registered_by:identity.id,registered_at:new Date().toISOString()});
 return {status:200,body:{ok:true,message:'Source registered for future mapping. No content imported or published.'}};
}
export const notionSourceDefinitions=SOURCES;
