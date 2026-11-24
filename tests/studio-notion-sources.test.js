import test from 'node:test';
import assert from 'node:assert/strict';
import {checkNotionSource,notionSourceDefinitions,registerNotionSource} from '../server/studio-notion-sources.js';
test('discovery only probes explicit Seasons sources without returning private data',async()=>{
 const original=globalThis.fetch,calls=[];
 try{
 const source=notionSourceDefinitions.find(x=>x.key==='records');
 globalThis.fetch=async(url,init)=>{calls.push({url,init});return {status:200,json:async()=>({object:'data_source',id:source.id,properties:{private:'never return'}})}};
 assert.equal(await checkNotionSource(source,'test-token'),'accessible');
 assert.equal(calls[0].url,'https://api.notion.com/v1/data_sources/'+source.id);
 assert.equal(calls[0].init.headers['Notion-Version'],'2025-09-03');
 assert.equal(await checkNotionSource({...source,id:'unrelated'},'test-token'),'unknown');
 assert.equal(calls.length,1);
 globalThis.fetch=async()=>({status:404});
 assert.equal(await checkNotionSource(source,'test-token'),'not_shared');
 globalThis.fetch=async()=>({status:429});
 assert.equal(await checkNotionSource(source,'test-token'),'rate_limited');
 assert.equal(await checkNotionSource(source,null),'not_connected');
 assert.equal((await registerNotionSource({key:'unknown',registered:true},{id:'test'})).status,400);
 }finally{globalThis.fetch=original}
});
