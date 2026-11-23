import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {secureModeConfigured,studioAuthMode,trustedOrigin,csrfValid,requireManage,secureIdentity,secureLogin,secureLogout} from '../server/studio-secure-auth.js';
const keys=['STUDIO_AUTH_MODE','STUDIO_SESSION_CSRF_KEY','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_PUBLISHABLE_KEY','STUDIO_PUBLIC_ORIGIN','NODE_ENV'];
function withSettings(task){const prior=Object.fromEntries(keys.map(k=>[k,process.env[k]]));try{return task()}finally{for(const key of keys){if(prior[key]===undefined)delete process.env[key];else process.env[key]=prior[key]}}}
test('production Studio defaults disabled and requires Supabase plus cryptographic CSRF key',()=>{
 withSettings(()=>{
  process.env.NODE_ENV='production';delete process.env.STUDIO_AUTH_MODE;
  assert.equal(studioAuthMode(),'disabled');
  process.env.STUDIO_AUTH_MODE='secure';
  assert.equal(secureModeConfigured(),false);
  process.env.STUDIO_SESSION_CSRF_KEY='f'.repeat(64);
  process.env.SUPABASE_URL='https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY='test-server-only';
  process.env.SUPABASE_PUBLISHABLE_KEY='test-public';
  assert.equal(secureModeConfigured(),true);
 });
});
test('CSRF protection rejects missing token and mismatched origin',()=>{
 withSettings(()=>{
  process.env.NODE_ENV='production';
  process.env.STUDIO_PUBLIC_ORIGIN='https://studio.example.test';
  const request={headers:{origin:'https://studio.example.test',host:'studio.example.test','x-studio-csrf':'abcd'}};
  assert.equal(trustedOrigin(request),true);
  assert.equal(csrfValid(request,{csrf:'abcd'}),true);
  assert.equal(csrfValid({...request,headers:{...request.headers,'x-studio-csrf':'invalid'}},{csrf:'abcd'}),false);
  assert.equal(trustedOrigin({...request,headers:{...request.headers,origin:'https://evil.example'}}),false);
  assert.equal(csrfValid({headers:{host:'studio.example.test','x-studio-csrf':'abcd'}},{csrf:'abcd'}),false);
 });
});
test('credential management is founder only',()=>{
 assert.equal(requireManage({user_id:'123e4567-e89b-42d3-a456-426614174000',role:'Founder',confidentiality_clearance:'Founder Private',is_active:true}),true);
 assert.equal(requireManage({user_id:'123e4567-e89b-42d3-a456-426614174000',role:'Studio Manager',confidentiality_clearance:'Restricted',is_active:true}),false);
 assert.equal(requireManage(null),false);
});
test('secure Studio does not accept Basic credentials or expose confidential APIs without setup',async()=>{
 const port=String(47000+Math.floor(Math.random()*5000));
 const server=spawn(process.execPath,['server.js'],{cwd:process.cwd(),
  env:{...process.env,NODE_ENV:'production',STUDIO_AUTH_MODE:'secure',STUDIO_SESSION_CSRF_KEY:'',
   SUPABASE_URL:'',SUPABASE_SERVICE_ROLE_KEY:'',SUPABASE_PUBLISHABLE_KEY:'',
   STUDIO_USERNAME:'legacy',STUDIO_PASSWORD:'legacy',PORT:port},stdio:'pipe'});
 const base='http://127.0.0.1:'+port;
 try{
  let ready=false;
  for(let i=0;i<60;i++){
   if(server.exitCode!==null)break;
   try{const check=await fetch(base+'/');if(check.ok){ready=true;break}}catch{}
   await delay(80);
  }
  assert.equal(ready,true,'Server must boot in safe disabled mode');
  const login=await fetch(base+'/studio/login');
  assert.equal(login.status,200);
  assert.match(await login.text(),/Authenticator code/);
  const auth='Basic '+Buffer.from('legacy:legacy').toString('base64');
  const denied=await fetch(base+'/studio/api/credentials',{headers:{Authorization:auth}});
  assert.equal(denied.status,503);
  const admin=await fetch(base+'/studio/',{headers:{Authorization:auth}});
  assert.equal(admin.status,503);
 }finally{
  server.kill('SIGTERM');
  if(server.exitCode===null)await Promise.race([new Promise(resolve=>server.once('exit',resolve)),delay(1000)]);
 }
});

test('verified invited founder receives opaque revocable session only after Supabase TOTP MFA',async()=>{
 const originalFetch=globalThis.fetch;
 const prior=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
 const userId='123e4567-e89b-42d3-a456-426614174000';
 const factorId='123e4567-e89b-42d3-a456-426614174111';
 const jwt=['e30',Buffer.from(JSON.stringify({aal:'aal2',sub:userId})).toString('base64url'),'signed'].join('.');
 const member={user_id:userId,role:'Founder',confidentiality_clearance:'Founder Private',is_active:true};
 let saved=null;
 const reply=value=>({ok:true,status:200,json:async()=>value});
 const request=body=>({
  headers:{host:'localhost:3000',origin:'http://localhost:3000','content-type':'application/json'},
  socket:{remoteAddress:'203.0.113.142'},
  async *[Symbol.asyncIterator](){yield Buffer.from(JSON.stringify(body))}
 });
 const response=()=>({
  headers:{},status:0,data:null,
  writeHead(code,headers){this.status=code;Object.assign(this.headers,headers);return this},
  end(text){this.data=JSON.parse(text);return this}
 });
 try{
  process.env.STUDIO_AUTH_MODE='secure';
  process.env.NODE_ENV='development';
  process.env.STUDIO_SESSION_CSRF_KEY='a'.repeat(64);
  process.env.SUPABASE_URL='https://studio-test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY='test-server-key';
  process.env.SUPABASE_PUBLISHABLE_KEY='test-public-key';
  globalThis.fetch=async(url,init)=>{
   if(url.includes('/auth/v1/token?'))return reply({access_token:'first-factor-token'});
   if(url.includes('/auth/v1/user'))return reply({id:userId,email_confirmed_at:'2026-11-23T00:00:00Z',factors:[{id:factorId,factor_type:'totp',status:'verified'}]});
   if(url.endsWith('/challenge'))return reply({id:'challenge-id'});
   if(url.endsWith('/verify'))return reply({access_token:jwt});
   if(url.includes('seasons_studio_members'))return reply([member]);
   if(url.includes('seasons_studio_sessions')&&init.method==='POST'){saved=JSON.parse(init.body);return reply(null)}
   if(url.includes('seasons_studio_sessions')&&init.method==='PATCH')return reply(null);
   if(url.includes('seasons_studio_sessions')&&init.method==='GET')return reply([{
    session_hash:saved.session_hash,user_id:userId,csrf_hash:saved.csrf_hash,
    mfa_verified_at:saved.mfa_verified_at,idle_expires_at:saved.idle_expires_at,
    absolute_expires_at:saved.absolute_expires_at,revoked_at:null
   }]);
   throw Error('Unexpected request '+url);
  };
  const res=response();
  await secureLogin(request({email:'founder@example.test',password:'correct',code:'123456'}),res);
  assert.equal(res.status,200);
  assert.equal(res.data.role,'Founder');
  assert.match(res.headers['Set-Cookie'],/HttpOnly; SameSite=Lax/);
  assert.doesNotMatch(res.headers['Set-Cookie'],/first-factor-token|signed/);
  assert.match(saved.session_hash,/^[a-f0-9]{64}$/);
  assert.match(saved.csrf_hash,/^[a-f0-9]{64}$/);
  const sid=res.headers['Set-Cookie'].match(/seasons_studio_sid=([a-f0-9]{64})/)[1];
  const authorized=await secureIdentity({headers:{cookie:'seasons_studio_sid='+sid}});
  assert.equal(authorized.member.role,'Founder');
  const csrfRequest={...request({}),headers:{host:'localhost:3000',origin:'http://localhost:3000',
   'x-studio-csrf':authorized.csrf,cookie:'seasons_studio_sid='+sid}};
  assert.equal(csrfValid(csrfRequest,authorized),true);
  const exit=response();
  await secureLogout(csrfRequest,exit,authorized);
  assert.equal(exit.status,200);
  assert.match(exit.headers['Set-Cookie'],/Max-Age=0/);
 }finally{
  globalThis.fetch=originalFetch;
  for(const key of keys){if(prior[key]===undefined)delete process.env[key];else process.env[key]=prior[key]}
 }
});
