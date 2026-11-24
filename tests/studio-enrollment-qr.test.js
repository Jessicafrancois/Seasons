import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {secureEnroll} from '../server/studio-secure-auth.js';

test('private enrollment screen offers QR and manual key without third-party QR requests',async()=>{
 const html=await readFile(new URL('../private/studio/login.html',import.meta.url),'utf8');
 const client=await readFile(new URL('../private/studio/login.js',import.meta.url),'utf8');
 const server=await readFile(new URL('../server.js',import.meta.url),'utf8');
 assert.match(html,/id="totp-qr"/);
 assert.match(html,/id="totp-secret"/);
 assert.match(client,/qrNode\.src=result\.qrCode/);
 assert.match(client,/clearEnrollmentImage\(\)/);
 assert.match(server,/img-src 'self' data:/);
 assert.doesNotMatch(client,/qrserver|quickchart|api\.qrserver|qrcode\.monkey/i);
});

test('verified Studio member receives an SVG QR image and manual TOTP key after password authentication',async()=>{
 const names=['STUDIO_AUTH_MODE','NODE_ENV','STUDIO_SESSION_CSRF_KEY','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_PUBLISHABLE_KEY'];
 const original=Object.fromEntries(names.map(k=>[k,process.env[k]]));
 const originalFetch=globalThis.fetch;
 const userId='123e4567-e89b-42d3-a456-426614174000',factorId='123e4567-e89b-42d3-a456-426614174111';
 const qrSvg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2"><rect width="2" height="2"/></svg>';
 const response=()=>({
  status:null,headers:{},payload:null,
  writeHead(status,headers){this.status=status;this.headers=headers;return this},
  end(payload){this.payload=JSON.parse(payload);return this}
 });
 const request={
  headers:{host:'localhost:3000',origin:'http://localhost:3000','content-type':'application/json'},
  socket:{remoteAddress:'203.0.113.41'},
  async *[Symbol.asyncIterator](){yield Buffer.from(JSON.stringify({email:'founder@example.test',password:'correct'}))}
 };
 try{
  Object.assign(process.env,{
   STUDIO_AUTH_MODE:'secure',NODE_ENV:'test',
   STUDIO_SESSION_CSRF_KEY:'a'.repeat(64),SUPABASE_URL:'https://example.supabase.co',
   SUPABASE_SERVICE_ROLE_KEY:'service-test',SUPABASE_PUBLISHABLE_KEY:'public-test'
  });
  const ok=data=>({ok:true,status:200,json:async()=>data});
  globalThis.fetch=async(url)=>{
   if(url.includes('seasons_studio_auth_limit_check'))return ok(true);
   if(url.includes('/auth/v1/token?'))return ok({access_token:'test-password-session'});
   if(url.includes('/auth/v1/user'))return ok({id:userId,email_confirmed_at:'2026-11-24T00:00:00Z',factors:[]});
   if(url.includes('seasons_studio_members'))return ok([{user_id:userId,role:'Founder',confidentiality_clearance:'Founder Private',is_active:true}]);
   if(url.endsWith('/auth/v1/factors'))return ok({id:factorId,totp:{secret:'TESTMANUALKEY',qr_code:qrSvg}});
   throw Error('Unexpected URL: '+url);
  };
  const res=response();
  await secureEnroll(request,res);
  assert.equal(res.status,200);
  assert.equal(res.payload.secret,'TESTMANUALKEY');
  assert.equal(res.payload.factorId,factorId);
  assert.match(res.payload.qrCode,/^data:image\/svg\+xml;base64,/);
  const bytes=res.payload.qrCode.split(',')[1];
  assert.equal(Buffer.from(bytes,'base64').toString('utf8'),qrSvg);
 }finally{
  globalThis.fetch=originalFetch;
  for(const k of names){
   if(original[k]===undefined)delete process.env[k];else process.env[k]=original[k];
  }
 }
});
