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
 root.append(note('Connection status is read-only. A configured secret does not mean a service is reachable. Secrets and private identifiers are never shown here.'));
 const records=inventory?.connections;
 if(!records){
  const unavailable=section('Integration register','Unavailable');
  unavailable.append(empty('Connection status could not be loaded. Use Refresh data to try again.'));root.append(unavailable);return;
 }
 const groups=[['Editorial','Content and research'],['Operations','Inquiries and opportunities'],['Media','Asset management'],['Communications','Correspondence'],['Listening','Music destinations'],['Insights','Audience research']];
 const titles={configured:'Configured · not verified',not_configured:'Not configured',pending_verification:'Setup pending',planned:'Planned'};
 const wrap=el('div','','integration-grid');
 for(const [group,desc] of groups){
  const groupRecords=records.filter(x=>x.group===group);
  if(!groupRecords.length)continue;
  const card=section(group,desc);
  for(const connection of groupRecords){
   const block=el('div','','integration-record');
   const heading=el('div','','integration-row');
   heading.append(el('h3',connection.name),el('span',titles[connection.state]||'Unverified','integration-state integration-state--'+connection.state));
   block.append(heading,el('p',connection.purpose,'muted'),el('p',connection.details,'muted'));
   const next=el('p','','integration-next');
   next.append(el('strong','Next: '),document.createTextNode(connection.next));
   block.append(next);
   card.append(block);
  }
  wrap.append(card);
 }
 root.append(wrap);
 const foot=section('Integration policy','Server-side only');
 foot.append(note('Notion owns editorial records. Supabase owns operational records and private files. Publishing, email sending and commercial rights operations remain disabled until separately reviewed.'));
 root.append(foot);
}
export function renderSystem(root,data,draft){const card=section('System & Security','Development');
item(card,'Current access','Temporary server-side Basic authentication. Replace before production.');
item(card,'Draft storage',draft?.enabled?'Local development file persistence enabled':'Disabled. Set STUDIO_LOCAL_DRAFTS=true in local development.');
item(card,'Operations API',data?'Available':'Unavailable');
card.append(note('Production login, MFA, rate limits, CSRF safeguards for all privileged writes, audit logs, and deployment review are still required.',true));root.append(card);}
export function renderSettings(root,draft){const card=section('Workspace settings','Read-only');item(card,'Active editor','Opening grid');item(card,'Draft capability',draft?.enabled?'Local-only draft storage enabled':'Unavailable');card.append(note('Account preferences and organization roles will be enabled after authentication work.'));root.append(card);}
