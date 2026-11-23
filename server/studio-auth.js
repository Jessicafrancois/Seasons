import { studioCan, studioMembershipValid } from './studio-permissions.js';

const COOKIE = 'seasons_studio_session';
const loginFailures = new Map();
const LOGIN_WINDOW = 15 * 60_000;
const LOGIN_LIMIT = 6;

// Supabase mode is deliberately opt-in until a real founder account is enrolled.
// The existing shared password may be used only in local development.
export function studioAuthMode() {
  if (process.env.STUDIO_AUTH_MODE === 'supabase') return 'supabase';
  if (process.env.NODE_ENV !== 'production' && process.env.STUDIO_AUTH_MODE !== 'disabled') return 'local-basic';
  return 'disabled';
}
function configured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_PUBLISHABLE_KEY);
}
function origin() {
  if (!configured()) throw Error('Studio authentication is not configured');
  const url = new URL(process.env.SUPABASE_URL);
  if (url.protocol !== 'https:') throw Error('Supabase HTTPS is required');
  return url.origin;
}
function cookieToken(request) {
  const raw = String(request.headers.cookie || '');
  const item = raw.split(';').map(value => value.trim()).find(value => value.startsWith(COOKIE + '='));
  if (!item) return null;
  const token = item.slice(COOKIE.length + 1);
  return /^[A-Za-z0-9._-]{50,5000}$/.test(token) ? token : null;
}
function cookie(value, maxAge = 0) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return COOKIE + '=' + value + '; Path=/studio; HttpOnly; SameSite=Strict' + secure + '; Max-Age=' + maxAge;
}
function validOrigin(request) {
  const source = request.headers.origin, host = request.headers.host;
  if (!source || !host) return false;
  try {
    const u = new URL(source);
    return ['https:', 'http:'].includes(u.protocol) && u.host === host;
  } catch { return false; }
}
function reply(response, status, body) {
  response.writeHead(status, {
    'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'no-store',
    'X-Content-Type-Options':'nosniff',
    'Referrer-Policy':'no-referrer'
  });
  response.end(JSON.stringify(body));
}
async function remote(path, init={}) {
  const response = await fetch(origin() + path, {
    ...init,
    headers: {
      apikey: process.env.SUPABASE_PUBLISHABLE_KEY,
      'Content-Type':'application/json',
      ...(init.headers || {})
    },
    signal: AbortSignal.timeout(8000)
  });
  const body = await response.json().catch(() => null);
  return { ok:response.ok, status:response.status, body };
}
async function readBody(request) {
  if (!String(request.headers['content-type'] || '').startsWith('application/json')) return null;
  let text = '';
  for await (const chunk of request) {
    text += chunk.toString('utf8');
    if (Buffer.byteLength(text) > 4096) return null;
  }
  try { return JSON.parse(text); } catch { return null; }
}
export async function studioIdentity(request) {
  if (studioAuthMode() !== 'supabase' || !configured()) return null;
  const token = cookieToken(request);
  if (!token) return null;
  const response = await remote('/auth/v1/user', {
    headers: { Authorization:'Bearer ' + token }
  });
  const user = response.body;
  if (!response.ok || !user?.id || !user?.email_confirmed_at) return null;
  // A genuine Auth user is not automatically a Studio member.
  const memberResponse = await fetch(origin() +
    '/rest/v1/seasons_studio_members?select=user_id,role,confidentiality_clearance,is_active&user_id=eq.' +
    encodeURIComponent(user.id) + '&limit=1', {
    headers: {
      apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization:'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY
    },
    signal:AbortSignal.timeout(8000)
  });
  if (!memberResponse.ok) return null;
  const members = await memberResponse.json();
  const member = members?.[0];
  if (!studioMembershipValid(member) || !studioCan(member,'studio.read')) return null;
  return { id:user.id, email:user.email, member };
}
export async function studioLogin(request,response) {
  if (studioAuthMode() !== 'supabase' || !configured()) return reply(response,503,{error:'Studio sign-in is unavailable'});
  if (!validOrigin(request)) return reply(response,403,{error:'Origin not permitted'});
  const ip = request.socket.remoteAddress || 'unknown', now = Date.now();
  const attempts = (loginFailures.get(ip) || []).filter(t => now-t<LOGIN_WINDOW);
  if (attempts.length >= LOGIN_LIMIT) return reply(response,429,{error:'Too many sign-in attempts. Try again later'});
  const body = await readBody(request);
  const email = String(body?.email || '').trim();
  const password = String(body?.password || '');
  if (email.length>254 || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email) || password.length<1 || password.length>512)
    return reply(response,400,{error:'Enter a valid email and password'});
  try {
    const result = await remote('/auth/v1/token?grant_type=password',{
      method:'POST',body:JSON.stringify({ email,password })
    });
    const token = result.body?.access_token;
    // No membership = no cookie or Studio session, even with valid credentials.
    if (!result.ok || typeof token !== 'string') throw Error('Denied');
    const identity = await studioIdentity({ headers:{cookie:COOKIE+'='+token} });
    if (!identity) throw Error('Denied');
    loginFailures.delete(ip);
    const ttl = Math.max(1,Math.min(1800,Number(result.body.expires_in)||900));
    response.setHeader('Set-Cookie',cookie(token,ttl));
    return reply(response,200,{ok:true,role:identity.member.role});
  } catch {
    attempts.push(now);loginFailures.set(ip,attempts);
    if (loginFailures.size>10000) loginFailures.clear();
    return reply(response,401,{error:'Sign-in not authorized'});
  }
}
export async function studioLogout(request,response) {
  if (studioAuthMode() !== 'supabase') return reply(response,404,{error:'Not available'});
  if (!validOrigin(request)) return reply(response,403,{error:'Origin not permitted'});
  // Cookie clearing stops this browser session; server-side JWT revocation is a separate requirement.
  response.setHeader('Set-Cookie',cookie('',0));
  return reply(response,200,{ok:true});
}
