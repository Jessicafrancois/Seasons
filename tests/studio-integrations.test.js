import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { integrationInventory, integrationSetup, testIntegration } from '../server/studio-integrations.js';

test('integration register separates planned, configured and unverified services',()=>{
 const keys=['NOTION_TOKEN','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','SEASONS_EMAIL_PROVIDER','SEASONS_EMAIL_API_KEY'];
 const old=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
 try{
  keys.forEach(key=>delete process.env[key]);
  const empty=integrationInventory();
  assert.equal(empty.connections.length,7);
  assert.equal(empty.connections.find(x=>x.id==='notion').state,'not_configured');
  assert.equal(empty.connections.find(x=>x.id==='storage').state,'not_configured');
  process.env.NOTION_TOKEN='never-print-secret-notion';
  process.env.SUPABASE_URL='https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY='never-print-secret-supabase';
  const configured=integrationInventory();
  assert.equal(configured.connections.find(x=>x.id==='notion').state,'configured');
  assert.equal(configured.connections.find(x=>x.id==='supabase').state,'configured');
  assert.equal(configured.connections.find(x=>x.id==='storage').state,'pending_verification');
  assert.equal(configured.connections.find(x=>x.id==='spotify').state,'planned');
  assert.equal(configured.credentialValuesExposed,false);
  const json=JSON.stringify(configured);
  assert.doesNotMatch(json,/never-print-secret/);
  assert.doesNotMatch(json,/https:\/\/example\.supabase\.co/);
 }finally{for(const key of keys){if(old[key]===undefined)delete process.env[key];else process.env[key]=old[key]}}
});
test('private Studio integrations endpoint and screen stay behind Studio auth',async()=>{
 const server=await readFile(new URL('../server.js',import.meta.url),'utf8');
 const app=await readFile(new URL('../private/studio/app.js',import.meta.url),'utf8');
 const page=await readFile(new URL('../private/studio/pages/workspace.js',import.meta.url),'utf8');
 assert.match(server,/if\(!protect\(request,response\)\)return/);
 assert.match(server,/path==='\/studio\/api\/integrations'/);
 assert.match(server,/integrationInventory\(\)/);
 assert.match(app,/fetch\('\/studio\/api\/integrations'/);
 assert.match(app,/renderIntegrations\(content,snapshot,integrationSnapshot,studioSession,vaultSnapshot,refresh\)/);
 assert.match(page,/integration-tile/);
 assert.match(page,/integration-modal/);
 assert.match(page,/Continue to /);
});

test('provider setup exposes secret names, not values',()=>{
 const setup=integrationSetup();
 for(const id of ['notion','supabase','storage','email','spotify','apple-music','analytics']){
  assert.ok(setup[id].required.length>0);
  assert.match(setup[id].portal,/^https:\/\//);
  assert.equal(typeof setup[id].help,'string');
 }
 assert.equal(setup.email.required.includes('SEASONS_EMAIL_API_KEY'),true);
});
test('credential test is read-only, reports successful Notion authentication without token disclosure',async()=>{
 const fetchBefore=globalThis.fetch,oldToken=process.env.NOTION_TOKEN;
 try{
  process.env.NOTION_TOKEN='secret-never-return-this';
  const calls=[];
  globalThis.fetch=async(url,options)=>{
   calls.push({url,options});
   return {status:200};
  };
  const result=await testIntegration('notion');
  assert.equal(result.status,'verified');
  assert.equal(calls.length,1);
  assert.equal(calls[0].options.method,'GET');
  assert.ok(calls[0].url.includes('/users/me'));
  assert.doesNotMatch(JSON.stringify(result),/secret-never-return-this/);
 }finally{
  globalThis.fetch=fetchBefore;
  if(oldToken===undefined)delete process.env.NOTION_TOKEN;else process.env.NOTION_TOKEN=oldToken;
 }
});
test('unknown integrations and missing credentials do not trigger network calls',async()=>{
 const original=globalThis.fetch,old=process.env.NOTION_TOKEN;
 try{
  delete process.env.NOTION_TOKEN;
  globalThis.fetch=()=>{throw Error('must not make network call')};
  assert.equal((await testIntegration('notion')).status,'not_configured');
  assert.equal((await testIntegration('some-provider')).status,'unsupported');
 }finally{
  globalThis.fetch=original;
  if(old===undefined)delete process.env.NOTION_TOKEN;else process.env.NOTION_TOKEN=old;
 }
});
test('connection tests require same-origin guard and are not made available on public routes',async()=>{
 const server=await readFile(new URL('../server.js',import.meta.url),'utf8');
 const screen=await readFile(new URL('../private/studio/pages/workspace.js',import.meta.url),'utf8');
 assert.match(server,/integrationTest=path\.match/);
 assert.match(server,/!sameOrigin\(request\)/);
 assert.match(server,/x-seasons-studio/);
 assert.match(screen,/Test connection/);
 assert.match(screen,/Open provider setup/);
});
