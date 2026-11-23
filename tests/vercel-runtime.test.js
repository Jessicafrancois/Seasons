import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';

test('Vercel configuration routes dynamic pages and bundles private Studio assets',async()=>{
 const config=JSON.parse(await readFile(new URL('../vercel.json',import.meta.url),'utf8'));
 assert.equal(config.version,2);
 assert.ok(config.functions['api/index.js'].includeFiles.includes('private/studio/**'));
 assert.ok(config.functions['api/index.js'].includeFiles.includes('public/**'));
 assert.ok(config.rewrites.some(x=>x.source==='/(.*)'&&x.destination==='/api/index'));
 const entry=await readFile(new URL('../api/index.js',import.meta.url),'utf8');
 assert.match(entry,/handleRequest/);
});
test('Vercel handler returns public home but denies Studio APIs without configured auth',async()=>{
 const script=String.raw`
import assert from 'node:assert/strict';
import handler from './api/index.js';
const makeRes=()=>({
 status:200,headers:{},body:null,
 setHeader(name,value){this.headers[name]=value},
 writeHead(status,headers={}){this.status=status;Object.assign(this.headers,headers);return this},
 end(body){this.body=body;return this}
});
const home=makeRes();
await handler({url:'/',method:'GET',headers:{}},home);
assert.equal(home.status,200);
assert.match(String(home.body),/<main id="app"><\/main>/);
const privateApi=makeRes();
await handler({url:'/studio/api/credentials',method:'GET',headers:{}},privateApi);
assert.equal(privateApi.status,503);
console.log('vercel-function-handler-ok');
`;
 const child=spawn(process.execPath,['--input-type=module','-e',script],{
  cwd:process.cwd(),env:{...process.env,VERCEL:'1',NODE_ENV:'production',STUDIO_AUTH_MODE:'disabled',
   STUDIO_USERNAME:'',STUDIO_PASSWORD:'',SUPABASE_SERVICE_ROLE_KEY:''},stdio:['ignore','pipe','pipe']
 });
 let stdout='',stderr='';
 child.stdout.on('data',chunk=>stdout+=chunk.toString());
 child.stderr.on('data',chunk=>stderr+=chunk.toString());
 const exit=await Promise.race([
  new Promise(resolve=>child.on('close',code=>resolve(code))),
  delay(5000).then(()=>{child.kill('SIGKILL');return -1})
 ]);
 assert.equal(exit,0,stderr||stdout);
 assert.match(stdout,/vercel-function-handler-ok/);
});
