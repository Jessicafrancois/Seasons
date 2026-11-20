import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { timingSafeEqual } from 'node:crypto';

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
  } catch {
    return false;
  }
}

createServer(async (request, response) => {
  try {
    const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (path === '/studio' || path === '/studio/') {
      response.setHeader('Cache-Control', 'no-store');
      response.setHeader('X-Content-Type-Options', 'nosniff');
      response.setHeader('X-Frame-Options', 'DENY');
      response.setHeader('Referrer-Policy', 'no-referrer');
      response.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
      if (!process.env.STUDIO_USERNAME || !process.env.STUDIO_PASSWORD) {
        response.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Seasons Studio is not configured.');
        return;
      }
      if (!studioAuthorized(request)) {
        response.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Seasons Studio"', 'Content-Type': 'text/plain; charset=utf-8' }).end('Studio authentication required.');
        return;
      }
      const html = await readFile(studioDocument);
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(html);
      return;
    }
    const page = path === '/' || /^\/projects\/[a-z0-9-]+\/?$/.test(path);
    const file = resolve(root, '.' + (page ? '/index.html' : path));
    if (!file.startsWith(root + sep)) {
      response.writeHead(404).end();
      return;
    }
    const body = await readFile(file);
    const headers = { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' };
    if (path === '/service-worker.js') headers['Cache-Control'] = 'no-cache';
    response.writeHead(200, headers).end(body);
  } catch {
    response.writeHead(404).end('Page unavailable');
  }
}).listen(Number(process.env.PORT || 3000), '0.0.0.0');
