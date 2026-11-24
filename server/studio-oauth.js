import { randomBytes,createCipheriv,createDecipheriv,createHmac,timingSafeEqual } from 'node:crypto';
import {vaultConfigured} from './studio-vault.js';

const providers={
 notion:{authorization:'https://api.notion.com/v1/oauth/authorize',token:'https://api.notion.com/v1/oauth/token',
  id:'NOTION_OAUTH_CLIENT_ID',secret:'NOTION_OAUTH_CLIENT_SECRET',scope:null},
 spotify:{authorization:'https://accounts.spotify.com/authorize',token:'https://accounts.spotify.com/api/token',
  id:'SPOTIFY_CLIENT_ID',secret:'SPOTIFY_CLIENT_SECRET',scope:'user-read-private'}
};
const storeTable='seasons_studio_oauth_connections';
const path='/studio/oauth/callback';
const stateCookie='seasons_oauth_state';
function enabled(){
 return process.env.STUDIO_OAUTH_ENABLED==='true'
  && process.env.STUDIO_AUTH_MODE==='secure'
  && /^[a-fA-F0-9]{64}$/.test(process.env.STUDIO_SESSION_CSRF_KEY||'')
  && vaultConfigured();
}
function config(provider){
 const p=providers[provider];
 return p&&enabled()&&Boolean(process.env[p.id]&&process.env[p.secret])?p:null;
}
function origin(){
 const url=new URL(process.env.STUDIO_OAUTH_ORIGIN);
 if(url.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(url.hostname))
  throw Error('Secure OAuth origin required');
 if(url.pathname!=='/'||url.search||url.hash||url.username||url.password)throw Error('Invalid OAuth origin');
 return url.origin;
}
function callbackUrl(){return origin()+path;}
function cookie(value,age){return stateCookie+'='+value+'; Path=/studio/oauth; HttpOnly; SameSite=Lax'+(origin().startsWith('https:')?'; Secure':'')+'; Max-Age='+age;}
function encode(text){return Buffer.from(text).toString('base64url');}
function equal(a,b){const x=Buffer.from(a||''),y=Buffer.from(b||'');return x.length===y.length&&timingSafeEqual(x,y);}
function cookieValue(request){
 const entry=(request.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(stateCookie+'='));
 return entry?.slice(stateCookie.length+1)||'';
}
async function vault(method,provider,body){
 const url=new URL(process.env.SUPABASE_URL);
 if(url.protocol!=='https:')throw Error('Supabase HTTPS required');
 const query='/rest/v1/'+storeTable+'?provider=eq.'+encodeURIComponent(provider);
 const response=await fetch(url.origin+query,{
  method,headers:{
   apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,
   Authorization:'Bearer '+process.env.SUPABASE_SERVICE_ROLE_KEY,
   'Content-Type':'application/json',
   ...(method==='POST'?{Prefer:'resolution=merge-duplicates,return=minimal'}:{})
  },
  body:body?JSON.stringify(body):undefined,
  redirect:'error',signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw Error('Encrypted credential store unavailable');
 return method==='GET'?await response.json():null;
}
function key(id){
 const keys=JSON.parse(process.env.STUDIO_VAULT_KEYS||'{}');
 if(!/^[A-Za-z0-9_-]{1,48}$/.test(id)||!/^[a-f0-9]{64}$/i.test(keys[id]||''))throw Error('Encryption key unavailable');
 return Buffer.from(keys[id],'hex');
}
function encrypt(value,provider){
 if(!value)return null;
 const id=process.env.STUDIO_VAULT_ACTIVE_KEY_ID,iv=randomBytes(12);
 const cipher=createCipheriv('aes-256-gcm',key(id),iv);
 cipher.setAAD(Buffer.from(provider));
 const data=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);
 return [id,...[iv,cipher.getAuthTag(),data].map(x=>x.toString('base64url'))].join('.');
}
function decrypt(value,provider){
 if(!value)return null;
 const parts=value.split('.');
 if(parts.length!==4)throw Error('Unknown encrypted token version');
 const [id,encodedIv,encodedTag,encodedData]=parts;
 const iv=Buffer.from(encodedIv,'base64url'),tag=Buffer.from(encodedTag,'base64url'),data=Buffer.from(encodedData,'base64url');
 if(iv.length!==12||tag.length!==16)throw Error('Invalid encrypted token');
 const decipher=createDecipheriv('aes-256-gcm',key(id),iv);
 decipher.setAAD(Buffer.from(provider));decipher.setAuthTag(tag);
 return Buffer.concat([decipher.update(data),decipher.final()]).toString('utf8');
}
function signState(payload){
 const message=encode(JSON.stringify(payload));
 const signature=createHmac('sha256',Buffer.from(process.env.STUDIO_SESSION_CSRF_KEY,'hex')).update(message).digest('base64url');
 return message+'.'+signature;
}
function verifyState(raw){
 const parts=raw.split('.');
 if(parts.length!==2)return null;
 const expected=createHmac('sha256',Buffer.from(process.env.STUDIO_SESSION_CSRF_KEY,'hex')).update(parts[0]).digest('base64url');
 if(!equal(expected,parts[1]))return null;
 return JSON.parse(Buffer.from(parts[0],'base64url').toString('utf8'));
}
export async function oauthTokensForServer(provider){
 if(!config(provider))return null;
 const rows=await vault('GET',provider);
 const record=rows?.[0];
 if(!record)return null;
 return {accessToken:decrypt(record.encrypted_access_token,provider),
  refreshToken:decrypt(record.encrypted_refresh_token,provider),expiresAt:record.token_expires_at};
}
function oauthSetupIssue(id){
 if(process.env.STUDIO_OAUTH_ENABLED!=='true')return 'oauth_disabled';
 if(process.env.STUDIO_AUTH_MODE!=='secure')return 'secure_signin_required';
 if(!/^[a-fA-F0-9]{64}$/.test(process.env.STUDIO_SESSION_CSRF_KEY||''))return 'security_key_invalid';
 if(!vaultConfigured())return 'encrypted_vault_unavailable';
 if(!safeOrigin())return 'callback_origin_invalid';
 const p=providers[id];
 if(!p||!process.env[p.id]?.trim()||!process.env[p.secret]?.trim())return 'provider_credentials_missing';
 return null;
}
export function oauthAvailability(){
 return Object.fromEntries(Object.keys(providers).map(id=>{
  const issue=oauthSetupIssue(id);
  return [id,{
   available:!issue,
   issue,
   method:'oauth',
   permissions:id==='notion'?['Select and authorize specific Notion pages','Read shared editorial content','Manage only the content allowed by your Notion integration capabilities']:
    ['Read your Spotify account profile']
  }];
 }));
}
function safeOrigin(){try{return Boolean(origin())}catch{return false}}
export async function oauthConnections(){
 if(!enabled())return {};
 const rows=await vault('GET','notion'); // Provider-filtered read; separate Spotify query
 const second=await vault('GET','spotify');
 const present={};
 for(const [id,list] of [['notion',rows],['spotify',second]]){
  const record=list?.[0];
  if(record)present[id]={connected:true,label:record.external_account_label||'Authorized account',connectedAt:record.connected_at};
 }
 return present;
}
export function oauthStart(request,response,provider,identity){
 const conf=config(provider);
 if(!identity?.id)return response.writeHead(403).end('Authentication required.');
 if(!conf)return response.writeHead(503,{'Cache-Control':'no-store'}).end('Account connection is not configured.');
 const expected=origin();
 if(request.headers.host!==new URL(expected).host)return response.writeHead(403).end('Invalid host.');
 const state=randomBytes(24).toString('base64url'),nonce=signState({state,provider,userId:identity.id,time:Date.now()});
 const url=new URL(conf.authorization);
 url.searchParams.set('client_id',process.env[conf.id]);
 url.searchParams.set('response_type','code');
 url.searchParams.set('redirect_uri',callbackUrl());
 url.searchParams.set('state',state);
 if(provider==='notion')url.searchParams.set('owner','user');
 if(conf.scope)url.searchParams.set('scope',conf.scope);
 response.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Set-Cookie':cookie(nonce,600),'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}).end(JSON.stringify({authorizationUrl:url.href}));
}
export async function oauthCallback(request,response,query,identity){
 const finish=(reason)=>response.writeHead(303,{
  Location:'/studio/?connection='+encodeURIComponent(reason)+'#integrations',
  'Set-Cookie':cookie('',0),'Cache-Control':'no-store','Referrer-Policy':'no-referrer'
 }).end();
 let state;
 try{state=verifyState(cookieValue(request));}catch{return finish('invalid_state')}
 if(!state||!identity?.id||state.userId!==identity.id||!providers[state.provider]||Date.now()-state.time>600000||Date.now()<state.time
  ||!equal(state.state,query.get('state'))||!config(state.provider)||query.has('error'))
  return finish('denied');
 const conf=providers[state.provider],basic='Basic '+Buffer.from(process.env[conf.id]+':'+process.env[conf.secret]).toString('base64');
 const code=query.get('code');
 if(!code||code.length>2048)return finish('denied');
 try{
  const response=await fetch(conf.token,{
   method:'POST',
   headers:{
    Authorization:basic,'Content-Type':state.provider==='notion'?'application/json':'application/x-www-form-urlencoded'
   },
   body:state.provider==='notion'
    ?JSON.stringify({grant_type:'authorization_code',code,redirect_uri:callbackUrl()})
    :new URLSearchParams({grant_type:'authorization_code',code,redirect_uri:callbackUrl()}).toString(),
   redirect:'error',signal:AbortSignal.timeout(8000)
  });
  if(!response.ok)return finish('denied');
  const token=await response.json();
  if(typeof token.access_token!=='string'||!token.access_token)return finish('denied');
  const label=state.provider==='notion'?(token.workspace_name||'Notion workspace'):'Spotify account';
  await vault('POST',state.provider,{
   provider:state.provider,
   encrypted_access_token:encrypt(token.access_token,state.provider),
   encrypted_refresh_token:encrypt(token.refresh_token,state.provider),
   token_expires_at:Number.isFinite(token.expires_in)?new Date(Date.now()+token.expires_in*1000).toISOString():null,
   external_account_label:String(label).slice(0,140),
   updated_at:new Date().toISOString()
  });
  return finish('connected');
 }catch{return finish('unavailable')}
}

export async function oauthDisconnect(provider){
 if(!Object.hasOwn(providers,provider))return {ok:false,message:'Unsupported provider'};
 if(!enabled())return {ok:false,message:'OAuth connection storage is not configured'};
 try{
  await vault('DELETE',provider);
  return {ok:true,message:'Saved connection removed. Revoke provider permissions in your provider account if desired.'};
 }catch{return {ok:false,message:'Could not remove the saved connection'};}
}
