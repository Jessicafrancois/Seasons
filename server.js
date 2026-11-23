import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { timingSafeEqual } from 'node:crypto';
import { overview } from './server/studio-data.js';
import { publicDocument } from './server/public-document.js';
import { operationalData, submitInquiry } from './server/studio-operations.js';

const root = resolve(import.meta.dirname, 'public');
const studioDocument = resolve(import.meta.dirname, 'private/studio/index.html');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.png': 'image/png', '.jpeg': 'image/jpeg', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };

function equalSecret(actual, expected) {
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
function studioAuthorized(request) {
  const authorization = request.headers.authorization || '';
  if (!authorization.startsWith('Basic ')) return false;
  try {
    const decoded = Buffer.from(authorization.slice(6), 'base64').toString('utf8');
    const colon = decoded.indexOf(':');
    if (colon < 0) return false;
    return equalSecret(decoded.slice(0, colon), process.env.STUDIO_USERNAME) &&
      equalSecret(decoded.slice(colon + 1), process.env.STUDIO_PASSWORD);
  } catch { return false; }
}
function json(response, status, data) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  response.end(JSON.stringify(data));
}
function protectStudio(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'no-referrer');
  if (!process.env.STUDIO_USERNAME || !process.env.STUDIO_PASSWORD) {
    json(response, 503, { error: 'Seasons Studio is not configured.' });
    return false;
  }
  if (!studioAuthorized(request)) {
    response.setHeader('WWW-Authenticate', 'Basic realm="Seasons Studio"');
    json(response, 401, { error: 'Studio authentication required.' });
    return false;
  }
  return true;
}
createServer(async (request, response) => {
  try {
    const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (path === '/api/inquiries' && request.method === 'POST') return await submitInquiry(request, response);
    if (path === '/studio' || path === '/studio/' || path.startsWith('/studio/api/')) {
      if (!protectStudio(request, response)) return;
      if (path === '/studio/api/overview') {
        if (request.method !== 'GET') return json(response, 405, { error: 'Method not allowed' });
        try {
          const core = overview();
          const ops = await operationalData();
          return json(response, 200, { ...core, operations: ops });
        } catch {
          return json(response, 503, { error: 'Operations data is temporarily unavailable.' });
        }
      }
      if (path !== '/studio' && path !== '/studio/') return json(response, 404, { error: 'Not found' });
      if (request.method !== 'GET') return json(response, 405, { error: 'Method not allowed' });
      response.setHeader('Content-Security-Policy', "default-src 'none'; connect-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
      const html = await readFile(studioDocument);
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(html);
      return;
    }
    if (path.startsWith('/api/') || request.method !== 'GET') return response.writeHead(404).end('Page unavailable');
    const page = path === '/' || /^\/projects\/[a-z0-9-]+\/?$/.test(path);
    if (page) {
      response.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff'
      }).end(publicDocument());
      return;
    }
    const file = resolve(root, '.' + path);
    if (!file.startsWith(root + sep)) return response.writeHead(404).end();
    const body = await readFile(file);
    const headers = { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' };
    if (path === '/service-worker.js') headers['Cache-Control'] = 'no-cache';
    response.writeHead(200, headers).end(body);
  } catch {
    response.writeHead(404).end('Page unavailable');
  }
}).listen(Number(process.env.PORT || 3000), '0.0.0.0');
