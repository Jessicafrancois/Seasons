import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';

const definitions=Object.freeze({
 'email':['apiKey'],
 'analytics':['siteId','apiKey'],
 'apple-music':['developerToken'],
 'supabase':['url','serviceRoleKey']
});
export function vaultConfigured(){
 try{
  const keys=JSON.parse(process.env.STUDIO_VAULT_KEYS||'{}'),active=process.env.STUDIO_VAULT_ACTIVE_KEY_ID;
  return Boolean(active&&/^[a-zA-Z0-9_-]{1,48}$/.test(active)&&typeof keys[active]==='string'&&/^[0-9a-f]{64}$/i.test(keys[active])
   && process.env.SUPABASE_URL&&process.env.SUPABASE_SERVICE_ROLE_KEY);
 }catch{return false}
}
function keyFor(id){
 const keys=JSON.parse(process.env.STUDIO_VAULT_KEYS||'{}');
 if(!/^[a-zA-Z0-9_-]{1,48}$/.test(id)||!/^[0-9a-f]{64}$/i.test(keys[id]||''))throw Error('Key unavailable');
 return Buffer.from(keys[id],'hex');
}
function encrypt(provider,properties){
 const id=process.env.STUDIO_VAULT_ACTIVE_KEY_ID,iv=randomBytes(12);
 const cipher=createCipheriv('aes-256-gcm',keyFor(id),iv);
 cipher.setAAD(Buffer.from(provider));
 const text=Buffer.concat([cipher.update(JSON.stringify(properties),'utf8'),cipher.final()]);
 return {key_id:id,ciphertext:[iv,cipher.getAuthTag(),text].map(x=>x.toString('base64url')).join('.')};
}
function decrypt(provider,item){
 const parts=String(item.ciphertext||'').split('.');
 if(parts.length!==3)throw Error('Invalid ciphertext');
 const [iv,tag,text]=parts.map(x=>Buffer.from(x,'base64url'));
 if(iv.length!==12||tag.length!==16)throw Error('Invalid ciphertext');
 const decipher=createDecipheriv('aes-256-gcm',keyFor(item.key_id),iv);
 decipher.setAAD(Buffer.from(provider));
 decipher.setAuthTag(tag);
 return JSON.parse(Buffer.concat([decipher.update(text),decipher.final()]).toString('utf8'));
}
function endpoint(path){
 const url=new URL(process.env.SUPABASE_URL);
 if(url.protocol!=='https:')throw Error('Secure database required');
 return url.origin+'/rest/v1/'+path;
}
async function sql(path,method='GET',record){
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 const response=await fetch(endpoint(path),{
  method,headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',
   ...(method==='POST'?{Prefer:'resolution=merge-duplicates,return=minimal'}:{})},
  ...(record?{body:JSON.stringify(record)}:{}),
  redirect:'error',signal:AbortSignal.timeout(9000)
 });
 if(!response.ok)throw Error('Credential store unavailable');
 if(method==='GET')return response.json();
 return null;
}
export function validateCredential(provider,input){
 const fields=definitions[provider];
 if(!fields||!input||typeof input!=='object'||Array.isArray(input))throw Error('Unknown provider or invalid configuration');
 const obj={};
 for(const field of fields){
  const value=input[field];
  if(typeof value!=='string'||!value.trim()||value.length>3000)throw Error('Missing or invalid '+field);
  obj[field]=value.trim();
 }
 if(provider==='email'&&!/^re_[A-Za-z0-9_-]{8,}$/.test(obj.apiKey))throw Error('Expected a Resend API key');
 if(provider==='analytics'&&!/^[a-z0-9][a-z0-9.-]{1,253}$/i.test(obj.siteId))throw Error('Invalid site identifier');
 if(provider==='supabase'){
  const url=new URL(obj.url);
  if(url.protocol!=='https:'||!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url.origin)
   ||url.pathname!=='/'||url.search||url.hash)throw Error('Only direct secure Supabase project URLs are supported');
  obj.url=url.origin;
 }
 return obj;
}
export async function verifyCredential(provider,credentials){
 try{
  let url,headers={},method='GET',body;
  switch(provider){
   case 'email':
    url='https://api.resend.com/domains';headers={Authorization:'Bearer '+credentials.apiKey};break;
   case 'analytics':
    url='https://plausible.io/api/v1/stats/aggregate?site_id='+encodeURIComponent(credentials.siteId)+'&period=day&metrics=visitors';
    headers={Authorization:'Bearer '+credentials.apiKey};break;
   case 'apple-music':
    url='https://api.music.apple.com/v1/catalog/us/charts?types=songs&limit=1';
    headers={Authorization:'Bearer '+credentials.developerToken};break;
   case 'supabase':
    url=credentials.url+'/rest/v1/seasons_inquiries?select=id&limit=0';
    headers={apikey:credentials.serviceRoleKey,Authorization:'Bearer '+credentials.serviceRoleKey};break;
   default:return {ok:false,message:'Provider not supported'};
  }
  const response=await fetch(url,{method,headers,redirect:'error',signal:AbortSignal.timeout(8000)});
  if(response.status>=200&&response.status<300)return {ok:true,message:'Provider credentials verified. Setup of individual workflows may still be required.'};
  return {ok:false,message:'Provider could not authorize the requested read-only check (HTTP '+response.status+').'};
 }catch{return {ok:false,message:'Provider could not be reached or its configuration was invalid.'}}
}
export async function vaultList(){
 if(!vaultConfigured())return {ready:false,providers:[]};
 const rows=await sql('seasons_studio_credentials?select=provider,configured_at,updated_at');
 return {ready:true,providers:(rows||[]).map(x=>({provider:x.provider,configuredAt:x.configured_at,updatedAt:x.updated_at}))};
}
export async function vaultSave(provider,values,identity){
 if(!vaultConfigured())return {ok:false,status:503,message:'Secure credential vault is not configured'};
 let credentials;
 try{credentials=validateCredential(provider,values)}catch{return {ok:false,status:422,message:'Please check the required fields'}};
 const verified=await verifyCredential(provider,credentials);
 if(!verified.ok)return {ok:false,status:422,message:verified.message};
 try{
  const prior=await sql('seasons_studio_credentials?provider=eq.'+encodeURIComponent(provider)+'&select=provider');
  const {key_id,ciphertext}=encrypt(provider,credentials);
  await sql('seasons_studio_credentials','POST',{provider,key_id,ciphertext,configured_by:identity.id,updated_at:new Date().toISOString()});
  await sql('seasons_studio_credential_events','POST',{provider,event_type:prior?.length?'replaced':'created',performed_by:identity.id});
  return {ok:true,status:200,message:'Credentials verified and stored encrypted. No automatic publishing or email sending enabled.'};
 }catch{return {ok:false,status:503,message:'Unable to save credentials securely'}}
}
export async function vaultDelete(provider,identity){
 if(!vaultConfigured()||!Object.hasOwn(definitions,provider))return {ok:false,status:503,message:'Credential vault is unavailable'};
 try{
  await sql('seasons_studio_credentials?provider=eq.'+encodeURIComponent(provider),'DELETE');
  await sql('seasons_studio_credential_events','POST',{provider,event_type:'removed',performed_by:identity.id});
  return {ok:true,status:200,message:'Stored credentials removed'};
 }catch{return {ok:false,status:503,message:'Could not remove credentials'}}
}
// Called only by trusted server-side workflows; values are never returned to Studio UI.
export async function serverCredential(provider){
 if(!vaultConfigured()||!Object.hasOwn(definitions,provider))return null;
 const rows=await sql('seasons_studio_credentials?provider=eq.'+encodeURIComponent(provider)+'&select=key_id,ciphertext');
 return rows?.[0]?decrypt(provider,rows[0]):null;
}
