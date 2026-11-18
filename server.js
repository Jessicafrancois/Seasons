import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';

const root = resolve(import.meta.dirname, 'public');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.png': 'image/png', '.jpeg': 'image/jpeg', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };

createServer(async (request, response) => {
  try {
    const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const page = path === '/' || /^\/projects\/[a-z0-9-]+\/?$/.test(path);
    const file = resolve(root, '.' + (page ? '/index.html' : path));
    if (!file.startsWith(root + sep)) {
      response.writeHead(404).end();
      return;
    }
    const content = await readFile(file);
    const headers = { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' };
    if (path === '/service-worker.js') headers['Cache-Control'] = 'no-cache';
    response.writeHead(200, headers).end(content);
  } catch {
    response.writeHead(404).end('Page unavailable');
  }
}).listen(Number(process.env.PORT || 3000), '0.0.0.0');
