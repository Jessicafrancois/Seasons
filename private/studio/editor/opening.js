import {el,section,note,button,field} from '../components/ui.js';

const defaults={rotation:8,tileSize:64,gap:4,duration:900,mode:'independent',solidColor:'#a4a99b',straightenOnZoom:true,fillViewport:true};

export function renderEditor(root, serverDraft){
 let state={...defaults,...serverDraft?.draft}, dirty=false;
 const layout=el('div','','editor-layout'),canvasPanel=section('Opening experience','Preview'),controlPanel=section('Properties','Draft');
 const canvas=el('div','','editor-canvas'),tiles=el('div','','grid-art');
 for(let i=0;i<80;i++){const tile=el('div');tile.dataset.index=String(i);tiles.append(tile);}
 canvas.append(tiles);canvasPanel.append(note('Editable settings preview. This is not yet the exact public opening renderer.'),canvas);
 const actions=el('div','','actions'),status=el('div','','status');status.setAttribute('role','status');
 const propertyInputs={};
 function updateState(key,value){state[key]=value;dirty=true;draw();status.textContent='Unsaved changes';}
 function addNumber(label,key,min,max,step=1){
 const wrapper=field(label,'range',state[key],value=>updateState(key,Number(value)));
 wrapper.input.min=String(min);wrapper.input.max=String(max);wrapper.input.step=String(step);controlPanel.append(wrapper.wrap);
 const info=el('div','','muted');info.id='value-'+key;controlPanel.append(info);propertyInputs[key]=info;
 }
 addNumber('Initial rotation','rotation',-20,20);
 addNumber('Tile size','tileSize',24,120,2);
 addNumber('Tile gap','gap',0,20);
 addNumber('Transition duration (ms)','duration',200,3000,100);
 const motion=field('Animation behavior','select',state.mode,v=>updateState('mode',v),[['independent','Independent blinking'],['sequence','Sequential'],['wave','Wave']]);controlPanel.append(motion.wrap);
 const color=field('Solid card color','color',state.solidColor,v=>updateState('solidColor',v));controlPanel.append(color.wrap);
 const straighten=field('Straighten on zoom','checkbox',state.straightenOnZoom,v=>updateState('straightenOnZoom',v));controlPanel.append(straighten.wrap);
 const fill=field('Fill viewport','checkbox',state.fillViewport,v=>updateState('fillViewport',v));controlPanel.append(fill.wrap);
 function draw(){
  tiles.style.transform='rotate('+state.rotation+'deg) scale('+(state.fillViewport?'1.15':'0.88')+')';
  tiles.style.gap=state.gap+'px';
  tiles.style.gridTemplateColumns='repeat(10,minmax(0,'+state.tileSize+'px))';
  for(const tile of tiles.children){const i=Number(tile.dataset.index);tile.style.background=i%6===0?'#5b6859':i%11===0?'#bba795':state.solidColor;tile.style.transitionDuration=state.duration+'ms';}
  for(const key of ['rotation','tileSize','gap','duration'])propertyInputs[key].textContent=String(state[key])+(key==='rotation'?'°':key==='duration'?' ms':' px');
 }
 async function save(){
  status.textContent='Saving draft…';
  try{
   const res=await fetch('/studio/api/draft',{method:'PUT',headers:{'Content-Type':'application/json','X-Seasons-Studio':'draft-editor'},body:JSON.stringify(state)});
   const result=await res.json();
   if(!res.ok)throw Error(result.error||'Save failed');
   dirty=false;status.textContent='Saved local draft · '+new Date(result.savedAt).toLocaleString();
  }catch(err){status.textContent=err.message+' · No public changes were made.';}
 }
 const saveButton=button('Save draft',save);
 saveButton.disabled=!serverDraft?.enabled;
 actions.append(saveButton,button('Reset preview',()=>{state={...defaults};dirty=true;root.replaceChildren();renderEditor(root,{enabled:serverDraft?.enabled,draft:state});},true));
 if(!serverDraft?.enabled)controlPanel.append(note('Local draft saving is disabled. You can still explore the controls. Set STUDIO_LOCAL_DRAFTS=true for local persistence.',true));
 controlPanel.append(actions,status);
 layout.append(canvasPanel,controlPanel);
 root.append(layout);
 const caption=el('p','No publishing actions are available in this stage. Production persistence requires a database-backed revision system.','muted');root.append(caption);
 draw();
}
