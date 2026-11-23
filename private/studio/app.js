import {renderOpportunities} from './pages/opportunities.js';
import {renderInquiryCenter} from './pages/inquiry-center.js';
import {sections,descriptions,el,clear} from './components/ui.js';
import {renderOverview,renderInquiries,renderAlerts,renderPages,renderAnalytics,renderSeasons,renderProjects,renderMedia,renderDesign,renderMotion,renderPublishing,renderIntegrations,renderSystem,renderSettings} from './pages/workspace.js';
import {renderEditor} from './editor/opening.js';

const navigation=document.getElementById('studio-nav'),content=document.getElementById('studio-content');
const title=document.getElementById('page-title'),description=document.getElementById('page-description'),connect=document.getElementById('connect-status');
const renderer={overview:renderOverview,inquiries:renderInquiries,alerts:renderAlerts,pages:renderPages,analytics:renderAnalytics,seasons:renderSeasons,projects:renderProjects,media:renderMedia,design:renderDesign,motion:renderMotion,publishing:renderPublishing,integrations:renderIntegrations,system:renderSystem,settings:renderSettings};
let snapshot=null,editorDraft=null,active='overview';
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
 else if(key==='integrations')renderIntegrations(content,snapshot);
 else renderer[key](content,snapshot);
 if(location.hash.slice(1)!==key)history.replaceState(null,'','#'+key);
}
async function refresh(){
 connect.textContent='Refreshing…';
 try{
  const [overview,draft]=await Promise.all([
   fetch('/studio/api/overview',{cache:'no-store'}),
   fetch('/studio/api/draft',{cache:'no-store'})
  ]);
  if(!overview.ok)throw Error('Overview API unavailable');
  snapshot=await overview.json();
  editorDraft=draft.ok?await draft.json():{enabled:false};
  connect.textContent='Operational data loaded';
 }catch(e){
  connect.textContent='Data unavailable';
  snapshot=null;editorDraft={enabled:false};
 }
 navigate(active);
}
document.getElementById('refresh').addEventListener('click',refresh);
window.addEventListener('hashchange',()=>navigate(location.hash.slice(1)));
active=location.hash.slice(1)||'overview';
refresh();
