import {renderOpportunities} from './pages/opportunities.js';
import {renderInquiryCenter} from './pages/inquiry-center.js';
import {sections,descriptions,el,clear} from './components/ui.js';
import {renderOverview,renderInquiries,renderAlerts,renderPages,renderAnalytics,renderSeasons,renderProjects,renderMedia,renderDesign,renderMotion,renderPublishing,renderIntegrations,renderSystem,renderSettings} from './pages/workspace.js';
import {renderEditor} from './editor/opening.js';

const navigation=document.getElementById('studio-nav'),content=document.getElementById('studio-content');
const title=document.getElementById('page-title'),description=document.getElementById('page-description'),connect=document.getElementById('connect-status');
const renderer={overview:renderOverview,inquiries:renderInquiries,alerts:renderAlerts,pages:renderPages,analytics:renderAnalytics,seasons:renderSeasons,projects:renderProjects,media:renderMedia,design:renderDesign,motion:renderMotion,publishing:renderPublishing,integrations:renderIntegrations,system:renderSystem,settings:renderSettings};
let snapshot=null,editorDraft=null,integrationSnapshot=null,studioSession=null,vaultSnapshot=null,active='overview';
for(const section of sections){
 navigation.append(el('div',section.group,'group'));
 for(const [label,key] of section.items){
  const b=el('button',label);b.type='button';b.dataset.route=key;
  b.addEventListener('click',()=>navigate(key));navigation.append(b);
 }
}
function navigate(key){
 if(!descriptions[key])key='overview';
 active=key;
 for(const b of navigation.querySelectorAll('[data-route]')){
  if(b.dataset.route===key)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
 }
 title.textContent=descriptions[key][0];
 description.textContent=descriptions[key][1];
 document.title=descriptions[key][0]+' | Seasons Studio';
 clear(content);
 if(key==='editor')renderEditor(content,editorDraft);
 else if(key==='overview')renderOverview(content,snapshot,navigate);
 else if(key==='inquiries')renderInquiryCenter(content,snapshot,navigate);
 else if(key==='opportunities')renderOpportunities(content);
 else if(key==='system')renderSystem(content,snapshot,editorDraft);
 else if(key==='settings')renderSettings(content,editorDraft);
 else if(key==='integrations')renderIntegrations(content,snapshot,integrationSnapshot,studioSession,vaultSnapshot,refresh);
 else renderer[key](content,snapshot);
 if(location.hash.slice(1)!==key)history.replaceState(null,'','#'+key);
}
async function refresh(){
 connect.textContent='Refreshing…';
 const [overviewResult,draftResult,integrationResult,sessionResult,vaultResult]=await Promise.allSettled([
  fetch('/studio/api/overview',{cache:'no-store'}),
  fetch('/studio/api/draft',{cache:'no-store'}),
  fetch('/studio/api/integrations',{cache:'no-store'}),
  fetch('/studio/api/session',{cache:'no-store'}),
  fetch('/studio/api/credentials',{cache:'no-store'})
 ]);
 const read=async result=>{
  if(result.status!=='fulfilled'||!result.value.ok)return null;
  try{return await result.value.json()}catch{return null}
 };
 snapshot=await read(overviewResult);
 editorDraft=await read(draftResult)||{enabled:false};
 integrationSnapshot=await read(integrationResult);
 studioSession=await read(sessionResult);
 vaultSnapshot=await read(vaultResult);
 const logout=document.getElementById('studio-logout');
 if(logout)logout.hidden=!studioSession?.secure;
 connect.textContent=snapshot?'Operational data loaded':integrationSnapshot?'Integration status loaded · other data unavailable':'Data unavailable';
 navigate(active);
}
const logoutButton=document.getElementById('studio-logout');
if(logoutButton)logoutButton.addEventListener('click',async()=>{
 if(!studioSession?.csrf)return;
 logoutButton.disabled=true;
 try{
  const res=await fetch('/studio/auth/logout',{method:'POST',credentials:'same-origin',headers:{'X-Studio-CSRF':studioSession.csrf}});
  if(res.ok){location.replace('/studio/login');return}
 }catch{}
 logoutButton.disabled=false;
});
document.getElementById('refresh').addEventListener('click',refresh);
window.addEventListener('hashchange',()=>navigate(location.hash.slice(1)));
active=location.hash.slice(1)||'overview';
refresh();
