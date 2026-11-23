import { el, clear, section, item, button, note, table, field } from '../components/ui.js';

function metric(name,value,detail){const card=el('div','','card');card.append(el('div',name,'metric-name'),el('div',value,'metric-value'),el('div',detail,'muted'));return card;}
function empty(message){return el('div',message,'empty');}
function actions(parent,entries){const row=el('div','','actions');for(const [name,fn] of entries)row.append(button(name,fn,true));parent.append(row);}
export function renderOverview(root,data,navigate){
 const ops=data?.operations, connected=Boolean(ops?.storageConnected);
 const metrics=el('div','','stats');
 metrics.append(
  metric('Visitors','—','Analytics not connected'),
  metric('New inquiries',connected?String(ops.inquiryCount):'—',connected?ops.inquiryCountScope:'Inbox not connected'),
  metric('Configured routes',data?String(data.pageCount):'—','From public content'),
  metric('Unpublished drafts','—','Publishing not connected')
 );
 root.append(metrics);
 const top=el('div','','grid-two'),alerts=section('Attention required',connected?'Stored records':'Not connected');
 if(!connected)alerts.append(empty('Alert storage is not connected. Automated monitoring is not running.'));
 else if(!ops.alerts.length)alerts.append(empty('No unresolved alert records. Automated monitoring is not configured.'));
 else ops.alerts.slice(0,4).forEach(a=>item(alerts,a.severity.toUpperCase()+' · '+a.title,a.status));
 actions(alerts,[['View alerts',()=>navigate('alerts')]]);
 const pages=section('Page inventory',data?data.pageCount+' routes':'Unavailable');
 if(data){for(const category of ['Core','Season','Project','Track']){const list=data.pages.filter(p=>p.category===category);if(list.length)item(pages,category+' · '+list.length,list.slice(0,3).map(x=>x.title).join(' · '));}}
 else pages.append(empty('Content registry unavailable.'));
 actions(pages,[['View pages',()=>navigate('pages')]]);
 top.append(alerts,pages);root.append(top);
 const bottom=el('div','','grid-two'),inquiries=section('Inquiries',connected?'Recent records':'Not connected'),season=section('Current season',data?'Season '+data.activeSeason.number+' · '+data.activeSeason.title:'Unavailable');
 if(connected){if(ops.inquiries.length)ops.inquiries.slice(0,3).forEach(i=>item(inquiries,i.inquiry_type,i.contact_name+' · '+i.status));else inquiries.append(empty('No inquiries recorded yet.'));}
 else inquiries.append(empty('Configure private storage to view inquiries.'));
 actions(inquiries,[['Open Inquiry Center',()=>navigate('inquiries')]]);
 season.append(el('p','Time · Love · Intentions','muted'));
 season.append(el('p','The active season is currently controlled by the public content module. The season manager will read its chronology without altering historic chapters.','muted'));
 bottom.append(inquiries,season);root.append(bottom);
}
export function renderInquiries(root,data){
 root.append(note('Private inquiry records are readable here when the database is connected. Sending replies and changing statuses are not enabled.'));
 const card=section('Inquiry Center',data?.operations?.storageConnected?'Connected':'Not connected');root.append(card);
 const records=data?.operations?.inquiries;
 if(!records){card.append(empty('Connect Supabase to read inquiries.'));return;}
 if(!records.length){card.append(empty('No inquiries received yet.'));return;}
 const filter=field('Status filter','select','all',()=>update(),[['all','All'],['new','New'],['reviewing','Reviewing'],['awaiting_reply','Awaiting reply'],['resolved','Resolved'],['closed','Closed']]);
 const area=el('div');card.append(filter.wrap,area);
 function update(){clear(area);const shown=records.filter(r=>filter.input.value==='all'||r.status===filter.input.value);
 if(!shown.length){area.append(empty('No inquiries in this status.'));return;}
 area.append(table(['Contact','Type','Status','Received'],shown,(r,i)=>[r.contact_name,r.inquiry_type,r.status,new Date(r.created_at).toLocaleDateString()][i]));}update();
}
export function renderAlerts(root,data){
 root.append(note('These are saved alerts. Automatic system-health checks and escalation rules have not yet been connected.'));
 const card=section('Alerts',data?.operations?.storageConnected?'Connected':'Not connected');root.append(card);
 const records=data?.operations?.alerts;
 if(!records){card.append(empty('Alert database is not connected.'));return;}
 if(!records.length){card.append(empty('No unresolved alert records.'));return;}
 card.append(table(['Severity','Event','Status','Date'],records,(r,i)=>[r.severity,r.title,r.status,new Date(r.created_at).toLocaleDateString()][i]));
}
export function renderPages(root,data){
 root.append(note('This inventory reports routes configured in the PWA. It does not establish uptime or publication approval.'));
 const card=section('Page Inventory',data?data.pageCount+' routes':'Unavailable');root.append(card);
 if(!data){card.append(empty('No page data available.'));return;}
 const filters=el('div','','filters'),search=field('Find a page','search','',update),category=field('Category','select','All',update,[['All','All'],['Core','Core'],['Season','Season'],['Project','Project'],['Track','Track']]),results=el('div');
 filters.append(search.wrap,category.wrap);card.append(filters,results);
 function update(){clear(results);const q=search.input.value.trim().toLowerCase(),kind=category.input.value;
 const pages=data.pages.filter(p=>(kind==='All'||p.category===kind)&&(!q||(p.title+' '+p.route).toLowerCase().includes(q)));
 if(!pages.length){results.append(empty('No pages match your filters.'));return;}
 results.append(table(['Page','Category','State'],pages,(p,i)=>{
 if(i===0){const a=el('a',p.title);a.href='/'+p.route;a.target='_blank';a.rel='noopener noreferrer';return a;}
 return [null,p.category,p.status][i];
 }));}
 update();
}
export function renderAnalytics(root){const card=section('Audience analytics','Not connected');card.append(empty('Visitor statistics, traffic sources, listening engagement, and page performance require a privacy-conscious analytics integration. No numbers are invented.'));root.append(card);}
export function renderSeasons(root,data){const card=section('Season chronology','Read-only');if(data)item(card,'Season '+data.activeSeason.number+' · '+data.activeSeason.title,'Current chapter · '+data.activeSeason.slug);card.append(note('Season 1 progresses Fall → Winter → Spring → Summer. Past-season archive restrictions remain part of the publishing rules.'));root.append(card);}
export function renderProjects(root,data){const card=section('Projects & Records','Read-only');const records=data?.pages?.filter(p=>p.category==='Project'||p.category==='Track')||[];if(records.length)card.append(table(['Work','Type','Season'],records,(r,i)=>[r.title,r.category,r.season||'—'][i]));else card.append(empty('No content registry available.'));root.append(card);}
export function renderMedia(root){const card=section('Media Library','Integration pending');card.append(empty('This will organize artwork, photographs, audio, videos, and cover images. Private Supabase Storage integration is pending.'));root.append(card);}
export function renderDesign(root){const card=section('Design System','Foundation');card.append(note('The Studio interface is now styled through one shared stylesheet. Tokens for the public PWA will be mapped separately to avoid changing existing pages.'));root.append(card);}
export function renderMotion(root){const card=section('Motion Studio','Preview');card.append(note('The opening editor contains initial motion settings. Reusable transition presets and a full animation timeline are planned.'));root.append(card);}
export function renderPublishing(root){const card=section('Publishing','Disabled');card.append(note('Publishing is intentionally disabled. Local draft settings are not public releases, and current Fall content remains unchanged.',true));root.append(card);}
export function renderIntegrations(root,data,inventory){
 const records=inventory?.connections||[];
 const callbackState=new URLSearchParams(location.search).get('connection');
 if(callbackState){
  const messages={connected:'Account authorized and saved securely.',denied:'Authorization was cancelled or denied.',invalid_state:'Authorization expired. Try connecting again.',unavailable:'The provider could not be connected. Review your setup and retry.'};
  const message=messages[callbackState];
  if(message)root.append(note(message,callbackState!=='connected'));
  history.replaceState(null,'',location.pathname+'#integrations');
 }
 const directory=section('Connected services','ACCOUNT CONNECTIONS');
 directory.classList.add('integration-directory');
 const intro=el('p','Give Seasons permission to access the content and accounts you choose. You can review each connection before authorizing it.','muted');
 const summary=el('div','','integration-summary');summary.append(el('strong','Your creative workspace'),el('span','Notion · Supabase · Music · Communications'));
 directory.append(intro,summary);
 if(!records.length){directory.append(note('The connections register is unavailable. Refresh Studio to try again.'));root.append(directory);return;}
 const display={notion:'N',supabase:'S',storage:'S',email:'@',spotify:'♫','apple-music':'♪',analytics:'↗'};
 const category={notion:'Editorial workspace',supabase:'Private data',storage:'Media archive',email:'Correspondence',spotify:'Listening', 'apple-music':'Listening',analytics:'Insight'};
 const label={configured:'Ready to verify',not_configured:'Not connected',pending_verification:'Setup needed',planned:'Not connected'};
 const cards=el('div','','integration-tiles');
 const modal=document.createElement('dialog');modal.className='integration-modal';modal.setAttribute('aria-label','Connect a service');
 let oauth={};
 async function connectionStates(){
  try{
   const res=await fetch('/studio/api/oauth/status',{cache:'no-store'});
   if(res.ok){oauth=await res.json();for(const [id,state] of Object.entries(oauth.connections||{})){
    const chip=cards.querySelector('[data-connection="'+id+'"] .integration-tile-state');
    if(chip&&state.connected)chip.textContent='Connected';
   }}
  }catch{}
 }
 const close=button('Close',()=>modal.close(),true);
 close.setAttribute('aria-label','Close connection details');
 const heading=el('h2','');
 const categoryLine=el('p','','integration-kicker');
 const description=el('p','','muted');
 const permissions=el('ul','','integration-permissions');
 const instruction=el('div','','integration-modal-setup');
 const result=el('p','','integration-modal-result');result.setAttribute('role','status');
 const buttons=el('div','','integration-modal-actions');
 const header=el('div','','integration-modal-head');header.append(categoryLine,close);
 modal.append(header,heading,description,el('h3','Permissions and access'),permissions,instruction,result,buttons);
 modal.addEventListener('click',event=>{if(event.target===modal)modal.close()});
 const permissionList={
  notion:['Choose the pages and databases shared with Seasons','Access only content permitted by the Notion integration','No automatic publishing or changes to your work'],
  supabase:['Read private inquiry and opportunity records on the server','Store operational records under protected permissions','No access tokens exposed to website visitors'],
  storage:['Access authorized media and document buckets','Keep contract files private','Uploads and sharing remain disabled until permissions are reviewed'],
  email:['Verify an email sending domain','Send and receive correspondence only after delivery workflows are enabled','No messages are sent during connection setup'],
  spotify:['Read your Spotify profile for connecting listening features','No playlist edits, playback control, or library modification','You may revoke access from your Spotify account'],
  'apple-music':['Read approved catalog metadata with an Apple developer token','Listener sign-in requires a separate MusicKit integration','No Apple Music account access requested here'],
  analytics:['Read aggregate site statistics','No new tracking code is installed from this screen','Review privacy and consent before collecting visitor data']
 };
 function launch(id){
  const record=records.find(x=>x.id===id);if(!record)return;
  const cfg=inventory.setup?.[id];
  heading.textContent=record.name;
  categoryLine.textContent=category[id]||'Service connection';
  description.textContent=record.purpose;
  permissions.replaceChildren();
  for(const permission of permissionList[id]||[])permissions.append(el('li',permission));
  instruction.replaceChildren();buttons.replaceChildren();result.textContent='';
  const authorization=oauth.providers?.[id];
  if(oauth.connections?.[id]?.connected){
   instruction.append(note('Connected account: '+oauth.connections[id].label+'. Your connection has been saved securely. Other workflows may require separate setup.'));
   const remove=button('Disconnect from Studio',async()=>{
    if(!confirm('Remove the saved '+record.name+' connection from Seasons Studio?'))return;
    remove.disabled=true;result.textContent='Removing saved connection…';
    try{
     const res=await fetch('/studio/api/oauth/connections/'+id,{
      method:'DELETE',credentials:'same-origin',headers:{'X-Seasons-Studio':'connection-remove'}
     });
     const body=await res.json();
     if(!res.ok||!body.ok)throw Error('Removal failed');
     delete oauth.connections[id];
     const chip=cards.querySelector('[data-connection="'+id+'"] .integration-tile-state');
     if(chip)chip.textContent='Not connected';
     modal.close();launch(id);
     result.textContent=body.message;
    }catch{result.textContent='Could not remove the connection. Try again.'}
    finally{remove.disabled=false}
   },true);
   buttons.append(remove);
  }else if(authorization?.available){
   instruction.append(note('Your account authorization will open on the provider website. Review its permission screen and select the content you wish to share.'));
   const connect=button('Continue to '+record.name,()=>{location.assign('/studio/oauth/start/'+id)});
   buttons.append(connect);
  }else{
   instruction.append(note('Account authorization is not yet enabled for this provider in this Studio environment. Configure the required application settings below.'));
  }
  if(cfg){
   instruction.append(el('h3','Connection settings'));
   instruction.append(el('p',cfg.help,'muted'));
   const list=el('div','','integration-secrets');
   for(const key of cfg.required){
    const line=el('div','','integration-secret-line');
    line.append(el('code',key));
    const copy=button('Copy',async()=>{
     try{await navigator.clipboard.writeText(key);copy.textContent='Copied'}
     catch{copy.textContent='Select to copy'}
    },true);
    line.append(copy);list.append(line);
   }
   instruction.append(list);
   instruction.append(el('p','Store these values in Codespaces or deployment secrets. Never paste private credentials into the browser.','muted'));
   const providerLink=el('a','Open provider setup ↗','integration-provider-link');
   providerLink.href=cfg.portal;providerLink.target='_blank';providerLink.rel='noopener noreferrer';
   instruction.append(providerLink);
  }
  const check=button('Test connection',async()=>{
   check.disabled=true;result.textContent='Checking server credentials…';
   try{
    const res=await fetch('/studio/api/integrations/'+encodeURIComponent(id)+'/test',{method:'POST',credentials:'same-origin',headers:{'X-Seasons-Studio':'integration-check'}});
    const data=await res.json();
    if(!res.ok)throw Error('Check unavailable');
    result.textContent=(data.status==='verified'?'Connected to provider. ':'Not verified. ')+data.message;
   }catch{result.textContent='Could not check the connection. Verify your server settings.'}
   finally{check.disabled=false}
  },true);
  buttons.append(check);
  modal.showModal();
 }
 for(const connection of records){
  const tile=el('button','','integration-tile');tile.type='button';tile.dataset.connection=connection.id;
  const top=el('div','','integration-tile-top');
  const icon=el('span',display[connection.id]||'•','integration-tile-icon integration-icon--'+connection.id);
  const arrow=el('span','↗','integration-tile-arrow');top.append(icon,arrow);
  const title=el('strong',connection.name,'integration-tile-name');
  const kind=el('p',category[connection.id]||'Service','integration-tile-category');
  const state=el('span',label[connection.state]||'Not connected','integration-tile-state');
  tile.append(top,title,kind,state);
  tile.addEventListener('click',()=>launch(connection.id));
  cards.append(tile);
 }
 directory.append(cards);root.append(directory,modal);
 const foot=section('Access and permissions','YOUR CONTROL');
 foot.append(note('Notion and Spotify support account authorization when their OAuth credentials and private token vault are configured. Other services use developer credentials or require additional setup. No connection automatically enables publishing, email sending, or rights approvals.'));
 root.append(foot);
 connectionStates();
}
export function renderSystem(root,data,draft){const card=section('System & Security','Development');
item(card,'Current access','Temporary server-side Basic authentication. Replace before production.');
item(card,'Draft storage',draft?.enabled?'Local development file persistence enabled':'Disabled. Set STUDIO_LOCAL_DRAFTS=true in local development.');
item(card,'Operations API',data?'Available':'Unavailable');
card.append(note('Production login, MFA, rate limits, CSRF safeguards for all privileged writes, audit logs, and deployment review are still required.',true));root.append(card);}
export function renderSettings(root,draft){const card=section('Workspace settings','Read-only');item(card,'Active editor','Opening grid');item(card,'Draft capability',draft?.enabled?'Local-only draft storage enabled':'Unavailable');card.append(note('Account preferences and organization roles will be enabled after authentication work.'));root.append(card);}
