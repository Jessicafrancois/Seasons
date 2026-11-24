import {el,section,button,note,field,table} from '../components/ui.js';
import {kinds,types,containers,devices,assets,createNode,locate,command,resolveStyle,validateDocument} from './model.js';
const endpoint='/studio/api/atelier/';
const labels={page:'Page',section:'Section',component:'Component',editorial:'Editorial document',experience:'Experience',scene:'Scene',moodboard:'Moodboard',storyboard:'Storyboard',experiment:'Experiment'};
const nodeLabels={frame:'Frame',stack:'Stack',grid:'Grid',heading:'Heading',paragraph:'Paragraph',quote:'Quote',list:'List',image:'Image',video:'Video placeholder',audio:'Audio placeholder',button:'Button',shape:'Shape',divider:'Divider'};
function options(values){return values.map(v=>[v,labels[v]||v])}
function uid(){return crypto.randomUUID()}
async function request(session,path,method='GET',body){
 const response=await fetch(endpoint+path,{method,cache:'no-store',credentials:'same-origin',...(body?{headers:{'Content-Type':'application/json','X-Studio-CSRF':session.csrf},body:JSON.stringify(body)}:{})});
 const data=await response.json();if(!response.ok)throw Error(data.error||'Atelier unavailable');return data;
}
export async function renderAtelierDocuments(root,route,session,navigate,target,guard){
 root.replaceChildren(note('Loading Atelier documents…'));
 try{
  if((route==='editor'||route==='compose')&&typeof target==='string'&&/^[a-f0-9-]{36}$/i.test(target)){
   const doc=await request(session,target);if(root.isConnected)editor(root,doc,route,session,navigate,guard);return;
  }
  const data=await request(session,'documents');
  if(!root.isConnected)return;
  root.replaceChildren();
  const intro=section(route==='revisions'?'Document history':route==='recent'?'Recent documents':'Your creative documents','Private workspace');
  intro.append(el('p','Create a blank document or explicitly copy existing page-field content. All Atelier documents remain private.','muted'));
  const create=el('div','','atelier-create');
  const name=field('Document name','text','',()=>{});name.input.maxLength=200;
  const kind=field('Type','select','page',()=>{source.input.disabled=!['page','editorial'].includes(kind.input.value)},options(kinds));
  const source=field('Start from','select','',()=>{},[['','Blank document']]);
  create.append(name.wrap,kind.wrap,source.wrap);
  const status=el('p','','status');status.setAttribute('role','status');
  const add=button('Create document',async()=>{
   if(!name.input.value.trim()){status.textContent='Enter a document name.';return}
   add.disabled=true;status.textContent='Creating private document…';
   try{const doc=await request(session,'documents','POST',{name:name.input.value,kind:kind.input.value,source:source.input.disabled?null:source.input.value||null});if(root.isConnected)navigate(route==='compose'?'compose':'editor',doc.id)}
   catch(e){status.textContent=e.message;add.disabled=false}
  });
  create.append(add);intro.append(create,status,button('Existing page-field drafts',()=>navigate('page-fields'),true));root.append(intro);
  fetch('/studio/api/creative/drafts',{cache:'no-store',credentials:'same-origin'}).then(r=>r.ok?r.json():null).then(d=>{
   if(!root.isConnected||!d)return;
   for(const p of d.drafts.filter(p=>p.category!=='Motion')){const o=el('option',p.title);o.value=p.key;source.input.append(o)}
  }).catch(()=>{});
  const filter=field('Filter by type','select','all',()=>draw(),[['all','All documents'],...options(kinds)]);
  const search=field('Search documents','search','',()=>draw());search.input.addEventListener('input',()=>draw());
  const list=section('Documents',data.documents.length+' saved');
  const filters=el('div','','creative-toolbar');filters.append(search.wrap,filter.wrap);list.append(filters);const grid=el('div','','atelier-directory');list.append(grid);root.append(list);
  function draw(){
   grid.replaceChildren();
   for(const d of data.documents.filter(x=>(filter.input.value==='all'||x.kind===filter.input.value)&&x.name.toLowerCase().includes(search.input.value.toLowerCase()))){
    const card=el('article','','card');card.append(el('span',labels[d.kind]+' · Revision '+d.revision,'atelier-card-meta'),el('h3',d.name),el('p','Saved '+new Date(d.savedAt).toLocaleString(),'muted'));
    const actions=el('div','','actions');actions.append(button('Open Canvas',()=>navigate('editor',d.id)),button('Compose',()=>navigate('compose',d.id),true),button('History',()=>historyPanel(card,d,session,navigate),true));card.append(actions);grid.append(card);
   }
   if(!grid.children.length)grid.append(note('No matching documents. Create your first private document.'));
  }draw();
 }catch(e){if(root.isConnected)root.replaceChildren(note(e.message,true),button('Retry',()=>renderAtelierDocuments(root,route,session,navigate,target,guard),true))}
}
async function historyPanel(parent,doc,session,navigate,onRestore=null){
 const old=parent.querySelector('.atelier-history');if(old){old.remove();return}
 const panel=el('div','','atelier-history card stack');parent.append(panel);panel.append(el('h3','Revision history'),el('p','Loading…','muted'));
 try{
  const data=await request(session,doc.id+'/revisions');panel.replaceChildren(el('h3','Revision history'));
  for(const row of data.revisions){
   const line=el('div','','row');line.append(el('span','v'+row.revision+' · '+new Date(row.created_at).toLocaleString(),'muted'));
   if(onRestore)line.append(button('Restore as draft',async()=>{
    if(!confirm('Load this revision into the editor? Save creates a new revision.'))return;
    try{const version=await request(session,doc.id+'/revisions/'+row.revision);onRestore(version);panel.remove()}catch(e){panel.append(note(e.message,true))}
   },true));
   panel.append(line);
  }
  if(!onRestore)panel.append(button('Open editor to restore',()=>navigate('editor',doc.id),true));
 }catch(e){panel.append(note(e.message,true))}
}
function editor(root,record,route,session,navigate,registerGuard){
 let document=validateDocument(record.document),name=record.name,revision=record.revision,selected=null,device='desktop',rail='layers',preview=false,advanced=false,dirty=false,saving=false,auto=false,timer=null,disposed=false,conflicted=false,zoom=50;
 let undo=[],redo=[],dragged=null;
 const state=()=>({document:structuredClone(document),name});
 const applyState=s=>{document=s.document;name=s.name;nameInput.value=name;if(selected&&!locate(document.nodes,selected))selected=null};
 const setStatus=s=>{status.textContent=s};
 function mark(){dirty=true;setStatus('Unsaved changes');if(auto&&!conflicted){clearTimeout(timer);timer=setTimeout(()=>save(),1800)}}
 function recordChange(next,nextName=name){
  if(JSON.stringify(next)===JSON.stringify(document)&&nextName===name)return;
  undo.push(state());if(undo.length>80)undo.shift();redo=[];document=next;name=nextName;mark();
 }
 function perform(action,selectId=null){
  try{const next=command(document,action);recordChange(next);if(selectId)selected=selectId;if(selected&&!locate(document.nodes,selected))selected=null;render()}
  catch(e){setStatus(e.message)}
 }
 function historyStep(from,to){if(!from.length)return;to.push(state());applyState(from.pop());mark();render()}
 async function save(){
  if(saving||disposed||!dirty||conflicted)return;
  clearTimeout(timer);saving=true;saveButton.disabled=true;setStatus('Saving private revision…');
  const snapshot=state();
  try{
   const saved=await request(session,record.id,'PUT',{name:snapshot.name,revision,document:snapshot.document});
   revision=saved.revision;record.savedAt=saved.savedAt;
   dirty=JSON.stringify(snapshot)!==JSON.stringify(state());
   setStatus(dirty?'New changes waiting to save':'Saved revision '+revision+' · '+new Date(saved.savedAt).toLocaleTimeString());
   if(dirty&&auto)timer=setTimeout(()=>save(),1800);
  }catch(e){conflicted=/newer revision/i.test(e.message);setStatus(e.message+' · Changes remain unsaved.');}
  finally{saving=false;saveButton.disabled=false}
 }
 function beforeUnload(e){if(dirty||saving){e.preventDefault();e.returnValue=''}}
 function dispose(){disposed=true;clearTimeout(timer);window.removeEventListener('beforeunload',beforeUnload)}
 window.addEventListener('beforeunload',beforeUnload);
 registerGuard(()=>{
  if(saving){setStatus('Save is in progress.');return false}
  if(dirty&&!confirm('Leave with unsaved changes?'))return false;
  dispose();return true;
 });
 root.replaceChildren();
 const shell=el('div','','atelier-editor');
 const top=el('div','','atelier-editor-top');
 const nameField=field('Document name','text',name,v=>{if(!v.trim()){nameField.input.value=name;return}recordChange(document,v.trim());render()});const nameInput=nameField.input;nameInput.maxLength=200;
 const status=el('p','Saved revision '+revision,'status');status.setAttribute('role','status');
 const mode=field('Mode','select',route,v=>{route=v;render();setStatus(dirty?'Unsaved changes · same document':'Saved revision '+revision)},[['editor','Canvas'],['compose','Compose']]);
 const breakpoint=field('Device','select',device,v=>{device=v;render()},[['desktop','Desktop · 1440'],['tablet','Tablet · 768'],['mobile','Mobile · 390']]);
 const zoomControl=field('Zoom','select','50',v=>{zoom=Number(v);render()},[['100','100%'],['75','75%'],['50','50%'],['25','25%']]);
 const undoButton=button('Undo',()=>historyStep(undo,redo),true),redoButton=button('Redo',()=>historyStep(redo,undo),true);
 const previewButton=button('Preview',()=>{preview=!preview;render()},true);
 const saveButton=button('Save draft',save);
 const autoField=field('Autosave','checkbox',false,v=>{auto=v;if(v&&dirty&&!conflicted)timer=setTimeout(()=>save(),1800);else clearTimeout(timer)});
 top.append(nameField.wrap,mode.wrap,breakpoint.wrap,zoomControl.wrap,undoButton,redoButton,previewButton,saveButton,autoField.wrap,button('History',()=>historyPanel(shell,{id:record.id},session,navigate,v=>{recordChange(validateDocument(v.document),v.name);nameInput.value=name;selected=null;render()}),true));
 const body=el('div','','atelier-editor-body'),left=el('aside','','atelier-editor-left'),center=el('main','','atelier-editor-center'),right=el('aside','','atelier-editor-right');
 const workspace=el('div','','atelier-canvas-viewport');center.append(workspace);body.append(left,center,right);shell.append(top,status,body);root.append(shell);
 function render(){
  undoButton.disabled=!undo.length;redoButton.disabled=!redo.length;previewButton.textContent=preview?'Edit':'Preview';
  body.classList.toggle('atelier-preview-mode',preview);body.classList.toggle('atelier-compose-mode',route==='compose');
  left.hidden=preview;right.hidden=preview;
  renderLeft();renderCanvas();renderInspector();
 }
 function renderLeft(){
  left.replaceChildren();
  const tabs=el('div','','atelier-panel-tabs');
  for(const [key,label] of [['layers','Layers'],['insert','Insert'],['assets','Assets'],['styles','Styles'],['plugins','Plugins']]){
   const b=button(label,()=>{rail=key;renderLeft()},true);if(rail===key)b.setAttribute('aria-pressed','true');tabs.append(b)
  }left.append(tabs);
  if(rail==='layers'){
   left.append(el('h3','Document layers'));
   const rootDrop=el('div','Drop here to move to document root','atelier-root-drop');
   rootDrop.addEventListener('dragover',e=>{if(dragged)e.preventDefault()});
   rootDrop.addEventListener('drop',e=>{e.preventDefault();if(dragged){const id=dragged;dragged=null;perform({type:'reparent',id,destination:null,placement:'inside'},id)}});left.append(rootDrop);
   if(!document.nodes.length)left.append(note('Use Insert to add your first element.'));
   function layers(nodes,parent,depth=0){
    for(const n of nodes){
     const row=el('div','','atelier-layer-row');
     const b=button((n.hidden?'○ ':n.locked?'🔒 ':'')+n.name,()=>{selected=n.id;render()},true);b.style.paddingLeft=(10+depth*12)+'px';
     if(selected===n.id)b.setAttribute('aria-current','true');
     b.draggable=!n.locked;
     b.addEventListener('dragstart',e=>{dragged=n.id;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',n.id)});
     b.addEventListener('dragend',()=>{dragged=null});
     b.addEventListener('dragover',e=>{if(dragged&&dragged!==n.id)e.preventDefault()});
     b.addEventListener('drop',e=>{e.preventDefault();e.stopPropagation();if(dragged&&dragged!==n.id){const id=dragged;dragged=null;perform({type:'reparent',id,destination:n.id,placement:containers.has(n.type)&&!e.shiftKey?'inside':'before'},id)}});
     row.append(b);parent.append(row);if(n.children.length)layers(n.children,parent,depth+1)
    }
   }layers(document.nodes,left);
   left.append(el('p','Drag onto a container to nest; hold Shift to insert before it.','muted'));
   if(selected){
    const row=el('div','','actions');
    for(const [label,type,extra] of [['↑','move',{delta:-1}],['↓','move',{delta:1}],['Duplicate','duplicate',{prefix:uid()}],['Hide / show','hide',{}],['Lock / unlock','lock',{}],['Delete','remove',{}]]){
     row.append(button(label,()=>{if(type==='remove'&&!confirm('Delete the selected layer and its children?'))return;perform({type,id:selected,...extra})},true))
    }left.append(row);
   }
  }else if(rail==='insert'){
   left.append(el('h3','Insert elements'),el('p','Select a container to insert inside it, or insert at the document root.','muted'));
   for(const type of types){left.append(button(nodeLabels[type],()=>{
    const target=selected?locate(document.nodes,selected):null;
    const parent=target&&containers.has(target.node.type)?target.node.id:null;
    const newId=uid();perform({type:'insert',parent,nodeType:type,newId},newId);
   },true))}
  }else if(rail==='assets'){
   left.append(el('h3','Bundled assets'),note('Media uploads and video/audio asset ingestion are not yet enabled.'));
   for(const asset of assets)left.append(button(asset.name,()=>{
    const node=selected?locate(document.nodes,selected)?.node:null;
    if(node?.type==='image')perform({type:'property',id:selected,key:'assetId',value:asset.id});
    else setStatus('Select an image layer before assigning an asset.');
   },true));
  }else if(rail==='styles'){left.append(note('Local node styles and responsive overrides are available in the inspector. Shared tokens and components are the next build.'),button('Design system',()=>navigate('design'),true))}
  else left.append(note('Plugin commands will use this validated document model. External plugin code is not enabled.'),button('Plugin library',()=>navigate('plugins'),true));
 }
 function renderCanvas(){
  workspace.replaceChildren();
  const caption=el('p',(route==='compose'?'Compose':device[0].toUpperCase()+device.slice(1))+' · '+zoom+'% · private preview','atelier-canvas-label');
  const canvas=el('div','','atelier-artboard device-'+device);
  canvas.style.width=(device==='desktop'?1440:device==='tablet'?768:390)+'px';
  canvas.style.zoom=String(zoom/100);
  canvas.style.maxWidth='none';
  function renderNode(n,parent){
   if(n.hidden)return;
   const s=resolveStyle(n,device),wrap=el('div','','atelier-node node-'+n.type);
   wrap.dataset.node=n.id;
   if(!preview){wrap.tabIndex=0;wrap.setAttribute('aria-label',n.name);wrap.addEventListener('click',e=>{e.stopPropagation();selected=n.id;render()});wrap.addEventListener('keydown',e=>{if(e.key==='Enter'){e.stopPropagation();selected=n.id;render()}});if(n.id===selected)wrap.classList.add('selected')}
   Object.assign(wrap.style,{width:s.width+'%',minHeight:s.minHeight+'px',padding:s.padding+'px',backgroundColor:s.background,color:s.color,fontSize:s.fontSize+'px',textAlign:s.align,borderRadius:s.radius+'px',opacity:String(s.opacity),position:s.position==='absolute'?'absolute':'relative'});
   if(s.position==='absolute'){wrap.style.left=s.x+'%';wrap.style.top=s.y+'%'}
   if(containers.has(n.type)){
    wrap.style.display=s.layout==='grid'?'grid':s.layout==='free'?'block':'flex';wrap.style.gap=s.gap+'px';
    if(s.layout==='grid')wrap.style.gridTemplateColumns='repeat('+s.columns+',minmax(0,1fr))';
    if(s.layout!=='grid'&&s.layout!=='free')wrap.style.flexDirection=s.layout==='horizontal'?'row':'column';
    if(!n.children.length&&!preview)wrap.append(el('span','Empty '+n.type,'muted'));
    n.children.forEach(child=>renderNode(child,wrap));
   }else if(n.type==='image'){
    const a=assets.find(x=>x.id===n.assetId);
    if(a){const img=el('img');img.src=a.url;img.alt=n.alt;img.loading='lazy';wrap.append(img)}
    else wrap.append(el('p','Image · select bundled asset','atelier-media-placeholder'));
   }else if(n.type==='list'){const list=el('ul');n.text.split('\n').filter(Boolean).forEach(t=>list.append(el('li',t)));wrap.append(list)}
   else if(n.type==='video'||n.type==='audio')wrap.append(el('p',n.text,'atelier-media-placeholder'));
   else if(n.type==='button'){wrap.append(el('span',n.text,'atelier-design-button'))}
   else if(!['shape','divider'].includes(n.type))wrap.append(el(n.type==='heading'?'h2':n.type==='quote'?'blockquote':'p',n.text));
   parent.append(wrap);
  }
  if(!document.nodes.length)canvas.append(el('p','Your blank canvas. Insert an element to begin.','atelier-empty-canvas'));
  document.nodes.forEach(n=>renderNode(n,canvas));
  workspace.append(caption,canvas);
 }
 function renderInspector(){
  right.replaceChildren();const item=selected?locate(document.nodes,selected):null;
  if(!item){right.append(el('h3','Inspector'),note('Select a layer to edit its properties.'));return}
  const n=item.node;
  right.append(el('h3',n.name),el('p',nodeLabels[n.type]+' · '+device,'muted'));
  const disabled=n.locked||item.ancestorLocked;
  if(disabled)right.append(note('Layer or ancestor is locked.'));
  function add(label,key,type,value,choices=[],style=false){
   const f=field(label,type,value,v=>perform({type:style?'style':'property',id:n.id,key,value:type==='number'?Number(v):v,...(style?{device}:{})}),choices);
   if(type==='number')f.input.step=key==='opacity'?'0.05':'1';
   f.input.disabled=disabled;right.append(f.wrap);
  }
  add('Layer name','name','text',n.name);
  if(['heading','paragraph','quote','list','button','video','audio'].includes(n.type)){
   const w=el('label','','field'),input=el('textarea');input.value=n.text;input.maxLength=8000;input.disabled=disabled;
   input.addEventListener('change',()=>perform({type:'property',id:n.id,key:'text',value:input.value}));
   w.append(el('span','Content'),input);right.append(w);
  }
  if(n.type==='image'){
   add('Alternative text','alt','text',n.alt);
   const f=field('Asset','select',n.assetId||'',v=>perform({type:'property',id:n.id,key:'assetId',value:v||null}),[['','None'],...assets.map(a=>[a.id,a.name])]);f.input.disabled=disabled;right.append(f.wrap);
  }
  const s=resolveStyle(n,device);
  const toggle=field('Advanced properties','checkbox',advanced,v=>{advanced=v;renderInspector()});right.append(toggle.wrap);
  if(containers.has(n.type)){add('Layout','layout','select',s.layout,['vertical','horizontal','grid','free'].map(x=>[x,x]),true);add('Gap','gap','number',s.gap,[],true);if(s.layout==='grid')add('Columns','columns','number',s.columns,[],true)}
  add('Width (%)','width','number',s.width,[],true);
  add('Padding (px)','padding','number',s.padding,[],true);
  add('Background','background','color',s.background,[],true);
  add('Text color','color','color',s.color,[],true);
  add('Font size','fontSize','number',s.fontSize,[],true);
  add('Alignment','align','select',s.align,['left','center','right'].map(x=>[x,x]),true);
  if(advanced){
   add('Minimum height','minHeight','number',s.minHeight,[],true);add('Radius','radius','number',s.radius,[],true);add('Opacity (0–1)','opacity','number',s.opacity,[],true);
   add('Position','position','select',s.position,[['flow','In flow'],['absolute','Absolute']],true);
   if(s.position==='absolute'){add('X (%)','x','number',s.x,[],true);add('Y (%)','y','number',s.y,[],true)}
  }
  if(device!=='desktop')right.append(button('Reset breakpoint overrides',()=>perform({type:'resetOverride',id:n.id,device}),true));
 }
 shell.addEventListener('keydown',e=>{
  if(!(e.ctrlKey||e.metaKey)||e.altKey)return;
  if(e.key.toLowerCase()==='s'){e.preventDefault();save();return}
  if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;
  if(e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?historyStep(redo,undo):historyStep(undo,redo)}
  if(e.key.toLowerCase()==='y'){e.preventDefault();historyStep(redo,undo)}
 });
 render();
}
