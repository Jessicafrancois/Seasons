import test from 'node:test';
import assert from 'node:assert/strict';
import {vaultConfigured,validateCredential,vaultSave,serverCredential,vaultList,vaultDelete} from '../server/studio-vault.js';

const keys=['STUDIO_VAULT_KEYS','STUDIO_VAULT_ACTIVE_KEY_ID','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY'];
const original=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
function restore(){for(const key of keys){if(original[key]===undefined)delete process.env[key];else process.env[key]=original[key]}}
test('credential validation refuses arbitrary network targets and missing required fields',()=>{
 assert.throws(()=>validateCredential('unknown',{apiKey:'123'}));
 assert.throws(()=>validateCredential('supabase',{url:'http://127.0.0.1:3000',serviceRoleKey:'abc'}));
 assert.throws(()=>validateCredential('supabase',{url:'https://example.com',serviceRoleKey:'abc'}));
 assert.deepEqual(validateCredential('analytics',{projectId:'12345',region:'us',apiKey:'xyz',ignored:'other'}),{projectId:'12345',region:'us',apiKey:'xyz'});
 assert.throws(()=>validateCredential('analytics',{projectId:'12345',region:'example.com',apiKey:'xyz'}));
 assert.throws(()=>validateCredential('analytics',{projectId:'../123',region:'eu',apiKey:'xyz'}));
});
test('versioned vault encrypts provider values before saving and never returns keys to UI',async()=>{
 const saved=[],prior=globalThis.fetch;
 try{
  process.env.STUDIO_VAULT_ACTIVE_KEY_ID='key2026';
  process.env.STUDIO_VAULT_KEYS=JSON.stringify({key2026:'a'.repeat(64)});
  process.env.SUPABASE_URL='https://demo.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY='server-only-test';
  assert.equal(vaultConfigured(),true);
  globalThis.fetch=async(url,init)=>{
   if(url.startsWith('https://api.resend.com/'))return {ok:true,status:200};
   if(init.method==='POST'){saved.push({url,body:JSON.parse(init.body)});return {ok:true,status:201}};
   if(init.method==='DELETE')return {ok:true,status:204};
   if(url.includes('select=key_id,ciphertext'))return {ok:true,json:async()=>[saved[0].body]};
   if(url.includes('select=provider,configured_at,updated_at'))return {ok:true,json:async()=>[{provider:'email',configured_at:'2026-11-23T00:00:00Z',updated_at:'2026-11-23T00:00:00Z'}]};
   return {ok:true,json:async()=>([])};
  };
  const result=await vaultSave('email',{apiKey:'re_testing_very_secret_key'}, {id:'123e4567-e89b-42d3-a456-426614174000'});
  assert.equal(result.ok,true);
  assert.equal(saved.length,2);
  assert.equal(saved[0].body.key_id,'key2026');
  assert.doesNotMatch(JSON.stringify(saved),/re_testing_very_secret_key/);
  assert.doesNotMatch(JSON.stringify(result),/re_testing_very_secret_key/);
  const vault=await vaultList();
  assert.equal(vault.providers[0].provider,'email');
  assert.equal(JSON.stringify(vault).includes('ciphertext'),false);
  const decrypted=await serverCredential('email');
  assert.equal(decrypted.apiKey,'re_testing_very_secret_key');
 }finally{globalThis.fetch=prior;restore()}
});
test('encryption keyring refuses incomplete configuration',()=>{
 try{
  delete process.env.STUDIO_VAULT_KEYS;delete process.env.STUDIO_VAULT_ACTIVE_KEY_ID;
  assert.equal(vaultConfigured(),false);
 }finally{restore()}
});
