import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyCredential} from '../server/studio-vault.js';
test('PostHog reporting probes only a fixed cloud host with a read-only aggregate query',async()=>{
 const original=globalThis.fetch,calls=[];
 try{
 globalThis.fetch=async(url,init)=>{calls.push({url,init});return {status:200}};
 const result=await verifyCredential('analytics',{projectId:'12345',region:'eu',apiKey:'test-secret'});
 assert.equal(result.ok,true);
 assert.equal(calls[0].url,'https://eu.posthog.com/api/projects/12345/query/');
 assert.equal(calls[0].init.method,'POST');
 assert.equal(JSON.parse(calls[0].init.body).query.kind,'HogQLQuery');
 assert.doesNotMatch(JSON.stringify(result),/test-secret/);
 assert.equal((await verifyCredential('analytics',{projectId:'12345',region:'arbitrary.example',apiKey:'test-secret'})).ok,false);
 assert.equal(calls.length,1);
 }finally{globalThis.fetch=original}
});
