import test from 'node:test';
import assert from 'node:assert/strict';
import {vaultConfigurationIssue,vaultConfigured} from '../server/studio-vault.js';
import {oauthAvailability} from '../server/studio-oauth.js';

test('Founder OAuth diagnostics identify vault misconfiguration without exposing secrets',()=>{
 const keys=['STUDIO_AUTH_MODE','STUDIO_OAUTH_ENABLED','STUDIO_SESSION_CSRF_KEY',
  'STUDIO_VAULT_KEYS','STUDIO_VAULT_ACTIVE_KEY_ID','SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY','STUDIO_OAUTH_ORIGIN',
  'NOTION_OAUTH_CLIENT_ID','NOTION_OAUTH_CLIENT_SECRET'];
 const before=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 try{
  Object.assign(process.env,{
   STUDIO_AUTH_MODE:'secure',STUDIO_OAUTH_ENABLED:'true',
   STUDIO_SESSION_CSRF_KEY:'a'.repeat(64),
   STUDIO_VAULT_ACTIVE_KEY_ID:'key2026',
   SUPABASE_URL:'https://example.supabase.co',
   SUPABASE_SERVICE_ROLE_KEY:'not-a-real-key',
   STUDIO_OAUTH_ORIGIN:'https://studio.example.test',
   NOTION_OAUTH_CLIENT_ID:'app-test',
   NOTION_OAUTH_CLIENT_SECRET:'secret-test'
  });
  process.env.STUDIO_VAULT_KEYS='not valid json';
  assert.equal(vaultConfigurationIssue(),'vault_keys_invalid_json');
  assert.equal(oauthAvailability().notion.issue,'vault_keys_invalid_json');
  process.env.STUDIO_VAULT_KEYS=JSON.stringify({anotherKey:'b'.repeat(64)});
  assert.equal(vaultConfigurationIssue(),'vault_active_key_missing');
  process.env.STUDIO_VAULT_KEYS=JSON.stringify({key2026:'short'});
  assert.equal(vaultConfigurationIssue(),'vault_active_key_invalid');
  process.env.STUDIO_VAULT_KEYS=JSON.stringify({key2026:'b'.repeat(64)});
  assert.equal(vaultConfigurationIssue(),null);
  assert.equal(vaultConfigured(),true);
  assert.equal(oauthAvailability().notion.available,true);
  assert.equal(oauthAvailability().notion.issue,null);
 }finally{
  for(const key of keys){
   if(before[key]===undefined)delete process.env[key];
   else process.env[key]=before[key];
  }
 }
});
