import {el,clear,note} from '../components/ui.js';

/** Private Inquiry Center. Live records come only from the authenticated overview API.
 *  The explicitly labeled examples below are LOCAL DEMONSTRATIONS, not real inquiries.
 *  Mutations, outgoing email, signatures and rights approval are intentionally disabled.
 */
export const INQUIRY_TYPES={sampling:'SMP',commercial:'LIC',collaboration:'COL',general:'GEN'};
export const INQUIRY_PRIORITIES=['Normal','High','Urgent'];
export const APPROVAL_DECISIONS=['Not Required','Pending Review','Revisions Requested','Approved','Not Approved','Withdrawn'];
export const TAG_GROUPS={
 'Creative medium':['Film','Television','Advertising','Fashion','Music','Editorial'],
 'Intended use':['Sampling','Synchronization','Adaptation','Promotional','Reproduction'],
 'Project context':['Independent','Commercial','Student','Nonprofit'],
 'Rights scope':['Master Recording','Composition','Worldwide','Limited Term','Exclusive'],
 'Internal organization':['Founder Review','External Counsel','Follow-up Needed']
};
const views=[
 ['all','All Conversations'],['new','New'],['reply','Needs My Reply'],['review','In Review'],
 ['approvals','Approvals'],['waiting','Awaiting Contact'],['starred','Starred'],
 ['mine','Assigned to Me'],['resolved','Resolved'],['archived','Archived']
];
const demo=[
 {id:'demo-1',reference_number:'INQ-LIC-26-001',contact_name:'Maya Chen',organization:'Independent Film',subject:'Music license for short film',inquiry_type:'commercial',status:'in_review',priority:'High',approval_decision:'Pending Review',action_required:'Founder Decision',response_responsibility:'none',starred:true,created_at:'2026-11-21T15:00:00Z',updated_at:'2026-11-23T12:00:00Z',confidentiality:'Standard',tags:['Film','Synchronization','Worldwide'],intended_use:'Synchronization in an independent short film',requested_rights:'Master and composition; worldwide; proposed 24 months',proposed_price:'$2,500 (proposal)',contract_status:'Partially signed',messages:[{from:'Maya Chen',at:'Nov 21, 2026',body:'I would like to request a license for an original Seasons recording for a short film. I have supplied a proposed scope and agreement.'}],documents:[{name:'Music License Agreement',version:'v3',status:'Partially signed',signatures:'Licensee signed; Seasons unsigned'},{name:'Music License Agreement',version:'v2',status:'Superseded draft',signatures:'Unsigned'}]},
 {id:'demo-2',reference_number:'INQ-SMP-26-001',contact_name:'Elias Morgan',organization:'Music Producer',subject:'Sample clearance request',inquiry_type:'sampling',status:'new',priority:'Normal',approval_decision:'Pending Review',action_required:'Review Required',response_responsibility:'studio',starred:false,created_at:'2026-11-22T12:00:00Z',updated_at:'2026-11-22T12:00:00Z',confidentiality:'Restricted',tags:['Music','Sampling','Master Recording'],intended_use:'Sample within an original recording',requested_rights:'Master and composition clearance requested',proposed_price:'Not yet proposed',contract_status:'Draft',messages:[{from:'Elias Morgan',at:'Nov 22, 2026',body:'I am interested in using a sample in my next release. Can you review the proposed usage?'}],documents:[{name:'Sample License',version:'v1',status:'Draft',signatures:'Unsigned'}]},
 {id:'demo-3',reference_number:'INQ-COL-26-001',contact_name:'Atelier Form',organization:'Creative Studio',subject:'Editorial collaboration proposal',inquiry_type:'collaboration',status:'in_review',priority:'Normal',approval_decision:'Not Required',action_required:'Review Required',response_responsibility:'none',starred:false,created_at:'2026-11-19T12:00:00Z',updated_at:'2026-11-20T12:00:00Z',confidentiality:'Standard',tags:['Fashion','Editorial'],intended_use:'Creative editorial',requested_rights:'To be discussed',proposed_price:'Unpriced',contract_status:'No agreement',messages:[{from:'Atelier Form',at:'Nov 19, 2026',body:'Our studio would love to explore a spring editorial collaboration with Seasons.'}],documents:[]},
 {id:'demo-4',reference_number:'INQ-GEN-26-001',contact_name:'Lena Ortiz',organization:'Writer',subject:'An interview about Seasons',inquiry_type:'general',status:'resolved',priority:'Normal',approval_decision:'Not Required',action_required:'None',response_responsibility:'none',starred:false,created_at:'2026-11-17T12:00:00Z',updated_at:'2026-11-18T12:00:00Z',confidentiality:'Standard',tags:['Editorial'],intended_use:'Interview request',requested_rights:'Not applicable',proposed_price:'Not applicable',contract_status:'Not applicable',messages:[{from:'Lena Ortiz',at:'Nov 17, 2026',body:'I would love to speak about Seasons and its first chapter.'}],documents:[]}
];
const typeLabel={sampling:'Sampling',commercial:'Commercial Licensing',collaboration:'Collaboration',general:'General'};
const stageLabel={new:'New',in_review:'In Review',reviewing:'In Review',awaiting_reply:'Awaiting Reply',awaiting_contact:'Awaiting Contact',resolved:'Resolved',closed:'Closed'};
const makeButton=(label,cls,fn)=>{const b=el('button',label,cls);b.type='button';b.addEventListener('click',fn);return b};
const field=(title,value)=>{const d=el('div','','ic-field');d.append(el('span',title),el('strong',value||'Not available'));return d};
const validPriority=p=>INQUIRY_PRIORITIES.find(v=>v.toLowerCase()===String(p||'').toLowerCase())||'Normal';
const isArchived=r=>Boolean(r.archived_at);
export function matchesInquiryView(r,v){
 const status=r.status;
 if(v==='archived')return isArchived(r);
 if(isArchived(r))return false;
 if(v==='all')return true;
 if(v==='new')return status==='new';
 if(v==='reply')return r.response_responsibility==='studio';
 if(v==='review')return ['in_review','reviewing'].includes(status);
 if(v==='approvals')return ['Pending Review','Revisions Requested'].includes(r.approval_decision)||r.action_required==='Founder Decision';
 if(v==='waiting')return r.response_responsibility==='contact';
 if(v==='starred')return r.starred===true;
 if(v==='mine')return r.assigned_to_me===true;
 if(v==='resolved')return status==='resolved';
 return false;
}
function normalize(r){return {...r,priority:validPriority(r.assigned_priority||r.priority||r.suggested_priority),approval_decision:r.approval_decision||'Not available',action_required:r.action_required||'Not available',tags:Array.isArray(r.tags)?r.tags:[],messages:Array.isArray(r.messages)?r.messages:[],documents:Array.isArray(r.documents)?r.documents:[]};}
export function renderInquiryCenter(root,data,navigate=()=>{}){
 const connected=Boolean(data?.operations?.storageConnected);
 const live=connected&&Array.isArray(data.operations.inquiries)?data.operations.inquiries.map(normalize):[];
 const state={mode:'live',area:'inbox',view:'all',search:'',sort:'latest',type:'all',selected:null,tab:'Conversation',checks:new Set(),notes:[],focus:null};
 let modalKeydown=null;
 const shell=el('div','','ic-shell');root.append(shell);
 function close(){
  state.selected=null;state.checks.clear();
  if(modalKeydown){document.removeEventListener('keydown',modalKeydown);modalKeydown=null;}
  draw();state.focus?.focus();
 }
 function open(r){state.focus=document.activeElement;state.selected=r;state.tab='Conversation';state.checks.clear();draw();shell.querySelector('.ic-close')?.focus();
  modalKeydown=e=>{if(e.key==='Escape')close();if(e.key==='Tab'){const dialog=shell.querySelector('.ic-modal');if(!dialog)return;const focusable=[...dialog.querySelectorAll('button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled])')];if(!focusable.length)return;const first=focusable[0],last=focusable[focusable.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}};
  document.addEventListener('keydown',modalKeydown);
 }
 function draw(){
  clear(shell);
  const side=el('nav','','ic-sidebar'),main=el('section','','ic-main');
  side.setAttribute('aria-label','Inquiry Center navigation');
  side.append(el('div','SEASONS / OPERATIONS','ic-eyebrow'),el('h2','Inquiry Center'));
  const nav=(name,on,fn)=>makeButton(name,'ic-nav'+(on?' active':''),fn);
  side.append(nav('Inbox',state.area==='inbox',()=>{state.area='inbox';draw()}));
  if(state.area==='inbox'){
   const sub=el('div','','ic-subnav');
   for(const [key,name] of views)sub.append(nav(name,state.view===key,()=>{state.view=key;draw()}));
   side.append(sub);
  }
  side.append(nav('Opportunities',false,()=>navigate('opportunities')));
  side.append(nav('Saved Views',state.area==='views',()=>{state.area='views';draw()}));
  side.append(nav('Inquiry Settings',state.area==='settings',()=>{state.area='settings';draw()}));
  shell.append(side,main);
  if(state.area==='inbox')inbox(main);else auxiliary(main);
  if(state.selected)dialog();
 }
 function inbox(main){
  const heading=el('div','','ic-main-head'),intro=el('div');
  intro.append(el('div','INQUIRIES / '+state.view.toUpperCase(),'ic-eyebrow'),el('h2',views.find(v=>v[0]===state.view)?.[1]||'Inbox'));
  heading.append(intro);main.append(heading);
  const banner=el('div','','ic-banner');
  banner.append(el('strong',state.mode==='demo'?'DEMONSTRATION MODE':'CONNECTED RECORDS'));
  banner.append(el('span',state.mode==='demo'?'Examples are fictional. No data or decision is saved.':connected?'Only records returned by the existing protected Studio API are shown. Message and approval APIs are not connected.':'Storage is unavailable. Switch to examples to explore the interface.'));
  const toggle=makeButton(state.mode==='demo'?'View connected records':'Explore sample inquiries','ic-secondary',()=>{state.mode=state.mode==='demo'?'live':'demo';draw()});
  banner.append(toggle);main.append(banner);
  const toolbar=el('div','','ic-toolbar'),search=el('input');search.type='search';search.placeholder='Search contacts, subjects, reference numbers';search.setAttribute('aria-label','Search inquiries');search.value=state.search;
  search.addEventListener('input',()=>{state.search=search.value;drawRows();});
  const sort=document.createElement('select');sort.setAttribute('aria-label','Sort inquiries');
  for(const [val,label] of [['latest','Latest activity'],['oldest','Oldest first'],['priority','Priority']]){const o=el('option',label);o.value=val;sort.append(o)}
  sort.value=state.sort;sort.addEventListener('change',()=>{state.sort=sort.value;drawRows()});
  const types=document.createElement('select');types.setAttribute('aria-label','Filter inquiry type');
  for(const [val,label] of [['all','All types'],['sampling','Sampling'],['commercial','Commercial Licensing'],['collaboration','Collaboration'],['general','General']]){const o=el('option',label);o.value=val;types.append(o)}
  types.value=state.type;types.addEventListener('change',()=>{state.type=types.value;drawRows()});
  toolbar.append(search,types,sort);main.append(toolbar);
  const list=el('div','','ic-records');main.append(list);
  function drawRows(){
   clear(list);
   const records=state.mode==='demo'?demo:live;
   if(state.mode==='live'&&!connected){list.append(el('div','Inquiry storage is not connected.','ic-empty'));return}
   const filtered=records.filter(r=>matchesInquiryView(r,state.view))
    .filter(r=>state.type==='all'||r.inquiry_type===state.type)
    .filter(r=>[r.reference_number,r.contact_name,r.subject,r.organization,r.inquiry_type].some(v=>String(v||'').toLowerCase().includes(state.search.toLowerCase())));
   const dt=r=>Date.parse(r.updated_at||r.created_at)||0;
   const p=r=>({urgent:3,high:2,normal:1}[validPriority(r.priority).toLowerCase()]||0);
   filtered.sort((a,b)=>state.sort==='oldest'?dt(a)-dt(b):state.sort==='priority'?p(b)-p(a):dt(b)-dt(a));
   if(!filtered.length){list.append(el('div','No inquiries match the selected view.','ic-empty'));return}
   for(const r of filtered){
    const row=makeButton('','ic-record',()=>open(r));
    const meta=el('div','','ic-record-meta');
    meta.append(el('span',r.reference_number||'Reference not assigned','ic-ref'),el('span',r.created_at?new Date(r.created_at).toLocaleDateString('en-US'):'Date unavailable','ic-date'));
    row.append(meta,el('h3',r.subject||r.inquiry_type||'Untitled inquiry'),el('p',(r.contact_name||'Contact unavailable')+' · '+(typeLabel[r.inquiry_type]||r.inquiry_type||'Inquiry')));
    const badges=el('div','','ic-badges');
    badges.append(el('span',stageLabel[r.status]||r.status||'Unknown','ic-badge'));
    badges.append(el('span',validPriority(r.priority),'ic-badge '+validPriority(r.priority).toLowerCase()));
    if(r.approval_decision&&r.approval_decision!=='Not available')badges.append(el('span',r.approval_decision,'ic-badge approval'));
    row.append(badges);list.append(row);
   }
  }drawRows();
 }
 function auxiliary(main){
  const setting=state.area==='settings';
  main.append(el('h2',setting?'Inquiry Settings':'Saved Views'),el('p',setting?'Configure intake forms, correspondence templates, and governance. Changes are disabled until authorized APIs exist.':'My Views and Shared Views will support private, permission-controlled filters.'));
  const items=setting?['Intake Forms','Response Templates','Attachment Rules','Notifications','Permissions','Retention Policy']:['My Views','Shared Views'];
  const grid=el('div','','ic-aux-grid');
  items.forEach(name=>{const card=el('article','','ic-aux-card');card.append(el('h3',name),el('p','Configuration is not connected. No data has been created or modified.'));grid.append(card)});
  main.append(grid);
 }
 function dialog(){
  const r=state.selected,overlay=el('div','','ic-overlay'),modal=el('section','','ic-modal');
  modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','ic-dialog-title');
  const head=el('div','','ic-modal-head'),identity=el('div');
  identity.append(el('div',r.reference_number||'Reference not assigned','ic-ref'),el('h2',r.subject||'Inquiry'),el('p',(r.contact_name||'Contact unavailable')+' · '+(typeLabel[r.inquiry_type]||r.inquiry_type||'Inquiry')));
  identity.querySelector('h2').id='ic-dialog-title';
  head.append(identity,makeButton('✕','ic-close',close));modal.append(head);
  const tabs=el('nav','','ic-tabs');
  for(const name of ['Conversation','Review & Approval','Documents','Internal Notes'])tabs.append(makeButton(name,'ic-tab'+(state.tab===name?' active':''),()=>{state.tab=name;renderBody()}));
  const body=el('div','','ic-modal-body');modal.append(tabs,body,el('div','Private Studio · Workflow actions are disabled until authorization and audit services are connected.','ic-modal-foot'));
  overlay.append(modal);shell.append(overlay);
  overlay.addEventListener('mousedown',e=>{if(e.target===overlay)close()});
  renderBody();
  function renderBody(){
   clear(body);
   tabs.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x.textContent===state.tab));
   const layout=el('div','','ic-detail-layout'),content=el('div','','ic-detail-primary'),details=el('aside','','ic-detail-aside');
   const info=el('div','','ic-aside-fields');
   for(const [label,val] of [['Contact',r.contact_name],['Type',typeLabel[r.inquiry_type]||r.inquiry_type],['Status',stageLabel[r.status]||r.status],['Priority',validPriority(r.priority)],['Approval',r.approval_decision],['Action required',r.action_required],['Confidentiality',r.confidentiality]])info.append(field(label,val));
   details.append(el('h3','Inquiry details'),info);
   const tags=el('div','','ic-tag-list');(r.tags||[]).forEach(t=>tags.append(el('span',t)));
   details.append(el('h3','Tags'),tags);
   if(state.tab==='Conversation'){
    content.append(el('h3','Correspondence'));
    if(state.mode==='demo')r.messages.forEach(m=>{const message=el('article','','ic-message');message.append(el('strong',m.from+' · '+m.at),el('p',m.body));content.append(message)});
    else content.append(el('div','Message history is not exposed by the current private API. No simulated messages are shown for connected inquiries.','ic-empty'));
    content.append(el('h3','Reply composer'));
    const reply=document.createElement('textarea');reply.rows=4;reply.placeholder='Reply unavailable until the messaging provider is connected';reply.disabled=true;content.append(reply);
    const send=makeButton('Send reply','ic-submit',()=>{});send.disabled=true;content.append(send);
   }else if(state.tab==='Review & Approval'){
    content.append(el('h3','Review proposed usage and terms'));
    const data=el('div','','ic-review-fields');
    for(const [key,val] of [['Intended use',r.intended_use],['Requested rights',r.requested_rights],['Proposed price',r.proposed_price],['Contract status',r.contract_status]])data.append(field(key,val));
    content.append(data,el('h3','Internal approval checklist'));
    const checks=['Intended use reviewed','Ownership verified','Usage rights reviewed','Pricing and payment reviewed','Contract terms reviewed'];
    checks.forEach((text,i)=>{const label=el('label','','ic-check');const input=document.createElement('input');input.type='checkbox';input.checked=state.checks.has(i);input.addEventListener('change',()=>{input.checked?state.checks.add(i):state.checks.delete(i)});label.append(input,el('span',text));content.append(label)});
    content.append(el('p','Checklist selections are temporary. Approving terms does not activate rights.'));
    for(const action of ['Approve terms','Request revisions','Not approved']){const btn=makeButton(action,'ic-secondary',()=>{});btn.disabled=true;content.append(btn)}
   }else if(state.tab==='Documents'){
    content.append(el('h3','Documents and agreement versions'));
    if(state.mode==='live')content.append(el('div','Private document metadata and authorized PDF download are not connected.','ic-empty'));
    else if(!r.documents.length)content.append(el('div','No demonstration documents.','ic-empty'));
    else r.documents.forEach(d=>{const entry=el('article','','ic-document');entry.append(el('strong',d.name+' · '+d.version),el('span',d.status),el('p',d.signatures));content.append(entry)});
    content.append(el('p','All document versions will be preserved as separate private records, with authenticated access and independent signature status.'));
   }else{
    content.append(el('h3','Internal notes'));
    if(state.mode==='demo'){
     const area=document.createElement('textarea');area.rows=4;area.placeholder='Private note (temporary demonstration)';content.append(area);
     content.append(makeButton('Add temporary note','ic-submit',()=>{if(area.value.trim()){state.notes.push({id:r.id,text:area.value.trim()});renderBody()}}));
     state.notes.filter(n=>n.id===r.id).forEach(n=>content.append(el('p',n.text,'ic-note')));
    }else content.append(el('div','Internal notes are not connected. Notes must never be sent as external messages.','ic-empty'));
   }
   layout.append(content,details);body.append(layout);
  }
 }
 draw();
}
