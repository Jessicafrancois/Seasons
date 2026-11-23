import test from 'node:test';
import assert from 'node:assert/strict';
import { studioAuthMode, studioIdentity, studioLogin, studioLogout } from '../server/studio-auth.js';

const previous={};
for(const key of ['STUDIO_AUTH_MODE','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_PUBLISHABLE_KEY','NODE_ENV'])previous[key]=process.env[key];
const user_id='123e4567-e89b-42d3-a456-426614174000';
const token='x'.repeat(150);
function configuration(){
 process.env.STUDIO_AUTH_MODE='supabase';
 process.env.SUPABASE_URL='https://studio-test.supabase.co';
 process.env.SUPABASE_SERVICE_ROLE_KEY='test-role-key';
 process.env.SUPABASE_PUBLISHABLE_KEY='test-public-key';
 delete process.env.NODE_ENV;
}
function request(email='founder@example.test'){
 const raw=JSON.stringify({email,password:'example-password'});
 return {
  headers:{origin:'http://localhost:3000',host:'localhost:3000','content-type':'application/json'},
  socket:{remoteAddress:'203.0.113.100'},
  async *[Symbol.asyncIterator](){yield Buffer.from(raw)}
 };
}
function response(){
 return { headers:{},status:null,body:null,
  setHeader(key,value){this.headers[key]=value},
  writeHead(status,headers){this.status=status;Object.assign(this.headers,headers)},
  end(body){this.body=JSON.parse(body)}
 };
}
function restore(){
 for(const key of Object.keys(previous)){
  if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];
 }
}
test('individual Auth mode is opt-in; production refuses password fallback',()=>{
 try{
  process.env.NODE_ENV='production';delete process.env.STUDIO_AUTH_MODE;
  assert.equal(studioAuthMode(),'disabled');
  process.env.STUDIO_AUTH_MODE='supabase';
  assert.equal(studioAuthMode(),'supabase');
  process.env.NODE_ENV='test';delete process.env.STUDIO_AUTH_MODE;
  assert.equal(studioAuthMode(),'local-basic');
 }finally{restore()}
});
test('unverified or unregistered users never receive a Studio cookie',async()=>{
 const original=globalThis.fetch;
 try{
  configuration();
  globalThis.fetch=async(url)=>{
   if(url.includes('/token?'))return {ok:true,status:200,json:async()=>({access_token:token,expires_in:900})};
   if(url.includes('/auth/v1/user'))return {ok:true,status:200,json:async()=>({id:user_id,email:'founder@example.test',email_confirmed_at:'2026-11-23T00:00:00Z'})};
   return {ok:true,status:200,json:async()=>([])};
  };
  const res=response();
  await studioLogin(request(),res);
  assert.equal(res.status,401);
  assert.equal(res.headers['Set-Cookie'],undefined);
 }finally{globalThis.fetch=original;restore()}
});
test('enrolled active founder obtains HttpOnly cookie with server-verified membership',async()=>{
 const original=globalThis.fetch,seen=[];
 try{
  configuration();
  globalThis.fetch=async(url,options)=>{
   seen.push({url,options});
   if(url.includes('/token?'))return {ok:true,status:200,json:async()=>({access_token:token,expires_in:900})};
   if(url.includes('/auth/v1/user'))return {ok:true,status:200,json:async()=>({id:user_id,email:'founder@example.test',email_confirmed_at:'2026-11-23T00:00:00Z'})};
   return {ok:true,status:200,json:async()=>([{user_id,role:'Founder',confidentiality_clearance:'Founder Private',is_active:true}])};
  };
  const res=response();
  await studioLogin(request(),res);
  assert.equal(res.status,200);
  assert.equal(res.body.role,'Founder');
  assert.match(res.headers['Set-Cookie'],/HttpOnly; SameSite=Strict/);
  assert.match(res.headers['Set-Cookie'],/Max-Age=900/);
  assert.equal(seen.filter(x=>x.url.includes('/auth/v1/user')).length,1);
  assert.equal(seen.filter(x=>x.url.includes('seasons_studio_members')).length,1);
  const member=await studioIdentity({headers:{cookie:'seasons_studio_session='+token}});
  assert.equal(member.member.role,'Founder');
 }finally{globalThis.fetch=original;restore()}
});
test('sign-out clears the browser cookie and invalid origins are rejected',async()=>{
 try{
  configuration();
  const res=response();
  await studioLogout(request(),res);
  assert.equal(res.status,200);
  assert.match(res.headers['Set-Cookie'],/Max-Age=0/);
  const invalid=request();
  invalid.headers.origin='https://another-site.example';
  const denied=response();
  await studioLogout(invalid,denied);
  assert.equal(denied.status,403);
 }finally{restore()}
});
test('new Studio auth endpoints remain server protected by member lookup',async()=>{
 const {readFile}=await import('node:fs/promises');
 const server=await readFile(new URL('../server.js',import.meta.url),'utf8');
 assert.match(server,/studioIdentity\(request\)/);
 assert.match(server,/studioCanSeeRecord\(identity.member/);
 assert.match(server,/path==='\/studio\/auth\/login'/);
 assert.match(server,/path==='\/studio\/auth\/logout'/);
 assert.match(server,/path==='\/studio\/api\/session'/);
});
