// Safe server-side integration inventory. Never return environment values or tokens.
// "Configured" means credentials appear available, not that remote health was verified.
function ready(...keys){return keys.every(key=>typeof process.env[key]==='string' && process.env[key].trim().length>0);}
function entry(id,name,group,purpose,state,details,next){
 return {id,name,group,purpose,state,details,next};
}
export function integrationInventory(){
 const notion=ready('NOTION_TOKEN'),database=ready('SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY');
 const email=ready('SEASONS_EMAIL_PROVIDER','SEASONS_EMAIL_API_KEY');
 return {
  checkedAt:new Date().toISOString(),
  credentialValuesExposed:false,
  setup:integrationSetup(),
  connections:[
   entry('notion','Notion','Editorial','Season chronology, references, project metadata and approved content.',
    notion?'configured':'not_configured',
    notion?'Server token detected. Content permissions and page access have not been verified.':'No server-side Notion token configured.',
    notion?'Verify access to the designated Seasons pages, then map editorial fields.':'Grant the Seasons pages to a Notion integration and configure NOTION_TOKEN on the server.'),
   entry('supabase','Supabase Database','Operations','Private inquiries, opportunity records, alerts and administrative history.',
    database?'configured':'not_configured',
    database?'Server connection settings detected; record access is verified separately by operational queries.':'Supabase server settings are incomplete.',
    database?'Confirm migrations, RLS policies and read-only query results.':'Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY only on the server.'),
   entry('storage','Supabase Storage','Media','Public seasonal artwork and private contracts, audio and supporting files.',
    database?'pending_verification':'not_configured',
    database?'Database credentials are present, but no bucket access check or upload workflow is implemented.':'Private media storage has not been configured for this runtime.',
    'Verify bucket access and per-object permissions before enabling uploads or signed URLs.'),
   entry('email','Email delivery','Communications','Incoming inquiries, replies, delivery notifications and saved correspondence.',
    email?'pending_verification':'not_configured',
    email?'Provider settings detected; inbound and outbound mail delivery are not enabled.':'No email provider integration is configured.',
    'Choose a provider, verify the sending domain and configure inbound webhooks and message threading.'),
   entry('spotify','Spotify','Listening','Open or embed approved streaming releases and playlists.',
    'planned','Public catalog links may exist, but account authorization and catalog synchronization are not built.',
    'Decide whether to use public links or an optional account-linked integration.'),
   entry('apple-music','Apple Music','Listening','Link approved records and playlists to Apple Music.',
    'planned','Catalog links are separate from an authenticated Apple Music API integration.',
    'Begin with canonical release links; evaluate API access only where useful.'),
   entry('analytics','Audience analytics','Insights','Privacy-conscious visit and engagement reporting.',
    'planned','No tracking or analytics provider is running through Studio.',
    'Choose the measurement policy and provider before collecting visitor data.')
  ]
 };
}

const setup = Object.freeze({
 notion:{required:['NOTION_TOKEN'],portal:'https://www.notion.so/profile/integrations',help:'Create a Notion integration, copy its token into server secrets, then share your Seasons pages and databases with that integration.'},
 supabase:{required:['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY'],portal:'https://supabase.com/dashboard/projects',help:'Use your existing Seasons project URL and its server-only service-role key. Do not place this key in public code.'},
 storage:{required:['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY'],optional:['SEASONS_PRIVATE_BUCKET'],portal:'https://supabase.com/dashboard/projects',help:'Use the existing private bucket seasons-private-documents or configure SEASONS_PRIVATE_BUCKET. Verify RLS and object access separately.'},
 email:{required:['SEASONS_EMAIL_PROVIDER','SEASONS_EMAIL_API_KEY'],portal:'https://resend.com/domains',help:'The supported credential check is Resend (SEASONS_EMAIL_PROVIDER=resend). Verify your domain in Resend before enabling email delivery.'},
 spotify:{required:['SPOTIFY_CLIENT_ID','SPOTIFY_CLIENT_SECRET'],portal:'https://developer.spotify.com/dashboard',help:'Create a Spotify developer app and store client ID and secret on the server. This checks app-level access, not a listener login.'},
 'apple-music':{required:['APPLE_MUSIC_DEVELOPER_TOKEN'],portal:'https://developer.apple.com/documentation/applemusicapi',help:'Generate a valid Apple Music developer token in your Apple developer environment. User-specific MusicKit login is a separate feature.'},
 analytics:{required:['PLAUSIBLE_SITE_ID','PLAUSIBLE_API_KEY'],portal:'https://plausible.io/settings',help:'Optional privacy-conscious Plausible site analytics. Create an API key and set your registered site ID.'}
});
export function integrationSetup(){
 return Object.fromEntries(Object.entries(setup).map(([id,value])=>[id,{...value}]));
}
function has(id){
 return (setup[id]?.required||[]).every(key=>Boolean(process.env[key]?.trim()));
}
const probeUrls=Object.freeze({
 notion:'https://api.notion.com/v1/users/me',
 email:'https://api.resend.com/domains',
 'apple-music':'https://api.music.apple.com/v1/catalog/us/charts?types=songs&limit=1'
});
async function statusOf(url,headers,options={}){
 const res=await fetch(url,{method:options.method||'GET',headers,body:options.body,
  redirect:'error',signal:AbortSignal.timeout(6500)});
 return res.status;
}
// Read-only remote checks. Never return raw remote responses, tokens, identifiers or URLs.
export async function testIntegration(id){
 if(!Object.hasOwn(setup,id))return {id,status:'unsupported',message:'Unknown integration'};
 if(!has(id))return {id,status:'not_configured',message:'Configure the required server secrets first.'};
 try{
  let status=0;
  switch(id){
   case 'notion':
    status=await statusOf(probeUrls.notion,{
     Authorization:'Bearer '+process.env.NOTION_TOKEN,'Notion-Version':'2025-09-03'});
    break;
   case 'supabase':
    status=await statusOf(new URL('/rest/v1/seasons_inquiries?select=id&limit=0',process.env.SUPABASE_URL).href,{
     apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,
     Authorization:'Bearer '+process.env.SUPABASE_SERVICE_ROLE_KEY});
    break;
   case 'storage':{
    const bucket=process.env.SEASONS_PRIVATE_BUCKET||'seasons-private-documents';
    if(!/^[a-z0-9][a-z0-9_-]{1,90}$/i.test(bucket))return {id,status:'invalid_config',message:'Invalid private bucket identifier.'};
    status=await statusOf(new URL('/storage/v1/bucket/'+encodeURIComponent(bucket),process.env.SUPABASE_URL).href,{
     apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,
     Authorization:'Bearer '+process.env.SUPABASE_SERVICE_ROLE_KEY});
    break;
   }
   case 'email':
    if(process.env.SEASONS_EMAIL_PROVIDER?.toLowerCase()!=='resend')
     return {id,status:'unsupported',message:'The connection test currently supports Resend only.'};
    status=await statusOf(probeUrls.email,{Authorization:'Bearer '+process.env.SEASONS_EMAIL_API_KEY});
    break;
   case 'spotify':{
    const basic=Buffer.from(process.env.SPOTIFY_CLIENT_ID+':'+process.env.SPOTIFY_CLIENT_SECRET).toString('base64');
    status=await statusOf('https://accounts.spotify.com/api/token',{
      Authorization:'Basic '+basic,'Content-Type':'application/x-www-form-urlencoded'
    },{method:'POST',body:'grant_type=client_credentials'});
    break;
   }
   case 'apple-music':
    status=await statusOf(probeUrls['apple-music'],{Authorization:'Bearer '+process.env.APPLE_MUSIC_DEVELOPER_TOKEN});
    break;
   case 'analytics':{
    const site=process.env.PLAUSIBLE_SITE_ID;
    if(!/^[a-z0-9][a-z0-9.-]{1,253}$/i.test(site))
     return {id,status:'invalid_config',message:'Invalid analytics site identifier.'};
    status=await statusOf('https://plausible.io/api/v1/stats/aggregate?site_id='+encodeURIComponent(site)+'&period=day&metrics=visitors',{
      Authorization:'Bearer '+process.env.PLAUSIBLE_API_KEY});
    break;
   }
  }
  return status>=200&&status<300
   ? {id,status:'verified',message:'Provider accepted the configured credentials. Content mapping and workflows may still be pending.'}
   : {id,status:'failed',message:'Provider rejected this check or required permissions are missing (HTTP '+status+').'};
 }catch{
  return {id,status:'unreachable',message:'Connection could not be verified. Check the server configuration or provider availability.'};
 }
}
