import {renderOpportunities} from './pages/opportunities.js';
import {renderInquiryCenter} from './pages/inquiry-center.js';
import {sections,descriptions,el,clear} from './components/ui.js';
import {renderOverview,renderInquiries,renderAlerts,renderPages,renderAnalytics,renderSeasons,renderProjects,renderMedia,renderDesign,renderMotion,renderPublishing,renderIntegrations,renderSystem,renderSettings} from './pages/workspace.js';
import {renderEditor} from './editor/opening.js';
import {renderCreativeWorkspace} from './pages/creative.js';
import {renderNotionSources} from './pages/notion-sources.js';
import {currentEditorRoutes,atelierRoutes,allCreativeRoutes} from './components/creative-navigation.js';
import {renderAtelierToolbar,renderCreativeDestination} from './pages/atelier.js';
import {renderAtelierDocuments} from './atelier/editor.js';

const navigation=document.getElementById('studio-nav'),content=document.getElementById('studio-content');
const title=document.getElementById('page-title'),description=document.getElementById('page-description'),connect=document.getElementById('connect-status');
const renderer={overview:renderOverview,inquiries:renderInquiries,alerts:renderAlerts,pages:renderPages,analytics:renderAnalytics,seasons:renderSeasons,projects:renderProjects,media:renderMedia,design:renderDesign,motion:renderMotion,publishing:renderPublishing,integrations:renderIntegrations,system:renderSystem,settings:renderSettings};
let snapshot=null,editorDraft=null,integrationSnapshot=null,studioSession=null,vaultSnapshot=null,active='overview';
function navButton(label,key){
 const b=el('button',label);b.type='button';b.dataset.route=key;
 b.addEventListener('click',()=>navigate(key));return b;
}
for(const section of sections){
 navigation.append(el('div',section.group,'group'));
 if(section.groups){
  for(const group of section.groups){
   const details=el('details','','studio-nav-group');
   const summary=el('summary',group.label);
   const children=el('div','','studio-nav-children');
   for(const item of group.items)children.append(navButton(item.label,item.key));
   details.append(summary,children);navigation.append(details);
  }
 }else for(const [label,key] of section.items)navigation.append(navButton(label,key));
}
let editorTarget=null,editorGuard=null;
function navigate(key,target=null){
 if(editorGuard&&!editorGuard()){history.replaceState(null,'','#'+active);return;}
 editorGuard=null;
 if(target)editorTarget=target;
 if(!descriptions[key])key='overview';
 active=key;
 for(const b of navigation.querySelectorAll('[data-route]')){
  if(b.dataset.route===key){b.setAttribute('aria-current','page');const parent=b.closest('details');if(parent)parent.open=true;}else b.removeAttribute('aria-current');
 }
 title.textContent=descriptions[key][0];
 description.textContent=descriptions[key][1];
 document.title=descriptions[key][0]+' | Seasons Studio';
 clear(content);
 if(['atelier','recent','editor','compose','revisions'].includes(key)&&studioSession?.secure){
  renderAtelierToolbar(content,key,navigate);
  const mount=el('div','','stack');content.append(mount);
  renderAtelierDocuments(mount,key,studioSession,navigate,target,guard=>{editorGuard=guard});
 }
 else if(key==='page-fields'&&studioSession?.secure){const mount=el('div','','stack');content.append(mount);renderCreativeWorkspace(mount,'editor',studioSession,navigate,editorTarget);}
 else if(key==='mapping')renderNotionSources(content,studioSession,true);
 else if(currentEditorRoutes.has(key)&&studioSession?.secure){
  if(atelierRoutes.has(key))renderAtelierToolbar(content,key,navigate);
  const mount=el('div','','stack');content.append(mount);renderCreativeWorkspace(mount,key,studioSession,navigate,editorTarget);
 }
 else if(allCreativeRoutes[key]&&!['publishing','mapping'].includes(key)){
  if(atelierRoutes.has(key))renderAtelierToolbar(content,key,navigate);
  const mount=el('div','','stack');content.append(mount);
  renderCreativeDestination(mount,key,snapshot,studioSession,navigate);
 }
 else if(key==='editor')renderEditor(content,editorDraft);
 else if(key==='overview')renderOverview(content,snapshot,navigate);
 else if(key==='inquiries')renderInquiryCenter(content,snapshot,navigate);
 else if(key==='opportunities')renderOpportunities(content);
 else if(key==='system')renderSystem(content,snapshot,editorDraft,studioSession);
 else if(key==='settings')renderSettings(content,editorDraft);
 else if(key==='integrations')renderIntegrations(content,snapshot,integrationSnapshot,studioSession,vaultSnapshot,refresh);
 else if(renderer[key])renderer[key](content,snapshot);
 else content.append(el('p','Sign in with your secure Studio account to use this workspace.','muted'));
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
