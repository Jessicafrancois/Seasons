const types = new Set(['Collaboration', 'Sampling inquiry', 'Commercial use', 'General inquiry']);
const recent = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 4;

export function connected() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
function baseUrl() {
  const url = new URL(process.env.SUPABASE_URL);
  if (url.protocol !== 'https:') throw new Error('Secure Supabase URL required');
  return url.origin;
}
export async function db(path, options = {}) {
  const res = await fetch(baseUrl() + '/rest/v1/' + path, {
    ...options,
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    signal: AbortSignal.timeout(10000)
  });
  if (!res.ok) throw new Error('Database request failed: ' + res.status);
  const body = await res.text();
  return body ? JSON.parse(body) : null;
}
export async function operationalData() {
  if (!connected()) return { inquiryCount: null, inquiries: [], alerts: [], alertCount: null, storageConnected: false };
  const [inquiries, alerts] = await Promise.all([
    db('seasons_inquiries?select=id,created_at,contact_name,inquiry_type,project_id,status,confidentiality&order=created_at.desc&limit=25'),
    db('seasons_alerts?select=id,created_at,severity,title,status&status=neq.resolved&order=created_at.desc&limit=25')
  ]);
  return { inquiryCount: inquiries.filter(x => x.status === 'new').length, inquiryCountScope: 'new in latest 25', inquiries, alerts, alertCount: alerts.length, alertCountScope: 'open or acknowledged in latest 25', storageConnected: true };
}
function send(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  response.end(JSON.stringify(payload));
}
export async function submitInquiry(request, response) {
  if (!connected()) return send(response, 503, { error: 'Inquiry delivery is not available yet. Your message was not sent.' });
  if (!String(request.headers['content-type'] || '').startsWith('application/json')) return send(response, 415, { error: 'Expected JSON.' });
  const origin = request.headers.origin;
  const host = request.headers.host;
  if (!origin || !host || new URL(origin).host !== host || !['https:', 'http:'].includes(new URL(origin).protocol)) {
    return send(response, 403, { error: 'Origin not permitted.' });
  }
  const ip = request.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const attempts = (recent.get(ip) || []).filter(t => now - t < WINDOW_MS);
  if (attempts.length >= MAX_PER_WINDOW) return send(response, 429, { error: 'Too many inquiries. Please try again later.' });
  attempts.push(now);
  recent.set(ip, attempts);
  if (recent.size > 10000) for (const [key, value] of recent) if (value.every(t => now - t >= WINDOW_MS)) recent.delete(key);
  let raw = '';
  for await (const chunk of request) {
    raw += chunk.toString('utf8');
    if (raw.length > 12000) return send(response, 413, { error: 'Inquiry is too long.' });
  }
  let data;
  try { data = JSON.parse(raw); } catch { return send(response, 400, { error: 'Invalid submission.' }); }
  if (data.website) return send(response, 200, { received: true }); // honeypot
  const name = String(data.name || '').trim();
  const email = String(data.email || '').trim();
  const type = String(data.type || '');
  const message = String(data.message || '').trim();
  const projectId = data.project_id == null ? null : String(data.project_id).trim();
  if (name.length < 1 || name.length > 120 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !types.has(type) || message.length < 10 || message.length > 5000 ||
      (projectId && !/^[a-z0-9-]{1,80}$/.test(projectId))) {
    return send(response, 422, { error: 'Please check your name, email, inquiry type, and message (10–5000 characters).' });
  }
  try {
    await db('seasons_inquiries', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ contact_name: name, contact_email: email, inquiry_type: type, message, project_id: projectId || null })
    });
    return send(response, 201, { received: true });
  } catch {
    return send(response, 503, { error: 'Delivery could not be confirmed. Your inquiry was not confirmed as received.' });
  }
}
