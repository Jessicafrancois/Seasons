import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { centerLists, inquiryDetails, opportunityDetails } from '../server/studio-centers.js';

test('disconnected centers are explicitly empty rather than claiming stored records', async () => {
 const prevUrl = process.env.SUPABASE_URL, prevKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
 try {
  delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert.deepEqual(await centerLists(), { connected:false, inquiries:[], opportunities:[], counts:null });
 } finally {
  if (prevUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = prevUrl;
  if (prevKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = prevKey;
 }
});

test('center list queries stay on the trusted server and use only the two intended tables', async () => {
 const oldFetch = globalThis.fetch, oldUrl = process.env.SUPABASE_URL, oldKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
 const requested = [];
 try {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only-key';
  globalThis.fetch = async (url,options) => {
   requested.push({ url,options });
   return { ok:true, text: async()=> '[]' };
  };
  const data = await centerLists();
  assert.equal(data.connected,true);
  assert.deepEqual(data.inquiries,[]);
  assert.deepEqual(data.opportunities,[]);
  assert.equal(requested.length,2);
  assert.match(requested[0].url,/\/rest\/v1\/seasons_inquiries\?/);
  assert.match(requested[1].url,/\/rest\/v1\/seasons_opportunities\?/);
  assert.equal(requested[0].options.headers.Authorization,'Bearer test-only-key');
  assert.ok(requested.every(x=>x.options.method === undefined));
 } finally {
  globalThis.fetch = oldFetch;
  if (oldUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = oldUrl;
  if (oldKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = oldKey;
 }
});

test('detail readers reject malformed identifiers without querying a database', async () => {
 assert.equal(await inquiryDetails('../etc/passwd'),null);
 assert.equal(await opportunityDetails('not-a-uuid'),null);
});

test('Studio center APIs remain authenticated, read-only, and exposed through allowlisted routes', async () => {
 const server = await readFile(new URL('../server.js', import.meta.url),'utf8');
 const studio = await readFile(new URL('../private/studio/index.html', import.meta.url),'utf8');
 const app = await readFile(new URL('../private/studio/app.js', import.meta.url),'utf8');
 const nav = await readFile(new URL('../private/studio/components/ui.js', import.meta.url),'utf8');
 assert.match(server,/if\(!protect\(request,response\)\)return/);
 assert.match(server,/path==='\/studio\/api\/centers'/);
 assert.match(server,/await centerLists\(\)/);
 assert.match(server,/await inquiryDetails\(match\[2\]\)/);
 assert.match(server,/await opportunityDetails\(match\[2\]\)/);
 assert.match(server,/if\(request.method!=='GET'\)return json\(response,405/);
 assert.match(studio,/\/studio\/assets\/app\.js/);
 assert.match(nav,/\['Opportunities','opportunities'\]/);
 assert.match(app,/renderInquiryCenter\(content,snapshot,navigate\)/);
 assert.match(app,/renderOpportunities\(content\)/);
});
