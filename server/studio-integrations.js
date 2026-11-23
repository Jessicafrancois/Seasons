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
