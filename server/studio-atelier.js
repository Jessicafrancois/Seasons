import {randomUUID} from 'node:crypto';
import {kinds,validateDocument,emptyDocument,seedFromFields} from '../private/studio/atelier/model.js';
import {listCreativeDrafts} from './studio-creative-drafts.js';
const docs='seasons_atelier_documents',revs='seasons_atelier_revisions';
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
const failure=(status,error)=>({status,body:{error}});
const result=body=>({status:200,body});
const goodName=v=>typeof v==='string'&&v.trim().length>0&&v.length<=200;
async function db(table,method,query='',body,prefer){
 const url=new URL(process.env.SUPABASE_URL),key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(url.protocol!=='https:'||!key)throw Error('Document store unavailable');
 const response=await fetch(url.origin+'/rest/v1/'+table+query,{method,headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',...(prefer?{Prefer:prefer}:{})},...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(7000)});
 if(!response.ok)throw Error('Document store unavailable');
 return response.json();
}
const ownerFilter=id=>'owner_id=eq.'+encodeURIComponent(id);
const safeRow=row=>({id:row.id,name:row.name,kind:row.kind,revision:row.revision,savedAt:row.updated_at,document:row.document});
async function owned(id,identity){
 if(!uuid(id))return null;
 return (await db(docs,'GET','?id=eq.'+id+'&'+ownerFilter(identity.id)+'&select=id,name,kind,revision,document,updated_at'))[0]||null;
}
export async function atelierRequest(method,route,input,identity){
 if(!identity?.id)return failure(403,'Access denied');
 if(route==='documents'){
  if(method==='GET'){
   const rows=await db(docs,'GET','?'+ownerFilter(identity.id)+'&select=id,name,kind,revision,updated_at&order=updated_at.desc&limit=100');
   return result({documents:rows.map(safeRow)});
  }
  if(method!=='POST')return failure(405,'Method not allowed');
  if(!goodName(input?.name)||!kinds.includes(input.kind))return failure(422,'Choose a document name and supported type.');
  let document=emptyDocument();
  if(input.source){
   if(input.kind!=='page'&&input.kind!=='editorial')return failure(422,'Source copies require page or editorial type.');
   const source=(await listCreativeDrafts()).find(d=>d.key===input.source&&d.category!=='Motion');
   if(!source)return failure(422,'Source draft not found');
   document=seedFromFields(source.fields,source.values);
  }
  const rows=await db(docs,'POST','',{id:randomUUID(),owner_id:identity.id,name:input.name.trim(),kind:input.kind,document,revision:1},'return=representation');
  return result(safeRow(rows[0]));
 }
 const parts=route.split('/'),id=parts[0];
 const row=await owned(id,identity);
 if(!row)return failure(404,'Document not found');
 if(parts[1]==='revisions'){
  if(method!=='GET')return failure(405,'Method not allowed');
  const filter='?document_id=eq.'+id;
  if(parts.length===3){
   if(!/^[1-9][0-9]{0,8}$/.test(parts[2]))return failure(400,'Invalid revision');
   const saved=(await db(revs,'GET',filter+'&revision=eq.'+parts[2]+'&select=revision,name,document,created_at'))[0];
   return saved?result(saved):failure(404,'Revision not found');
  }
  const rows=await db(revs,'GET',filter+'&select=revision,name,created_at&order=revision.desc&limit=100');
  return result({revisions:rows});
 }
 if(parts.length!==1)return failure(404,'Unknown action');
 if(method==='GET')return result(safeRow(row));
 if(method!=='PUT')return failure(405,'Method not allowed');
 if(!goodName(input?.name)||!Number.isSafeInteger(input.revision)||input.revision<1)return failure(422,'Invalid name or revision');
 if(row.revision!==input.revision)return failure(409,'A newer revision exists. Reopen the document before saving.');
 let document;try{document=validateDocument(input.document)}catch(e){return failure(422,e.message)}
 const rows=await db(docs,'PATCH','?id=eq.'+id+'&'+ownerFilter(identity.id)+'&revision=eq.'+input.revision,{name:input.name.trim(),document,revision:input.revision+1,updated_at:new Date().toISOString()},'return=representation');
 return rows.length===1?result(safeRow(rows[0])):failure(409,'A newer revision exists. Reopen the document before saving.');
}
