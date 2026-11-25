import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {createNode} from '../../private/studio/atelier/model.js';
import {defaultMotion} from '../../private/studio/atelier/motion.js';

const {chromium} = await import(process.env.ATELIER_PLAYWRIGHT || 'playwright-core');
const userId = '123e4567-e89b-42d3-a456-426614174000';
const documentId = '123e4567-e89b-42d3-a456-426614174001';
const fixtureOrigin = 'https://atelier-browser.supabase.co';
Object.assign(process.env, {
 VERCEL: '1', NODE_ENV: 'development', STUDIO_AUTH_MODE: 'secure',
 STUDIO_SESSION_CSRF_KEY: 'a'.repeat(64), SUPABASE_URL: fixtureOrigin,
 SUPABASE_SERVICE_ROLE_KEY: 'fixture-server-key', SUPABASE_PUBLISHABLE_KEY: 'fixture-public-key'
});
const jwt = 'e30.' + Buffer.from(JSON.stringify({aal:'aal2',sub:userId})).toString('base64url') + '.fixture';
const legacy = {schemaVersion:1,nodes:[{...createNode('heading','title'),motion:defaultMotion('rise')}]};
let document = {id:documentId,owner_id:userId,name:'Browser test',kind:'page',revision:1,document:legacy,updated_at:new Date().toISOString()};
const revisions = [structuredClone(document)];
let session;
const settings = new Map();
const originalFetch = globalThis.fetch;
const reply = value => Response.json(value);
globalThis.fetch = async (input, options={}) => {
 const url = new URL(input);
 if(url.origin!==fixtureOrigin) throw Error('Unexpected external request');
 const {pathname:path,searchParams:query} = url;
 const method = options.method || 'GET';
 const body = options.body ? JSON.parse(options.body) : null;
 if(path.endsWith('seasons_studio_auth_limit_check'))return reply(true);
 if(path==='/auth/v1/token')return reply({access_token:'fixture'});
 if(path==='/auth/v1/user')return reply({id:userId,email_confirmed_at:new Date().toISOString(),factors:[{id:'factor',factor_type:'totp',status:'verified'}]});
 if(path.endsWith('/challenge'))return reply({id:'challenge'});
 if(path.endsWith('/verify'))return reply({access_token:jwt});
 if(path.endsWith('seasons_studio_members'))return reply([{user_id:userId,role:'Founder',confidentiality_clearance:'Founder Private',is_active:true}]);
 if(path.endsWith('seasons_studio_sessions')){
  if(method==='POST'){session=body;return reply(null)}
  if(query.get('session_hash')!=='eq.'+session?.session_hash)return reply([]);
  if(method==='PATCH'){Object.assign(session,body);return reply(null)}
  return reply([session]);
 }
 if(path.endsWith('seasons_atelier_plugin_settings')){
  if(method==='POST'){
   assert.equal(body.owner_id,userId);
   settings.set(body.plugin_id,body);
   return reply([body]);
  }
  assert.equal(query.get('owner_id'),'eq.'+userId);
  return reply([...settings.values()]);
 }
 if(path.endsWith('seasons_atelier_documents')){
  assert.equal(query.get('owner_id'),'eq.'+userId);
  if(method==='PATCH'){
   if(query.get('revision')!=='eq.'+document.revision)return reply([]);
   document={...document,...body};
   revisions.push(structuredClone(document));
  }
  return reply([document]);
 }
 if(path.endsWith('seasons_atelier_revisions')){
  assert.equal(query.get('document_id'),'eq.'+documentId);
  return reply(revisions.filter(row=>!query.has('revision')||query.get('revision')==='eq.'+row.revision)
   .map(row=>({...row,created_at:row.updated_at})));
 }
 return reply([]);
};
const {handleRequest}=await import('../../server.js');
const server=createServer(handleRequest);
server.listen(0,'127.0.0.1');
await once(server,'listening');
const origin='http://127.0.0.1:'+server.address().port;
let browser;
try{
 browser=await chromium.launch({executablePath:process.env.ATELIER_CHROMIUM || '/usr/bin/chromium',args:['--no-sandbox']});
 const page=await browser.newPage({reducedMotion:'no-preference'});
 page.setDefaultTimeout(8000);
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 assert.equal((await page.request.get(origin+'/studio/api/atelier/plugins')).status(),401);
 await page.goto(origin+'/studio/login');
 await page.locator('#sign-in [name=email]').fill('founder@example.test');
 await page.locator('#sign-in [name=password]').fill('fixture-password');
 await page.locator('#sign-in [name=code]').fill('123456');
 await page.getByRole('button',{name:'Enter Studio'}).click();
 await page.waitForURL('**/studio/**');
 assert.equal((await page.request.get(origin+'/studio/api/atelier/plugins')).status(),200);
 await page.goto(origin+'/studio/#plugins');
 const plugin=page.locator('[data-plugin=motion-effects]');
 await plugin.locator('summary').click();
 await plugin.getByLabel('Default duration (ms)').fill('1250');
 await plugin.getByRole('button',{name:'Save settings'}).click();
 await page.getByText('Motion Effects settings saved.').waitFor();
 await page.reload();
 await plugin.locator('summary').click();
 assert.equal(await plugin.getByLabel('Default duration (ms)').inputValue(),'1250');

 await page.goto(origin+'/studio/#editor/'+documentId);
 await page.locator('.atelier-node[data-node=title]').click();
 await page.getByRole('navigation',{name:'Editor tools'}).getByRole('button',{name:'Plugins'}).click();
 await page.locator('.atelier-motion-preset').filter({hasText:'Fade in'}).getByRole('button',{name:'Apply'}).click();
 await page.getByRole('button',{name:'Save draft'}).click();
 await page.getByText(/Saved revision 2/).waitFor();
 assert.equal(document.document.schemaVersion,2);
 assert.equal(document.document.nodes[0].motion.duration,1250);
 assert.deepEqual(revisions[0].document,legacy);
 await page.locator('.atelier-top-actions').getByRole('button',{name:'Motion',exact:true}).click();
 await page.getByRole('button',{name:'Play entrance sequence'}).click();
 await page.waitForFunction(()=>Number(window.document.querySelector('.atelier-motion-timeline input').value)>0);
 await page.getByRole('button',{name:'Stop',exact:true}).click();
 assert.equal(await page.getByLabel('Scrub (ms)').inputValue(),'0');

 await page.goto(origin+'/studio/#plugins');
 await plugin.locator('summary').click();
 await plugin.getByLabel('Enabled').uncheck();
 await plugin.getByRole('button',{name:'Save settings'}).click();
 await plugin.getByText(/Disabled · v/).waitFor();
 const results=await page.evaluate(async ({id,doc})=>{
  const path='/studio/api/atelier/'+id;
  const session=await fetch('/studio/api/session').then(response=>response.json());
  const put=(body,csrf=true)=>fetch(path,{method:'PUT',headers:{'Content-Type':'application/json',
    ...(csrf?{'X-Studio-CSRF':session.csrf}:{})},body:JSON.stringify(body)}).then(response=>response.status);
  const invalid=structuredClone(doc);
  invalid.nodes[0].motion.pluginId='cinematic-transitions';
  const edited=structuredClone(doc);
  edited.nodes[0].motion.duration++;
  return [
   await put({revision:2,name:'Browser test',document:edited},false),
   await put({revision:2,name:'Browser test',document:invalid}),
   await put({revision:2,name:'Browser test',document:edited}),
   await put({revision:1,name:'Browser test',document:doc}),
   await put({revision:2,name:'Renamed test',document:doc})
  ];
 },{id:documentId,doc:document.document});
 assert.deepEqual(results,[403,422,422,409,200]);
 await page.goto(origin+'/studio/#editor/'+documentId);
 await page.locator('.atelier-node[data-node=title]').click();
 await page.locator('.atelier-inspector-tabs').getByRole('button',{name:'Motion'}).click();
 await page.getByText('This effect is preserved.',{exact:false}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Preview selected'}).isDisabled(),true);
 await page.getByRole('button',{name:'History',exact:true}).click();
 page.once('dialog',dialog=>dialog.accept());
 await page.locator('.atelier-history .row').filter({hasText:'v1 ·'}).getByRole('button',{name:'Restore as draft'}).click();
 await page.getByRole('button',{name:'Save draft'}).click();
 await page.getByText(/Saved revision 4/).waitFor();
 assert.equal(document.document.nodes[0].motion.preset,'rise');
 assert.deepEqual(revisions[0].document,legacy);
 assert.deepEqual(errors,[]);
 console.log('Authenticated Chromium flow passed with a fixture Supabase backend.');
}finally{
 await browser?.close();
 server.close();
 globalThis.fetch=originalFetch;
}
