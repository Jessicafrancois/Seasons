// Configuration preflight. Never echo passwords, tokens, project IDs or key values.
const required=[
 ['STUDIO_AUTH_MODE',value=>value==='secure'],
 ['STUDIO_SESSION_CSRF_KEY',value=>/^[a-f0-9]{64}$/i.test(value)],
 ['SUPABASE_URL',value=>{try{return new URL(value).protocol==='https:'}catch{return false}}],
 ['SUPABASE_PUBLISHABLE_KEY',value=>Boolean(value)],
 ['SUPABASE_SERVICE_ROLE_KEY',value=>Boolean(value)],
 ['STUDIO_VAULT_ACTIVE_KEY_ID',value=>/^[A-Za-z0-9_-]{1,48}$/.test(value)]
];
let keyringValid=false;
try{
 const keys=JSON.parse(process.env.STUDIO_VAULT_KEYS||'{}');
 keyringValid=/^[a-f0-9]{64}$/i.test(keys[process.env.STUDIO_VAULT_ACTIVE_KEY_ID]||'');
}catch{}
const checks=required.map(([name,valid])=>({name,ok:valid(process.env[name]||'')}));
checks.push({name:'STUDIO_VAULT_KEYS (active version)',ok:keyringValid});
if(process.env.NODE_ENV==='production')checks.push({
 name:'STUDIO_PUBLIC_ORIGIN (HTTPS)',
 ok:/^https:\/\/[a-z0-9.-]+(?::443)?$/i.test(process.env.STUDIO_PUBLIC_ORIGIN||'')
});
if(process.env.STUDIO_OAUTH_ENABLED==='true'){
 checks.push({name:'STUDIO_OAUTH_ORIGIN (HTTPS)',ok:/^https:\/\/[a-z0-9.-]+(?::443)?$/i.test(process.env.STUDIO_OAUTH_ORIGIN||'')});
 checks.push({name:'Notion OAuth client',ok:Boolean(process.env.NOTION_OAUTH_CLIENT_ID&&process.env.NOTION_OAUTH_CLIENT_SECRET)});
 checks.push({name:'Spotify OAuth client',ok:Boolean(process.env.SPOTIFY_CLIENT_ID&&process.env.SPOTIFY_CLIENT_SECRET)});
}
for(const {name,ok} of checks)console.log((ok?'OK':'MISSING')+'  '+name);
if(checks.some(x=>!x.ok)){
 console.error('Seasons Studio secure mode is not fully configured. No secrets were printed.');
 process.exitCode=1;
}else console.log('Configuration shape validated. Provider permissions, database membership, runtime, MFA and security review must still be checked.');
