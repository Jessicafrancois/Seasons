import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {studioCan,studioMembershipValid} from './studio-permissions.js';
import {isIP} from 'node:net';

const COOKIE='seasons_studio_sid';
const IDLE_MS=30*60*1000,ABS_MS=8*60*60*1000;
const digest=value=>createHash('sha256').update(value).digest('hex');
const constant=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
const secretPresent=()=>/^[a-f0-9]{64}$/i.test(process.env.STUDIO_SESSION_CSRF_KEY||'');
export function secureModeConfigured(){
 return process.env.STUDIO_AUTH_MODE==='secure'&&secretPresent()&&
  Boolean(process.env.SUPABASE_URL&&process.env.SUPABASE_SERVICE_ROLE_KEY&&process.env.SUPABASE_PUBLISHABLE_KEY)
  &&/^https:\/\//.test(process.env.SUPABASE_URL)
  &&(process.env.NODE_ENV!=='production'||/^https:\/\/[a-z0-9.-]+(?::443)?$/i.test(process.env.STUDIO_PUBLIC_ORIGIN||''));
}
export function studioAuthMode(){
 if(process.env.STUDIO_AUTH_MODE==='secure')return 'secure';
 if(process.env.NODE_ENV!=='production'&&process.env.STUDIO_AUTH_MODE!=='disabled')return 'local-basic';
 return 'disabled';
}
export function trustedOrigin(request){
 const source=request.headers.origin,host=request.headers.host;
 if(!source||!host)return false;
 try{
  const origin=new URL(source);
  if(origin.host!==host||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)return false;
  if(process.env.NODE_ENV==='production'){
   if(origin.protocol!=='https:'||process.env.STUDIO_PUBLIC_ORIGIN!==origin.origin)return false;
  }else if(!['http:','https:'].includes(origin.protocol))return false;
  return true;
 }catch{return false}
}
function supabaseOrigin(){const url=new URL(process.env.SUPABASE_URL);if(url.protocol!=='https:')throw Error('Supabase HTTPS required');return url.origin}
async function supabase(path,init={},service=false){
 const key=service?process.env.SUPABASE_SERVICE_ROLE_KEY:process.env.SUPABASE_PUBLISHABLE_KEY;
 const response=await fetch(supabaseOrigin()+path,{...init,headers:{
  apikey:key,...(service?{Authorization:'Bearer '+key}:{}),
  'Content-Type':'application/json',...(init.headers||{})
 },redirect:'error',signal:AbortSignal.timeout(9000)});
 const body=await response.json().catch(()=>null);
 if(!response.ok)throw Error('Auth or database request failed');
 return body;
}
async function table(path,init={}){return supabase('/rest/v1/'+path,init,true)}

async function sharedThrottle(request,purpose,limit){
 // Never store raw IPs or account identifiers in Postgres. The identifier
 // is HMACed with a server-only key and has a purpose-specific namespace.
 // Vercel replaces X-Forwarded-For at its trusted proxy boundary.
 // In local mode, ignore forwarding headers supplied by untrusted clients.
 const forwarded=process.env.VERCEL==='1'?
  String(request.headers['x-forwarded-for']||'').split(',')[0].trim():'';
 const peer=isIP(forwarded)?forwarded:request.socket?.remoteAddress||'unknown';
 const key=createHmac('sha256',Buffer.from(process.env.STUDIO_SESSION_CSRF_KEY,'hex'))
  .update('studio-auth:'+purpose+':'+peer).digest('hex');
 try{
  return await supabase('/rest/v1/rpc/seasons_studio_auth_limit_check',{
   method:'POST',body:JSON.stringify({
    p_identifier_hash:key,p_max_attempts:limit,p_window_seconds:900
   })
  },true)===true;
 }catch{
  // A disconnected rate limiter must never turn into unlimited login attempts.
  return false;
 }
}

async function body(request){
 if(!String(request.headers['content-type']||'').startsWith('application/json'))throw Error('Expected JSON');
 let text='';for await(const chunk of request){text+=chunk.toString('utf8');if(Buffer.byteLength(text)>5000)throw Error('Request too large')}
 return JSON.parse(text);
}
function send(response,status,payload,extra={}){
 response.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',...extra});
 response.end(JSON.stringify(payload));
}
const cookie=(value,maxAge)=>'seasons_studio_sid='+value+'; Path=/studio; HttpOnly; SameSite=Lax'+
 (process.env.NODE_ENV==='production'?'; Secure':'')+'; Max-Age='+maxAge;
function sidOf(request){
 const entry=String(request.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='));
 const value=entry?.slice(COOKIE.length+1)||'';
 return /^[a-f0-9]{64}$/.test(value)?value:null;
}
function csrfFor(sid){return createHmac('sha256',Buffer.from(process.env.STUDIO_SESSION_CSRF_KEY,'hex')).update(sid).digest('hex')}
async function membership(userId){
 const rows=await table('seasons_studio_members?select=user_id,role,confidentiality_clearance,is_active&user_id=eq.'+encodeURIComponent(userId)+'&limit=1');
 const m=rows?.[0];return studioMembershipValid(m)&&studioCan(m,'studio.read')?m:null;
}
function jwtClaims(token){
 try{const parts=token.split('.');return JSON.parse(Buffer.from(parts[1],'base64url').toString('utf8'))}catch{return null}
}
export async function secureLogin(request,response){
 if(!secureModeConfigured())return send(response,503,{error:'Individual Studio authentication is not configured'});
 if(!trustedOrigin(request))return send(response,403,{error:'Origin denied'});
 const ip=request.socket?.remoteAddress||'unknown',now=Date.now();
 if(!(await sharedThrottle(request,'login',6)))return send(response,429,{error:'Sign-in temporarily unavailable or rate limited'});
 try{
  const form=await body(request);
  const email=String(form?.email||'').trim(),password=String(form?.password||''),code=String(form?.code||'');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||password.length<1||password.length>512||!/^[0-9]{6}$/.test(code))throw Error('Denied');
  const grant=await supabase('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email,password})});
  let token=grant?.access_token;
  if(typeof token!=='string')throw Error('Denied');
  const user=await supabase('/auth/v1/user',{headers:{Authorization:'Bearer '+token}});
  if(!user?.id||!user?.email_confirmed_at||user.is_anonymous===true)throw Error('Denied');
  const member=await membership(user.id);
  if(!member)throw Error('Denied');
  const factors=Array.isArray(user.factors)?user.factors:[];
  const factor=factors.find(f=>f.factor_type==='totp'&&f.status==='verified');
  if(!factor?.id)throw Error('MFA enrollment required');
  const challenge=await supabase('/auth/v1/factors/'+encodeURIComponent(factor.id)+'/challenge',{
   method:'POST',headers:{Authorization:'Bearer '+token},body:'{}'
  });
  if(!challenge?.id)throw Error('Denied');
  const verify=await supabase('/auth/v1/factors/'+encodeURIComponent(factor.id)+'/verify',{
   method:'POST',headers:{Authorization:'Bearer '+token},
   body:JSON.stringify({challenge_id:challenge.id,code})
  });
  token=verify?.access_token;
  if(!token||jwtClaims(token)?.aal!=='aal2'||jwtClaims(token)?.sub!==user.id)throw Error('MFA required');
  const verified=await supabase('/auth/v1/user',{headers:{Authorization:'Bearer '+token}});
  if(verified?.id!==user.id)throw Error('Denied');
  const sid=randomBytes(32).toString('hex'),csrf=csrfFor(sid),time=new Date(now);
  await table('seasons_studio_sessions',{
   method:'POST',headers:{Prefer:'return=minimal'},
   body:JSON.stringify({session_hash:digest(sid),csrf_hash:digest(csrf),user_id:user.id,
    mfa_verified_at:time.toISOString(),last_seen_at:time.toISOString(),
    idle_expires_at:new Date(now+IDLE_MS).toISOString(),absolute_expires_at:new Date(now+ABS_MS).toISOString()})
  });
  send(response,200,{ok:true,role:member.role},{'Set-Cookie':cookie(sid,Math.ceil(ABS_MS/1000))});
 }catch{
  send(response,401,{error:'Sign-in denied. Confirm your invitation, verified email, and six-digit authenticator code.'});
 }
}
async function verifiedInvitedUser(request){
 const form=await body(request);
 const email=String(form?.email||'').trim(),password=String(form?.password||'');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||password.length<1||password.length>512)throw Error('Denied');
 const grant=await supabase('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email,password})});
 const token=grant?.access_token;
 if(!token)throw Error('Denied');
 const user=await supabase('/auth/v1/user',{headers:{Authorization:'Bearer '+token}});
 if(!user?.id||!user.email_confirmed_at||user.is_anonymous===true||!(await membership(user.id)))throw Error('Denied');
 return {form,token,user};
}
// Supabase returns the TOTP QR as SVG (sometimes already packaged as a data URL).
// Only deliver an image data URL to the browser; never interpolate SVG into HTML.
function totpQrImage(svg){
 if(typeof svg!=='string'||svg.length>100000)return null;
 if(/^data:image\/svg\+xml(?:;charset=utf-8|;utf-8|;utf8)?;base64,[A-Za-z0-9+/=]+$/i.test(svg))return svg;
 let source=svg;
 if(/^data:image\/svg\+xml(?:;charset=utf-8|;utf-8|;utf8)?,/i.test(source)){
  source=source.slice(source.indexOf(',')+1);
  // Supabase may supply an unescaped SVG data URL. Raw SVG can contain
  // percent signs (e.g. width="100%"), which decodeURIComponent rejects.
  // Decode only when the SVG markup itself is percent-encoded.
  if(/^\s*%3c/i.test(source)){
   try{source=decodeURIComponent(source)}catch{return null}
  }
 }
 if(!/^\s*(?:<\?xml[^>]*>\s*)?<svg[\s>]/i.test(source))return null;
 return 'data:image/svg+xml;base64,'+Buffer.from(source,'utf8').toString('base64');
}
export async function secureEnroll(request,response){
 if(!secureModeConfigured())return send(response,503,{error:'Secure Studio is not configured'});
 if(!trustedOrigin(request))return send(response,403,{error:'Origin denied'});
 if(!(await sharedThrottle(request,'enrollment',5)))return send(response,429,{error:'Setup temporarily unavailable or rate limited'});
 try{
  const {token,user}=await verifiedInvitedUser(request);
  if(user.factors?.some(f=>f.factor_type==='totp'&&f.status==='verified'))throw Error('Already enrolled');
  const result=await supabase('/auth/v1/factors',{
   method:'POST',headers:{Authorization:'Bearer '+token},
   body:JSON.stringify({factor_type:'totp',friendly_name:'Seasons Studio'})
  });
  if(!result?.id||!result.totp?.secret)throw Error('Enrollment unavailable');
  return send(response,200,{factorId:result.id,secret:result.totp.secret,qrCode:totpQrImage(result.totp.qr_code),
   message:'Scan the QR code with your authenticator app, or enter the secret manually. Then verify the six-digit code.'});
 }catch{return send(response,403,{error:'Authenticator setup unavailable. Check your invitation and password, or contact the founder.'})}
}
export async function secureConfirmEnrollment(request,response){
 if(!secureModeConfigured())return send(response,503,{error:'Secure Studio is not configured'});
 if(!trustedOrigin(request))return send(response,403,{error:'Origin denied'});
 if(!(await sharedThrottle(request,'enrollment',5)))return send(response,429,{error:'Setup temporarily unavailable or rate limited'});
 try{
  const {form,token,user}=await verifiedInvitedUser(request);
  const factorId=String(form?.factorId||''),code=String(form?.code||'');
  if(!/^[a-f0-9-]{36}$/i.test(factorId)||!/^[0-9]{6}$/.test(code))throw Error('Invalid factor');
  if(!user.factors?.some(f=>f.id===factorId&&f.factor_type==='totp'&&f.status==='unverified'))throw Error('Invalid factor');
  const challenge=await supabase('/auth/v1/factors/'+factorId+'/challenge',{
   method:'POST',headers:{Authorization:'Bearer '+token},body:'{}'
  });
  if(!challenge?.id)throw Error('Invalid challenge');
  const result=await supabase('/auth/v1/factors/'+factorId+'/verify',{
   method:'POST',headers:{Authorization:'Bearer '+token},
   body:JSON.stringify({challenge_id:challenge.id,code})
  });
  if(jwtClaims(result?.access_token||'')?.aal!=='aal2')throw Error('Failed to verify');
  return send(response,200,{ok:true,message:'Authenticator enrolled. You can now sign in to Studio.'});
 }catch{return send(response,403,{error:'Authenticator verification failed. Check the current code and try again.'})}
}
export async function secureIdentity(request){
 if(!secureModeConfigured())return null;
 const sid=sidOf(request);if(!sid)return null;
 try{
  const rows=await table('seasons_studio_sessions?select=session_hash,user_id,csrf_hash,mfa_verified_at,idle_expires_at,absolute_expires_at,revoked_at&session_hash=eq.'+digest(sid)+'&limit=1');
  const s=rows?.[0],now=Date.now();
  if(!s||s.revoked_at||Date.parse(s.idle_expires_at)<=now||Date.parse(s.absolute_expires_at)<=now||!constant(s.csrf_hash,digest(csrfFor(sid))))return null;
  const member=await membership(s.user_id);if(!member)return null;
  const end=Math.min(Date.parse(s.absolute_expires_at),now+IDLE_MS);
  await table('seasons_studio_sessions?session_hash=eq.'+digest(sid),{
   method:'PATCH',headers:{Prefer:'return=minimal'},
   body:JSON.stringify({last_seen_at:new Date(now).toISOString(),idle_expires_at:new Date(end).toISOString()})
  });
  return {id:s.user_id,member,csrf:csrfFor(sid),mfaVerifiedAt:s.mfa_verified_at};
 }catch{return null}
}
export function csrfValid(request,identity){
 return Boolean(identity&&trustedOrigin(request)&&constant(request.headers['x-studio-csrf'],identity.csrf));
}
export async function secureLogout(request,response,identity){
 if(!csrfValid(request,identity))return send(response,403,{error:'CSRF verification failed'});
 const sid=sidOf(request);
 try{await table('seasons_studio_sessions?session_hash=eq.'+digest(sid),{
  method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({revoked_at:new Date().toISOString()})
 });}catch{return send(response,503,{error:'Session revocation failed'})}
 return send(response,200,{ok:true},{'Set-Cookie':cookie('',0)});
}
export function requireManage(member){return member?.role==='Founder'&&studioCan(member,'integrations.manage')}
