import test from 'node:test';
import assert from 'node:assert/strict';
import {creativeDefinitions,validateCreativeDraft,saveCreativeDraft} from '../server/studio-creative-drafts.js';
test('creative draft definitions derive from configured pages and reject unknown fields',()=>{
 const fall=creativeDefinitions().find(x=>x.key==='#/seasons/fall');
 assert.ok(fall);
 const values=Object.fromEntries(fall.fields.map(f=>[f.key,f.value]));
 assert.equal(validateCreativeDraft(fall.key,values).title,'Fall');
 assert.throws(()=>validateCreativeDraft(fall.key,{...values,publish:true}));
 assert.throws(()=>validateCreativeDraft('#/unconfigured',values));
 assert.throws(()=>validateCreativeDraft(fall.key,{...values,title:''}));
});
test('stale revision cannot overwrite a saved creative draft',async()=>{
 const orig=globalThis.fetch,oldUrl=process.env.SUPABASE_URL,oldKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
 try{
 process.env.SUPABASE_URL='https://test.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='test';
 const page=creativeDefinitions().find(x=>x.key==='#/');
 const values=Object.fromEntries(page.fields.map(f=>[f.key,f.value]));
 globalThis.fetch=async(url,init)=>{assert.match(url,/revision=eq.1/);assert.equal(init.method,'PATCH');return {ok:true,json:async()=>[]}};
 const res=await saveCreativeDraft({key:page.key,revision:1,values},{id:'test'});
 assert.equal(res.status,409);
 }finally{globalThis.fetch=orig;if(oldUrl===undefined)delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=oldUrl;if(oldKey===undefined)delete process.env.SUPABASE_SERVICE_ROLE_KEY;else process.env.SUPABASE_SERVICE_ROLE_KEY=oldKey}
});
