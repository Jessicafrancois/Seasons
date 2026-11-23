import {el,clear,note} from '../components/ui.js';

const inboxViews=[
 ['all','All Conversations'],['new','New'],['reply','Needs My Reply'],
 ['review','In Review'],['waiting','Awaiting Contact'],['starred','Starred'],
 ['mine','Assigned to Me'],['resolved','Resolved'],['archived','Archived']
];
const areas=[['inbox','Inbox'],['opportunities','Opportunities'],['views','Saved Views'],['settings','Inquiry Settings']];
const settings=['Intake Forms','Response Templates','Attachment Rules','Notifications','Permissions','Retention Policy'];
const opportunityTypes=['All Opportunities','Sampling','Commercial Licensing','Collaborations'];
const state={area:'inbox',view:'all',query:'',sort:'latest',selected:null};
function control(label,options,value,change){
 const wrap=el('label','','field'),caption=el('span',label),select=document.createElement('select');
 for(const [v,name] of options){const option=document.createElement('option');option.value=v;option.textContent=name;select.append(option)}
 select.value=value;select.addEventListener('change',()=>change(select.value));wrap.append(caption,select);return wrap;
}
function navButton(label,active,action){
 const button=el('button',label,'inquiry-nav-button');button.type='button';
 if(active)button.setAttribute('aria-current','page');
 button.addEventListener('click',action);return button;
}
export function renderInquiryCenter(root,data,navigate=()=>{}){
 const shell=el('div','','inquiry-shell'),side=el('nav','','inquiry-sidebar'),main=el('section','','inquiry-main');
 side.setAttribute('aria-label','Inquiry Center navigation');
 const render=()=>{
  clear(side);clear(main);
  side.append(el('h2','Inquiry Center'));
  for(const [key,label] of areas){
   side.append(navButton(label,state.area===key,()=>{if(key==='opportunities'){navigate('opportunities');return}state.area=key;state.selected=null;render()}));
   if(key==='inbox'&&state.area==='inbox'){
    const sub=el('div','','inquiry-subnav');
    for(const [view,name] of inboxViews)sub.append(navButton(name,state.view===view,()=>{state.view=view;state.selected=null;render()}));
    side.append(sub);
   }
  }
  if(state.area==='inbox')renderInbox(main,data,render);
  else if(state.area==='opportunities')renderGroup(main,'Opportunities',opportunityTypes,'Formal opportunities are created only through an explicit founder action.');
  else if(state.area==='views')renderGroup(main,'Saved Views',['My Views','Shared Views'],'Saved filter configurations will appear here when the private data service is available.');
  else renderGroup(main,'Inquiry Settings',settings,'Settings are read-only until the corresponding private API and permissions are implemented.');
 };
 render();shell.append(side,main);root.append(shell);
}
function renderGroup(root,title,items,description){
 root.append(el('h2',title),note(description));
 const grid=el('div','','inquiry-settings-grid');
 for(const name of items){
  const card=el('section','','card');card.append(el('h3',name),el('p','Not connected yet. No settings or records have been invented.','muted'));grid.append(card);
 }
 root.append(grid);
}
function renderInbox(root,data,rerender){
 const label=inboxViews.find(([key])=>key===state.view)?.[1]||'All Conversations';
 root.append(el('h2',label));
 const toolbar=el('div','','inquiry-toolbar');
 const search=el('input');search.type='search';search.placeholder='Search authorized inquiries';search.setAttribute('aria-label','Search inquiries');search.value=state.query;
 search.addEventListener('input',()=>{state.query=search.value;renderRows()});
 toolbar.append(search,control('Sort',[['latest','Latest activity'],['oldest','Oldest first'],['priority','Priority']],state.sort,value=>{state.sort=value;renderRows()}));root.append(toolbar);
 const list=el('div','','inquiry-results');root.append(list);
 const renderRows=()=>{
  clear(list);
  const ops=data?.operations;
  if(!ops?.storageConnected){list.append(note('Inquiry storage is not connected. This page does not display sample messages as real correspondence.'));return}
  const rows=Array.isArray(ops.inquiries)?ops.inquiries.slice():[];
  const filtered=rows.filter(r=>{
   const status=String(r.status||'');
   const match=state.view==='all'||(state.view==='new'&&status==='new')||(state.view==='review'&&['in_review','reviewing'].includes(status))||(state.view==='resolved'&&status==='resolved')||(state.view==='archived'&&Boolean(r.archived_at))||(state.view==='waiting'&&r.response_responsibility==='contact')||(state.view==='reply'&&r.response_responsibility==='studio')||(state.view==='starred'&&r.starred===true)||(state.view==='mine'&&r.assigned_to_me===true);
   return match&&[r.contact_name,r.subject,r.inquiry_type].some(v=>String(v||'').toLowerCase().includes(state.query.toLowerCase()));
  });
  filtered.sort((a,b)=>state.sort==='oldest'?Date.parse(a.created_at)-Date.parse(b.created_at):state.sort==='priority'?priority(b)-priority(a):Date.parse(b.updated_at||b.created_at)-Date.parse(a.updated_at||a.created_at));
  if(!filtered.length){list.append(el('p','No matching inquiries in the connected records.','empty'));return}
  for(const record of filtered){
   const button=el('button','','inquiry-record');button.type='button';
   button.append(el('strong',record.subject||record.inquiry_type||'Untitled inquiry'),el('span',record.contact_name||'Contact unavailable','muted'),el('span',record.status||'Status unavailable','tag'));
   button.addEventListener('click',()=>{state.selected=record;renderDetail(root,record,rerender)});list.append(button);
  }
 };
 renderRows();
}
function priority(r){return {urgent:3,high:2,normal:1}[String(r.assigned_priority||r.suggested_priority||'').toLowerCase()]||0}
function renderDetail(root,record,back){
 clear(root);
 const button=el('button','← Back to inbox','button secondary');button.type='button';button.addEventListener('click',back);root.append(button);
 root.append(el('h2',record.subject||record.inquiry_type||'Conversation'));
 const columns=el('div','','inquiry-detail-grid'),thread=el('section','','card'),details=el('aside','','card');
 thread.append(el('h3','Message timeline'),note('Conversation messages are not yet available from a verified private messaging API. Reply sending is disabled.'));
 details.append(el('h3','Inquiry details'));
 for(const [name,value] of [['Contact',record.contact_name],['Type',record.inquiry_type],['Status',record.status],['Priority',record.assigned_priority||record.suggested_priority],['Confidentiality',record.confidentiality]]){
  const item=el('p','','muted');item.append(el('strong',name+': '),document.createTextNode(value||'Not available'));details.append(item);
 }
 details.append(el('h3','Internal notes'),note('Notes remain separate from external messages.'));
 columns.append(thread,details);root.append(columns);
}
