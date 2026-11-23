import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { timingSafeEqual } from 'node:crypto';
import { overview } from './server/studio-data.js';
import { publicDocument } from './server/public-document.js';
import { operationalData, submitInquiry } from './server/studio-operations.js';
import { centerLists, inquiryDetails, opportunityDetails } from './server/studio-centers.js';
import { readDraft, saveDraft } from './server/studio-drafts.js';

const root=resolve(import.meta.dirname,'public');
const studioRoot=resolve(import.meta.dirname,'private/studio');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.webp':'image/webp','.mp3':'audio/mpeg','.png':'image/png','.jpeg':'image/jpeg','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
const studioAssets=new Set(['/app.js','/components/ui.js','/pages/workspace.js','/pages/inquiry-center.js','/pages/opportunities.js','/editor/opening.js','/styles/studio.css','/styles/opportunities.css','/styles/inquiry-center.css']);

function constantEquals(left,right){
 const a=Buffer.from(left),b=Buffer.from(right);
 return a.length===b.length&&timingSafeEqual(a,b);
}
function authorized(request){
 const auth=request.headers.authorization||'';
 if(!auth.startsWith('Basic '))return false;
 try{
  const raw=Buffer.from(auth.slice(6),'base64').toString('utf8'),colon=raw.indexOf(':');
  if(colon===-1)return false;
  return constantEquals(raw.slice(0,colon),process.env.STUDIO_USERNAME)&&constantEquals(raw.slice(colon+1),process.env.STUDIO_PASSWORD);
 }catch{return false;}
}
function json(response,status,payload){
 response.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
 response.end(JSON.stringify(payload));
}
function protect(request,response){
 response.setHeader('Cache-Control','no-store');
 response.setHeader('X-Content-Type-Options','nosniff');
 response.setHeader('X-Frame-Options','DENY');
 response.setHeader('Referrer-Policy','no-referrer');
 response.setHeader('Cross-Origin-Resource-Policy','same-origin');
 if(!process.env.STUDIO_USERNAME||!process.env.STUDIO_PASSWORD){
  json(response,503,{error:'Seasons Studio is not configured.'});return false;
 }
 if(!authorized(request)){
  response.setHeader('WWW-Authenticate','Basic realm="Seasons Studio"');
  json(response,401,{error:'Studio authentication required.'});return false;
 }
 return true;
}
async function readJson(request,maxBytes=8192){
 let text='';
 for await(const chunk of request){
  text+=chunk.toString('utf8');
  if(Buffer.byteLength(text)>maxBytes)throw Object.assign(Error('Too large'),{status:413});
 }
 try{return JSON.parse(text)}catch{throw Object.assign(Error('Invalid JSON'),{status:400})}
}
function sameOrigin(request){
 const origin=request.headers.origin,host=request.headers.host;
 if(!origin||!host)return false;
 try{return new URL(origin).host===host && ['http:','https:'].includes(new URL(origin).protocol)}catch{return false}
}
createServer(async(request,response)=>{
 try{
  const path=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
  if(path==='/api/inquiries'&&request.method==='POST')return await submitInquiry(request,response);
  if(path==='/studio'||path==='/studio/'||path.startsWith('/studio/')){
   if(!protect(request,response))return;
   if(path==='/studio/api/overview'&&request.method==='GET'){
    try{return json(response,200,{...overview(),operations:await operationalData()})}
    catch{return json(response,503,{error:'Operations data temporarily unavailable.'})}
   }
   if(path==='/studio/api/draft'&&request.method==='GET'){
    try{return json(response,200,await readDraft())}
    catch{return json(response,503,{error:'Draft data unavailable.'})}
   }
   if(path==='/studio/api/draft'&&request.method==='PUT'){
    if(!sameOrigin(request)||request.headers['x-seasons-studio']!=='draft-editor')return json(response,403,{error:'Write request denied.'});
    if(!String(request.headers['content-type']||'').startsWith('application/json'))return json(response,415,{error:'Expected JSON.'});
    try{return json(response,200,await saveDraft(await readJson(request)))}
    catch(error){return json(response,error.status|| (error.message.startsWith('Invalid')?422:503),{error:error.message.startsWith('Invalid')?error.message:'Local draft storage unavailable.'})}
   }
   if(path==='/studio/api/centers'||/^\/studio\/api\/(inquiries|opportunities)\/[a-f0-9-]+$/i.test(path)){
    if(request.method!=='GET')return json(response,405,{error:'Method not allowed.'});
    try{
     if(path==='/studio/api/centers')return json(response,200,await centerLists());
     const match=path.match(/^\/studio\/api\/(inquiries|opportunities)\/([a-f0-9-]+)$/i);
     const record=match[1]==='inquiries'?await inquiryDetails(match[2]):await opportunityDetails(match[2]);
     return record?json(response,200,record):json(response,404,{error:'Record not found.'});
    }catch{return json(response,503,{error:'Studio records temporarily unavailable.'})}
   }
   if(request.method!=='GET')return json(response,405,{error:'Method not allowed.'});
   const asset=path.startsWith('/studio/assets/')?path.slice('/studio/assets'.length):null;
   if(asset!==null&&!studioAssets.has(asset))return json(response,404,{error:'Not found.'});
   if(path!=='/studio'&&path!=='/studio/'&&asset===null)return json(response,404,{error:'Not found.'});
   response.setHeader('Content-Security-Policy',"default-src 'none'; connect-src 'self'; script-src 'self'; style-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
   const file=asset===null?resolve(studioRoot,'index.html'):resolve(studioRoot,'.'+asset);
   if(!file.startsWith(studioRoot+sep))return json(response,404,{error:'Not found.'});
   const contents=await readFile(file);
   response.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream'}).end(contents);
   return;
  }
  if(path.startsWith('/api/')||request.method!=='GET')return response.writeHead(404).end('Page unavailable');
  const page=path==='/'||/^\/projects\/[a-z0-9-]+\/?$/.test(path);
  if(page){
   response.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'}).end(publicDocument());
   return;
  }
  const file=resolve(root,'.'+path);
  if(!file.startsWith(root+sep))return response.writeHead(404).end();
  const body=await readFile(file);
  const headers={'Content-Type':types[extname(file)]??'application/octet-stream'};
  if(path==='/service-worker.js')headers['Cache-Control']='no-cache';
  response.writeHead(200,headers).end(body);
 }catch{
  response.writeHead(404).end('Page unavailable');
 }
}).listen(Number(process.env.PORT||3000),'0.0.0.0');
