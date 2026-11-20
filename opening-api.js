import { createHash, timingSafeEqual } from 'node:crypto';
import { defaults, validateOpening } from './public/js/opening-settings.js';

const pages = new Map([
  ['fall','41e3bfec-cf32-813e-90b7-e78b5831fd5f'],
  ['winter','41e3bfec-cf32-8143-8fa0-d17ab7eaa03e'],
  ['spring','41e3bfec-cf32-811e-9bb5-c548808a7025'],
  ['summer','41e3bfec-cf32-816c-a44f-ed24b24bcfb3']
]);
const properties = {
  word:'Center Word', tileColor:'Tile Color', textColor:'Letter Color',
  tilt:'Tilt', zoomSeconds:'Zoom Seconds', fadeSeconds:'Fade Seconds',
  revealSeconds:'Reveal Seconds', spacing:'Tile Gap', photos:'Photos'
};
const savedOpenings = new Map();
const editing = new Set();
const digest = value => createHash('sha256').update(value).digest();

function send(response, status, body) {
  response.writeHead(status, {'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store'});
  response.end(JSON.stringify(body));
}

async function notion(pageId, patch) {
  const response = await fetch('https://api.notion.com/v1/pages/'+pageId,{
    method:patch ? 'PATCH' : 'GET',
    headers:{
      Authorization:'Bearer '+process.env.NOTION_TOKEN,
      'Notion-Version':'2025-09-03',
      'Content-Type':'application/json'
    },
    body:patch && JSON.stringify({properties:patch}),
    signal:AbortSignal.timeout(patch ? 8000 : 3500)
  });
  if (!response.ok) throw new Error('Notion returned '+response.status);
  return response.json();
}

function readPage(page) {
  if (page.archived || page.in_trash) throw new Error('Opening record is archived.');
  const fields = {};
  for (const [key,name] of Object.entries(properties)) {
    const property = page.properties[name];
    if (!property) throw new Error('Notion is missing the '+name+' property.');
    if (property.type === 'number') fields[key] = property.number ?? defaults[key];
    else {
      const text = property.rich_text.map(part=>part.plain_text).join('');
      fields[key] = key === 'photos' ? text.split(/\r?\n/).map(line=>line.trim()).filter(Boolean) : text || defaults[key];
    }
  }
  return {settings:validateOpening(fields), revision:page.last_edited_time};
}

function writeProperties(settings) {
  return Object.fromEntries(Object.entries(properties).map(([key,name])=>{
    const value = settings[key];
    if (typeof value === 'number') return [name,{number:value}];
    const text = Array.from(Array.isArray(value) ? value.join('\n') : value);
    const rich_text = [];
    while (text.length) rich_text.push({type:'text',text:{content:text.splice(0,900).join('')}});
    return [name,{rich_text}];
  }));
}

async function readBody(request) {
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 65536) break;
    chunks.push(chunk);
  }
  if (size > 65536) throw new Error('Settings exceed the size limit.');
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export async function openingApi(request, response, path) {
  const match = /^\/api\/(studio\/)?openings\/([a-z]+)$/.exec(path);
  if (!match || !pages.has(match[2])) return send(response,404,{error:'Opening chapter not found.'});
  const [,studio,chapter] = match;
  const password = process.env.SEASONS_STUDIO_PASSWORD;
  if (studio) {
    if (!password || !process.env.NOTION_TOKEN) return send(response,503,{error:'Studio credentials and Notion must be configured on the server.'});
    const supplied = request.headers.authorization ?? '';
    if (!timingSafeEqual(digest(supplied),digest('Bearer '+password))) return send(response,401,{error:'Enter the studio access key.'});
  }
  const pageId = pages.get(chapter);
  if (request.method === 'GET') {
    const cached = savedOpenings.get(chapter);
    if (!studio && cached && Date.now() < cached.expires) return send(response,200,{settings:cached.settings});
    if (process.env.NOTION_TOKEN) {
      try {
        const record = readPage(await notion(pageId));
        savedOpenings.set(chapter,{settings:record.settings,expires:Date.now()+30000});
        return send(response,200,studio ? record : {settings:record.settings});
      } catch (error) {
        if (studio) return send(response,502,{error:'Could not load the Notion record. Check its access and field values.'});
      }
    }
    return send(response,200,{settings:cached?.settings ?? defaults});
  }
  if (!studio || request.method !== 'PUT') return send(response,405,{error:'Method not allowed.'});
  if (request.headers['content-type'] !== 'application/json') return send(response,415,{error:'Expected JSON settings.'});
  let body, settings;
  try {
    body = await readBody(request);
    settings = validateOpening(body.settings);
  } catch (error) {
    return send(response,400,{error:'Invalid opening settings. Check the field values and photo URLs.'});
  }
  if (editing.has(chapter)) return send(response,409,{error:'Another save is in progress. Reload before trying again.'});
  editing.add(chapter);
  try {
    const current = await notion(pageId);
    if (current.last_edited_time !== body.revision) return send(response,409,{error:'This chapter changed in Notion. Reload it before saving.'});
    const saved = readPage(await notion(pageId,writeProperties(settings)));
    savedOpenings.set(chapter,{settings:saved.settings,expires:Date.now()+30000});
    return send(response,200,saved);
  } catch {
    return send(response,502,{error:'Notion did not confirm the save. Reload to check the current values.'});
  } finally {
    editing.delete(chapter);
  }
}
