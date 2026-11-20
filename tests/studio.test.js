import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { pageInventory, overview } from '../server/studio-data.js';

test('route inventory matches public content modules', () => {
 const routes=pageInventory();
 assert.equal(routes.length,14);
 assert.equal(new Set(routes.map(r=>r.route)).size,routes.length);
 assert.equal(routes.filter(r=>r.category==='Core').length,7);
 assert.equal(routes.filter(r=>r.category==='Season').length,1);
 assert.equal(routes.filter(r=>r.category==='Project').length,3);
 assert.equal(routes.filter(r=>r.category==='Track').length,3);
 assert.equal(overview().activeSeason.slug,'fall');
});

test('protected Studio and inquiry integration fail closed', async () => {
 const port=String(36000+Math.floor(Math.random()*20000));
 const server=spawn(process.execPath,['server.js'],{cwd:process.cwd(),env:{...process.env,PORT:port,STUDIO_USERNAME:'local_test_owner',STUDIO_PASSWORD:'local_test_unique_password',SUPABASE_URL:'',SUPABASE_SERVICE_ROLE_KEY:''},stdio:'pipe'});
 const base='http://127.0.0.1:'+port;
 try{
  let ready=false;
  for(let attempt=0;attempt<60;attempt++){
   if(server.exitCode!==null)throw Error('Server exited prematurely');
   try{const response=await fetch(base+'/');if(response.ok){ready=true;break;}}catch{}
   await delay(100);
  }
  assert.ok(ready,'Server should become ready');
  const denied=await fetch(base+'/studio/api/overview');
  assert.equal(denied.status,401);
  const auth='Basic '+Buffer.from('local_test_owner:local_test_unique_password').toString('base64');
  const studio=await fetch(base+'/studio/',{headers:{Authorization:auth}});
  assert.equal(studio.status,200);
  const html=await studio.text();
  assert.match(html,/Page Inventory/);
  assert.match(html,/Opening Grid/);
  const response=await fetch(base+'/studio/api/overview',{headers:{Authorization:auth}});
  assert.equal(response.status,200);
  const data=await response.json();
  assert.equal(data.pageCount,14);
  assert.equal(data.operations.storageConnected,false);
  const privateFile=await fetch(base+'/private/studio/index.html');
  assert.equal(privateFile.status,404);
  const missingStorage=await fetch(base+'/api/inquiries',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify({name:'Test',email:'test@example.com',type:'General inquiry',message:'A test inquiry message.'})});
  assert.equal(missingStorage.status,503);
  assert.equal((await missingStorage.json()).error.includes('not sent'),true);
 }finally{
  server.kill('SIGTERM');
  await new Promise(resolve=>server.once('exit',resolve));
 }
});
