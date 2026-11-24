import {el,section,button,note,field,table} from '../components/ui.js';
import {kinds,types,containers,devices,assets,createNode,locate,command,resolveStyle,validateDocument} from './model.js';
const endpoint='/studio/api/atelier/';
const labels={page:'Page',section:'Section',component:'Component',editorial:'Editorial document',experience:'Experience',scene:'Scene',moodboard:'Moodboard',storyboard:'Storyboard',experiment:'Experiment'};
const nodeLabels={frame:'Frame',stack:'Stack',grid:'Grid',heading:'Heading',paragraph:'Paragraph',quote:'Quote',list:'List',image:'Image',video:'Video placeholder',audio:'Audio placeholder',button:'Button',shape:'Shape',divider:'Divider'};
function options(values){return values.map(v=>[v,labels[v]||v])}
function uid(){return crypto.randomUUID()}
const glyphs={home:'M3 10l9-7 9 7v10h-6v-7H9v7H3z',insert:'M12 5v14M5 12h14',layers:'M3 8l9-5 9 5-9 5-9-5z M3 12l9 5 9-5 M3 16l9 5 9-5',assets:'M3 4h18v16H3z M3 16l5-5 4 4 3-3 6 6 M15 8h1',styles:'M12 3l9 9-9 9-9-9z',plugins:'M4 4h6v5h4V4h6v6h-5v4h5v6h-6v-5h-4v5H4v-6h5v-4H4z',undo:'M9 5l-5 5 5 5 M4 10h10a5 5 0 0 1 0 10',redo:'M15 5l5 5-5 5 M20 10H10a5 5 0 0 0 0 10',panel:'M3 4h18v16H3z M15 4v16',hand:'M8 13V6a2 2 0 0 1 4 0v5-7a2 2 0 0 1 4 0v9-3a2 2 0 0 1 4 0v5a6 6 0 0 1-6 6h-2l-7-7a2 2 0 0 1 3-2'};
function iconButton(label,key,action){const b=button('',action,true);b.classList.add('atelier-icon-button');b.title=label;b.setAttribute('aria-label',label);const svg=window.document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');const p=window.document.createElementNS(svg.namespaceURI,'path');p.setAttribute('d',glyphs[key]);p.setAttribute('fill','none');p.setAttribute('stroke','currentColor');p.setAttribute('stroke-width','1.5');p.setAttribute('stroke-linecap','round');p.setAttribute('stroke-linejoin','round');svg.append(p);b.append(svg);return b;}
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
 let undo=[],redo=[],dragged=null,insertDrag=null,showLeft=true,showRight=true,hand=false,fit=true,gesture=null,inline=null;
 const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
 function finishInline(){if(inline){const commit=inline;inline=null;commit()}}
 function selectLayer(id){finishInline();selected=id;renderLeft();renderInspector();for(const node of workspace.querySelectorAll('.atelier-node')){node.classList.toggle('selected',node.dataset.node===id);node.querySelector(':scope > .atelier-selection-tools')?.remove();if(node.dataset.node===id)addHandles(node,locate(document.nodes,id));}}
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
 function dispose(){disposed=true;clearTimeout(timer);window.removeEventListener('beforeunload',beforeUnload);window.removeEventListener('resize',fitCanvas)}
 window.addEventListener('beforeunload',beforeUnload);
 registerGuard(()=>{
  finishInline();
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
 const zoomControl=field('Zoom','select','fit',v=>{fit=v==='fit';if(!fit)zoom=Number(v);render()},[['fit','Fit'],['100','100%'],['75','75%'],['50','50%'],['25','25%']]);
 const undoButton=iconButton('Undo','undo',()=>{finishInline();historyStep(undo,redo)}),redoButton=iconButton('Redo','redo',()=>{finishInline();historyStep(redo,undo)});
 const previewButton=button('Preview',()=>{finishInline();preview=!preview;render()},true);
 const saveButton=button('Save draft',()=>{finishInline();save()});
 const autoField=field('Autosave','checkbox',false,v=>{auto=v;if(v&&dirty&&!conflicted)timer=setTimeout(()=>save(),1800);else clearTimeout(timer)});
 const brand=button('seasons.',()=>navigate('atelier'),true);brand.className='atelier-wordmark';brand.title='Back to Atelier';
 const identity=el('div','','atelier-top-identity');identity.append(brand,el('span','Atelier /','atelier-crumb'),nameField.wrap);
 const modes=el('div','','atelier-mode-switch');const canvasMode=button('Canvas',()=>{finishInline();route='editor';render()},true),composeMode=button('Compose',()=>{finishInline();route='compose';render()},true);modes.append(canvasMode,composeMode,button('Experience',()=>navigate('experience'),true));
 const actions=el('div','','atelier-top-actions');actions.append(undoButton,redoButton,previewButton,saveButton);top.append(identity,modes,actions);
 const bar=el('div','','atelier-canvas-bar');const panButton=iconButton('Pan canvas','hand',()=>{hand=!hand;render()});
 bar.append(iconButton('Toggle layers panel','layers',()=>{showLeft=!showLeft;render()}),panButton,breakpoint.wrap,zoomControl.wrap,iconButton('Toggle inspector','panel',()=>{showRight=!showRight;render()}));
 const body=el('div','','atelier-editor-body'),railPanel=el('nav','','atelier-toolrail'),left=el('aside','','atelier-editor-left'),center=el('main','','atelier-editor-center'),right=el('aside','','atelier-editor-right');railPanel.setAttribute('aria-label','Editor tools');
 const workspace=el('div','','atelier-canvas-viewport');const footer=el('div','','atelier-editor-footer');footer.append(status,autoField.wrap,button('History',()=>historyPanel(shell,{id:record.id},session,navigate,v=>{recordChange(validateDocument(v.document),v.name);nameInput.value=name;selected=null;render()}),true));
 center.append(bar,workspace);body.append(railPanel,left,center,right);shell.append(top,body,footer);root.append(shell);
 function fitCanvas(){const canvas=workspace.querySelector('.atelier-artboard');if(!canvas)return;const width=device==='desktop'?1440:device==='tablet'?768:390;const factor=fit?clamp((workspace.clientWidth-64)/width,0.10,1):zoom/100;canvas.style.zoom=String(factor);const label=workspace.querySelector('.atelier-canvas-label');if(label)label.textContent=device[0].toUpperCase()+device.slice(1)+' · '+width+' px · '+Math.round(factor*100)+'%'}
 window.addEventListener('resize',fitCanvas);
 workspace.addEventListener('pointerdown',e=>{if(!hand||e.button!==0)return;e.preventDefault();const x=e.clientX,y=e.clientY,sl=workspace.scrollLeft,st=workspace.scrollTop;workspace.setPointerCapture(e.pointerId);const move=ev=>{workspace.scrollLeft=sl-(ev.clientX-x);workspace.scrollTop=st-(ev.clientY-y)};const end=()=>{workspace.removeEventListener('pointermove',move);workspace.removeEventListener('pointerup',end);workspace.removeEventListener('pointercancel',end)};workspace.addEventListener('pointermove',move);workspace.addEventListener('pointerup',end);workspace.addEventListener('pointercancel',end)});
 function render(){
  undoButton.disabled=!undo.length;redoButton.disabled=!redo.length;previewButton.textContent=preview?'Edit':'Preview';
  body.classList.toggle('atelier-preview-mode',preview);body.classList.toggle('atelier-compose-mode',route==='compose');
  left.hidden=preview||!showLeft;right.hidden=preview||!showRight;railPanel.hidden=preview;
  body.classList.toggle('left-closed',!showLeft);body.classList.toggle('right-closed',!showRight);workspace.classList.toggle('pan-mode',hand);
  canvasMode.setAttribute('aria-pressed',String(route==='editor'));composeMode.setAttribute('aria-pressed',String(route==='compose'));panButton.setAttribute('aria-pressed',String(hand));
  renderRail();renderLeft();renderCanvas();renderInspector();
 }
 function renderRail(){railPanel.replaceChildren(iconButton('Atelier home','home',()=>navigate('atelier')));for(const [key,label] of [['insert','Insert'],['layers','Layers'],['assets','Assets'],['styles','Styles'],['plugins','Plugins']]){const b=iconButton(label,key,()=>{finishInline();showLeft=rail===key?!showLeft:true;rail=key;render()});b.setAttribute('aria-pressed',String(rail===key&&showLeft));railPanel.append(b)}}
 function renderLeft(){left.replaceChildren();
  if(rail==='layers'){
   left.append(el('h3','Document layers'));
   const rootDrop=el('div','Drop here to move to document root','atelier-root-drop');
   rootDrop.addEventListener('dragover',e=>{if(dragged)e.preventDefault()});
   rootDrop.addEventListener('drop',e=>{e.preventDefault();if(dragged){const id=dragged;dragged=null;perform({type:'reparent',id,destination:null,placement:'inside'},id)}});left.append(rootDrop);
   if(!document.nodes.length)left.append(el('p','No layers yet. Add your first element or start with a private sample layout.','muted'),button('Insert elements',()=>{rail='insert';render()},true),button('Start with Fall layout',starter,true));
   function layers(nodes,parent,depth=0){
    for(const n of nodes){
     const row=el('div','','atelier-layer-row');
     const b=button((n.hidden?'○ ':n.locked?'🔒 ':'')+n.name,()=>selectLayer(n.id),true);b.style.paddingLeft=(10+depth*12)+'px';
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
   const gallery=el('div','','atelier-insert-grid');left.append(gallery);
   for(const [label,items] of [['Layout',['frame','stack','grid','divider']],['Text',['heading','paragraph','quote','list']],['Media',['image','video','audio']],['Elements',['button','shape']]]){gallery.append(el('h4',label));for(const type of items){const b=button(nodeLabels[type],()=>insertType(type),true);b.draggable=true;b.addEventListener('dragstart',e=>{insertDrag=type;e.dataTransfer.setData('text/plain',type);e.dataTransfer.effectAllowed='copy'});b.addEventListener('dragend',()=>{insertDrag=null});gallery.append(b)}}
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
 function insertType(type,parentOverride){const target=selected?locate(document.nodes,selected):null;const parent=parentOverride!==undefined?parentOverride:target&&containers.has(target.node.type)?target.node.id:null;const newId=uid();perform({type:'insert',parent,nodeType:type,newId},newId)}
 function starter(){if(document.nodes.length)return;const n=(type,name,text,style={},children=[])=>{const node=createNode(type,uid());return {...node,name,text,style:{...node.style,...style},children}};const cover=n('image','Cover photograph','',{padding:0,minHeight:0});cover.assetId='fall-forest';cover.alt='Forest in Fall';const draft={schemaVersion:1,nodes:[n('stack','Navigation','',{layout:'horizontal',padding:20,gap:20,background:'#f5f2e9'},[n('heading','Wordmark','seasons.',{fontSize:28,width:55,padding:0,background:'#f5f2e9'}),n('paragraph','Navigation links','Listen    Explore',{fontSize:16,width:40,align:'right',padding:8,background:'#f5f2e9'})]),cover,n('stack','Featured works','',{padding:35,gap:12,background:'#f5f2e9'},[n('paragraph','Section label','FEATURED WORKS',{fontSize:14,padding:0,align:'center',background:'#f5f2e9'}),n('heading','Featured title','A study in passing light',{fontSize:32,padding:0,align:'center',background:'#f5f2e9'}),n('paragraph','Description','A visual collection',{fontSize:17,align:'center',padding:0,background:'#f5f2e9'})])]};recordChange(validateDocument(draft));selected=cover.id;rail='layers';render()}
 function addHandles(wrap,item){if(preview||hand||!item||item.node.locked||item.ancestorLocked)return;const tools=el('div','','atelier-selection-tools');const tag=el('span',item.node.name,'atelier-selection-label');const move=el('button','Move','atelier-move-handle');move.type='button';move.title='Drag to move absolute layer';move.setAttribute('aria-label','Move selected layer');move.addEventListener('pointerdown',e=>startGesture(e,wrap,item,'move'));tools.append(tag,move);for(const edge of ['right','bottom','corner']){const h=el('button','','atelier-resize-handle handle-'+edge);h.type='button';h.setAttribute('aria-label','Resize '+edge);h.addEventListener('pointerdown',e=>startGesture(e,wrap,item,edge));tools.append(h)}wrap.append(tools)}
 function startGesture(e,wrap,item,kind){if(e.button!==0||gesture)return;e.stopPropagation();e.preventDefault();const n=item.node,s=resolveStyle(n,device),rect=wrap.parentElement.getBoundingClientRect(),nodeRect=wrap.getBoundingClientRect(),factor=Number(workspace.querySelector('.atelier-artboard').style.zoom)||1;const x=e.clientX,y=e.clientY,initialLeft=(nodeRect.left-rect.left)/rect.width*100,initialTop=(nodeRect.top-rect.top)/Math.max(rect.height,1)*100;const handle=e.currentTarget;let changes={};gesture=kind;handle.setPointerCapture(e.pointerId);const move=ev=>{const dx=ev.clientX-x,dy=ev.clientY-y;if(kind==='move'){changes={position:'absolute',x:clamp(Math.round(initialLeft+dx/rect.width*100),0,100),y:clamp(Math.round(initialTop+dy/Math.max(rect.height,1)*100),0,100)};Object.assign(wrap.style,{position:'absolute',left:changes.x+'%',top:changes.y+'%'})}else{if(kind==='right'||kind==='corner'){changes.width=clamp(Math.round(s.width+dx/rect.width*100),10,100);wrap.style.width=changes.width+'%'}if(kind==='bottom'||kind==='corner'){changes.minHeight=clamp(Math.round(nodeRect.height/factor+dy/factor),0,1600);wrap.style.minHeight=changes.minHeight+'px'}}};const cleanup=()=>{gesture=null;handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',end);handle.removeEventListener('pointercancel',cancel)};const end=()=>{cleanup();try{let next=document;for(const [key,value] of Object.entries(changes))next=command(next,{type:'style',id:n.id,device,key,value});recordChange(next);render()}catch(err){setStatus(err.message);render()}};const cancel=()=>{cleanup();render()};handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',end);handle.addEventListener('pointercancel',cancel)}
 function dropOn(e,parentId,dest=null){if(preview||hand||(!insertDrag&&!dragged))return;e.preventDefault();e.stopPropagation();if(insertDrag){const type=insertDrag;insertDrag=null;insertType(type,parentId)}else if(dragged){const id=dragged;dragged=null;perform({type:'reparent',id,destination:dest||parentId,placement:dest?'before':'inside'},id)}}
 function renderCanvas(){
  const scrollX=workspace.scrollLeft,scrollY=workspace.scrollTop;workspace.replaceChildren();
  const caption=el('p',(route==='compose'?'Compose':device[0].toUpperCase()+device.slice(1))+' · '+zoom+'% · private preview','atelier-canvas-label');
  const canvas=el('div','','atelier-artboard device-'+device);
  canvas.style.width=(device==='desktop'?1440:device==='tablet'?768:390)+'px';
  canvas.style.zoom=String(zoom/100);
  canvas.style.maxWidth='none';
  function renderNode(n,parent){
   if(n.hidden)return;
   const s=resolveStyle(n,device),wrap=el('div','','atelier-node node-'+n.type);
   wrap.dataset.node=n.id;
   if(!preview&&!hand){wrap.tabIndex=0;wrap.setAttribute('aria-label',n.name);wrap.addEventListener('click',e=>{e.stopPropagation();if(!e.target.isContentEditable&&!e.target.closest('.atelier-selection-tools'))selectLayer(n.id)});wrap.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.target.isContentEditable){e.stopPropagation();selectLayer(n.id)}});if(n.id===selected)wrap.classList.add('selected');wrap.addEventListener('dragover',e=>{if(insertDrag||dragged){e.preventDefault();e.stopPropagation()}});wrap.addEventListener('drop',e=>dropOn(e,containers.has(n.type)?n.id:null,containers.has(n.type)?null:n.id));}
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
   if(!preview&&!hand&&['heading','paragraph','quote','button'].includes(n.type)&&!n.locked&&!locate(document.nodes,n.id).ancestorLocked){const textNode=wrap.firstElementChild;textNode.addEventListener('dblclick',e=>{e.stopPropagation();finishInline();textNode.contentEditable='plaintext-only';textNode.classList.add('atelier-inline-edit');textNode.focus();let done=false;const commit=()=>{if(done)return;done=true;inline=null;textNode.contentEditable='false';textNode.classList.remove('atelier-inline-edit');try{recordChange(command(document,{type:'property',id:n.id,key:'text',value:textNode.innerText.slice(0,8000)}));renderLeft();renderInspector()}catch(err){setStatus(err.message)}};inline=commit;textNode.addEventListener('blur',commit,{once:true})})}
   if(n.id===selected)addHandles(wrap,locate(document.nodes,n.id));parent.append(wrap);
  }
  if(!document.nodes.length){const empty=el('div','','atelier-empty-canvas');empty.append(el('h2','Make something.'),el('p','Drag an element here, or start with a layout.'));if(!preview)empty.append(button('Add elements',()=>{rail='insert';showLeft=true;render()},true),button('Start with Fall layout',starter));canvas.append(empty)}
  document.nodes.forEach(n=>renderNode(n,canvas));
  canvas.addEventListener('click',e=>{if(e.target===canvas&&!preview)selectLayer(null)});canvas.addEventListener('dragover',e=>{if(insertDrag||dragged)e.preventDefault()});canvas.addEventListener('drop',e=>dropOn(e,null));workspace.append(caption,canvas);fitCanvas();workspace.scrollLeft=scrollX;workspace.scrollTop=scrollY;
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
  right.append(el('h4','Content'));add('Layer name','name','text',n.name);
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
  right.append(el('h4','Layout'));if(containers.has(n.type)){add('Layout','layout','select',s.layout,['vertical','horizontal','grid','free'].map(x=>[x,x]),true);add('Gap','gap','number',s.gap,[],true);if(s.layout==='grid')add('Columns','columns','number',s.columns,[],true)}
  add('Width (%)','width','number',s.width,[],true);
  add('Padding (px)','padding','number',s.padding,[],true);
  right.append(el('h4','Appearance'));add('Background','background','color',s.background,[],true);
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
  if(e.key.toLowerCase()==='s'){e.preventDefault();finishInline();save();return}
  if(e.target.isContentEditable)return;
  if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;
  if(e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?historyStep(redo,undo):historyStep(undo,redo)}
  if(e.key.toLowerCase()==='y'){e.preventDefault();historyStep(redo,undo)}
 });
 render();
}
