import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {secureModeConfigured,studioAuthMode,trustedOrigin,csrfValid,requireManage,secureIdentity} from '../server/studio-secure-auth.js';
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
