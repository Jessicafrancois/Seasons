import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { pageInventory, overview } from '../server/studio-data.js';
import { validateDraft } from '../server/studio-drafts.js';

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
  const publicHome=await fetch(base+'/');
  assert.equal(publicHome.status,200);
  assert.match(await publicHome.text(),/<main id="app"><\/main>/);
  const projectShell=await fetch(base+'/projects/example');
  assert.equal(projectShell.status,200);
  const legacyLogin=await fetch(base+'/studio/login',{redirect:'manual'});
  assert.equal(legacyLogin.status,302);
  assert.equal(legacyLogin.headers.get('location'),'/studio/');
  const footer=await fetch(base+'/');
  assert.match(await footer.text(),/href="\\/studio\\/" aria-label="Seasons Studio sign in"/);
  const denied=await fetch(base+'/studio/api/overview');
  assert.equal(denied.status,401);
  const auth='Basic '+Buffer.from('local_test_owner:local_test_unique_password').toString('base64');
  const deniedCenters=await fetch(base+'/studio/api/centers');
  assert.equal(deniedCenters.status,401);
  const studio=await fetch(base+'/studio/',{headers:{Authorization:auth}});
  assert.equal(studio.status,200);
  const html=await studio.text();
  assert.match(html,/studio-nav/);
  assert.equal((html.match(/<!doctype html>/gi)||[]).length,1);
  assert.equal((html.match(/<html\b/gi)||[]).length,1);
  assert.doesNotMatch(html,/<script(?![^>]*\bsrc=)[^>]*>/i);
  assert.doesNotMatch(html,/<style\b/i);
  assert.match(html,/\/studio\/assets\/app\.js/);
  const response=await fetch(base+'/studio/api/overview',{headers:{Authorization:auth}});
  assert.equal(response.status,200);
  const centers=await fetch(base+'/studio/api/centers',{headers:{Authorization:auth}});
  assert.equal(centers.status,200);
  assert.deepEqual(await centers.json(),{connected:false,inquiries:[],opportunities:[],counts:null});
  const deniedCenterWrite=await fetch(base+'/studio/api/centers',{method:'POST',headers:{Authorization:auth}});
  assert.equal(deniedCenterWrite.status,405);
  const data=await response.json();
  assert.equal(data.pageCount,14);
  assert.equal(data.operations.storageConnected,false);
  const protectedJs=await fetch(base+'/studio/assets/app.js');
  assert.equal(protectedJs.status,401);
  const workingJs=await fetch(base+'/studio/assets/app.js',{headers:{Authorization:auth}});
  assert.equal(workingJs.status,200);
  assert.match(await workingJs.text(),/renderOverview/);
  const css=await fetch(base+'/studio/assets/styles/studio.css',{headers:{Authorization:auth}});
  assert.equal(css.status,200);
  const forbidden=await fetch(base+'/studio/assets/data/opening-draft.json',{headers:{Authorization:auth}});
  assert.equal(forbidden.status,404);
  const draft=await fetch(base+'/studio/api/draft',{headers:{Authorization:auth}});
  assert.equal(draft.status,200);
  assert.equal((await draft.json()).enabled,false);
  const deniedWrite=await fetch(base+'/studio/api/draft',{method:'PUT',headers:{Authorization:auth,'Content-Type':'application/json'},body:'{}'});
  assert.equal(deniedWrite.status,403);
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

test('opening draft validation rejects unsafe or invalid data',()=>{
 const sample={rotation:8,tileSize:64,gap:4,duration:900,mode:'independent',solidColor:'#A4A99B',straightenOnZoom:true,fillViewport:true};
 assert.equal(validateDraft(sample).solidColor,'#a4a99b');
 assert.throws(()=>validateDraft({...sample,gap:-1}));
 assert.throws(()=>validateDraft({...sample,mode:'<script>'}));
 assert.throws(()=>validateDraft({...sample,solidColor:'transparent;url(evil)'}));
 assert.throws(()=>validateDraft({...sample,straightenOnZoom:'true'}));
});
