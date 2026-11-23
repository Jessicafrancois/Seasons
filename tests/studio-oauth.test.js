import test from 'node:test';
import assert from 'node:assert/strict';
import {oauthAvailability,oauthStart,oauthConnections,oauthDisconnect} from '../server/studio-oauth.js';
import {readFile} from 'node:fs/promises';

const keys=['STUDIO_OAUTH_ENABLED','STUDIO_AUTH_MODE','STUDIO_OAUTH_ENCRYPTION_KEY','STUDIO_OAUTH_ORIGIN',
 'SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','NOTION_OAUTH_CLIENT_ID','NOTION_OAUTH_CLIENT_SECRET','NODE_ENV'];
const before=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
function restore(){for(const key of keys){if(before[key]===undefined)delete process.env[key];else process.env[key]=before[key]}}
function response(){
 return {status:0,headers:{},body:null,
 writeHead(status,headers={}){this.status=status;this.headers=headers;return this},
 end(body){this.body=body;return this}
 };
}
test('OAuth consent is disabled by default and without individual secure auth mode',()=>{
 try{
  for(const key of keys)delete process.env[key];
  assert.equal(oauthAvailability().notion.available,false);
  assert.deepEqual(Object.keys(oauthAvailability()).sort(),['notion','spotify']);
  process.env.STUDIO_OAUTH_ENABLED='true';
  process.env.NODE_ENV='production';
  process.env.STUDIO_AUTH_MODE='local-basic';
  process.env.STUDIO_OAUTH_ENCRYPTION_KEY='a'.repeat(64);
  process.env.STUDIO_OAUTH_ORIGIN='https://example.com';
  process.env.SUPABASE_URL='https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY='only-testing';
  process.env.NOTION_OAUTH_CLIENT_ID='test-id';
  process.env.NOTION_OAUTH_CLIENT_SECRET='test-secret';
  assert.equal(oauthAvailability().notion.available,false);
 }finally{restore()}
});
test('Notion grant opens provider permission screen with random state, not embedded client secrets',()=>{
 try{
  process.env.STUDIO_OAUTH_ENABLED='true';
  process.env.STUDIO_AUTH_MODE='secure';
  process.env.NODE_ENV='development';
  process.env.STUDIO_OAUTH_ENCRYPTION_KEY='a'.repeat(64);
  process.env.STUDIO_OAUTH_ORIGIN='https://studio.example.test';
  process.env.SUPABASE_URL='https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY='not-for-browser';
  process.env.NOTION_OAUTH_CLIENT_ID='notion-test-client';
  process.env.NOTION_OAUTH_CLIENT_SECRET='secret-never-share';
  assert.equal(oauthAvailability().notion.available,true);
  const res=response();
  oauthStart({headers:{host:'studio.example.test'}},res,'notion');
  assert.equal(res.status,200);
  const link=new URL(JSON.parse(res.body).authorizationUrl);
  assert.equal(link.host,'api.notion.com');
  assert.equal(link.searchParams.get('owner'),'user');
  assert.equal(link.searchParams.get('redirect_uri'),'https://studio.example.test/studio/oauth/callback');
  assert.ok(link.searchParams.get('state').length>20);
  assert.match(res.headers['Set-Cookie'],/HttpOnly; SameSite=Lax; Secure/);
  assert.equal(res.headers['Cache-Control'],'no-store');
  assert.doesNotMatch(JSON.stringify(res.headers),/secret-never-share|not-for-browser/);
 }finally{restore()}
});
test('connection metadata is empty until explicit authorization, with no network access when disabled',async()=>{
 try{
  delete process.env.STUDIO_OAUTH_ENABLED;
  assert.deepEqual(await oauthConnections(),{});
  assert.equal((await oauthDisconnect('other')).ok,false);
 }finally{restore()}
});
test('OAuth routes stay inside existing Studio authentication gate',async()=>{
 const server=await readFile(new URL('../server.js',import.meta.url),'utf8');
 const view=await readFile(new URL('../private/studio/pages/workspace.js',import.meta.url),'utf8');
 assert.match(server,/if\(!protect\(request,response\)\)return/);
 assert.match(server,/oauthStart\(request,response/);
 assert.match(server,/oauthCallback\(request,response/);
 assert.match(server,/sameOrigin\(request\)/);
 assert.match(view,/Continue to /);
 assert.match(view,/Disconnect from Studio/);
});
