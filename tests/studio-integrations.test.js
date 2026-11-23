import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { integrationInventory } from '../server/studio-integrations.js';

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
 assert.match(app,/renderIntegrations\(content,snapshot,integrationSnapshot\)/);
 assert.match(page,/Configured · not verified/);
});
