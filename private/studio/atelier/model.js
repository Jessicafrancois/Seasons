// Versioned, deterministic document model shared by editor and server.
import {validateMotion} from './motion.js';
export const kinds=['page','section','component','editorial','experience','scene','moodboard','storyboard','experiment'];
export const types=['frame','stack','grid','heading','paragraph','quote','list','image','video','audio','button','shape','divider'];
export const containers=new Set(['frame','stack','grid']);
export const devices=['desktop','tablet','mobile'];
const color=v=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v);
const num=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const str=(v,max)=>typeof v==='string'&&v.length<=max;
const obj=v=>v&&typeof v==='object'&&!Array.isArray(v);
const idOk=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(v);
export const assets=[{id:'fall-forest',name:'Fall forest · bundled image',url:'/seasons/fall/forest.jpeg'}];
export const styleDefaults={layout:'vertical',gap:16,padding:20,width:100,minHeight:0,columns:2,background:'#ffffff',color:'#29382d',fontSize:18,align:'left',radius:0,opacity:1,position:'flow',x:0,y:0};
const styleRules={
 layout:v=>['vertical','horizontal','grid','free'].includes(v),gap:v=>num(v,0,120),padding:v=>num(v,0,160),width:v=>num(v,10,100),minHeight:v=>num(v,0,1600),columns:v=>Number.isInteger(v)&&num(v,1,6),
 background:color,color,fontSize:v=>num(v,8,120),align:v=>['left','center','right'].includes(v),radius:v=>num(v,0,160),opacity:v=>num(v,0,1),
 position:v=>['flow','absolute'].includes(v),x:v=>num(v,0,100),y:v=>num(v,0,100)
};
function fail(message){throw Error('Invalid '+message)}
function exact(value,keys,label){if(!obj(value)||Object.keys(value).some(k=>!keys.includes(k)))fail(label)}
function cleanStyle(s,complete=false){exact(s,Object.keys(styleRules),'style');const result={};for(const [key,value] of Object.entries(s)){if(!styleRules[key](value))fail(key);result[key]=value}return complete?{...styleDefaults,...result}:result}
export function validateDocument(value){
 exact(value,['schemaVersion','nodes'],'document');
 if(value.schemaVersion!==1||!Array.isArray(value.nodes))fail('document version or nodes');
 const ids=new Set();let count=0;
 function visit(node,depth){
  if(++count>150||depth>10)fail('document size or nesting');
  exact(node,['id','type','name','text','assetId','alt','hidden','locked','style','overrides','children','motion'],'node');
  if(!idOk(node.id)||ids.has(node.id)||!types.includes(node.type)||!str(node.name,100)||!node.name.trim()||!str(node.text,8000)||!str(node.alt,500)||typeof node.hidden!=='boolean'||typeof node.locked!=='boolean')fail('node fields');
  ids.add(node.id);
  if(node.assetId!==null&&!(node.type==='image'&&assets.some(a=>a.id===node.assetId)))fail('asset reference');
  exact(node.overrides,['tablet','mobile'],'responsive overrides');
  const overrides={};for(const [key,s] of Object.entries(node.overrides))overrides[key]=cleanStyle(s);
  if(!Array.isArray(node.children)||(!containers.has(node.type)&&node.children.length))fail('children');
  return {id:node.id,type:node.type,name:node.name,text:node.text,assetId:node.assetId,alt:node.alt,hidden:node.hidden,locked:node.locked,style:cleanStyle(node.style,true),overrides,...(node.motion==null?{}:{motion:validateMotion(node.motion)}),children:node.children.map(n=>visit(n,depth+1))};
 }
 const result={schemaVersion:1,nodes:value.nodes.map(n=>visit(n,0))};
 if(new TextEncoder().encode(JSON.stringify(result)).length>220000)fail('document byte size');
 return result;
}
export function createNode(type,id){
 if(!types.includes(type)||!idOk(id))fail('node type');
 const label=type[0].toUpperCase()+type.slice(1);
 const text={heading:'Heading',paragraph:'Write something here.',quote:'Your quote',list:'First item\nSecond item',button:'Explore',video:'Choose a video asset when Media Library is enabled',audio:'Choose an audio asset when Media Library is enabled'}[type]||'';
 return {id,type,name:label,text,assetId:null,alt:'',hidden:false,locked:false,style:{...styleDefaults,...(type==='heading'?{fontSize:40}:type==='quote'?{fontSize:24}:type==='grid'?{layout:'grid'}:type==='frame'?{layout:'free',minHeight:240}:type==='shape'?{background:'#a4a99b',minHeight:100}:type==='image'?{minHeight:160}:['video','audio'].includes(type)?{minHeight:100}:type==='button'?{background:'#29382d',color:'#ffffff',radius:6,fontSize:16,padding:12}:type==='divider'?{minHeight:1,padding:0,background:'#d9dfd5'}:{})},overrides:{},children:[]};
}
export function locate(nodes,id,ancestorLocked=false){
 for(let i=0;i<nodes.length;i++){
  const node=nodes[i];if(node.id===id)return {node,siblings:nodes,index:i,ancestorLocked};
  const child=locate(node.children,id,ancestorLocked||node.locked);if(child)return child;
 }return null;
}
export function resolveStyle(node,device){return {...node.style,...(device==='tablet'||device==='mobile'?node.overrides[device]:{})}}
export function command(document,action){
 const next=structuredClone(document);
 const target=action.id?locate(next.nodes,action.id):null;
 if(action.type==='insert'){
  const parent=action.parent?locate(next.nodes,action.parent):null;
  if(action.parent&&(!parent||!containers.has(parent.node.type)||parent.node.locked||parent.ancestorLocked))fail('insert parent');
  (parent?parent.node.children:next.nodes).push(createNode(action.nodeType,action.newId));
 }else{
  if(!target||target.ancestorLocked||(target.node.locked&&action.type!=='lock'))fail('locked or unknown node');
  const {node,siblings,index}=target;
  if(action.type==='reparent'){
   if(action.destination===node.id)return document;
   if(action.destination&&locate(node.children,action.destination))fail('cyclic move');
   const dest=action.destination?locate(next.nodes,action.destination):null;
   if(action.destination&&(!dest||dest.node.locked||dest.ancestorLocked))fail('move destination');
   if(action.placement==='inside'&&dest&&!containers.has(dest.node.type))fail('move container');
   if(!['inside','before'].includes(action.placement))fail('move placement');
   siblings.splice(index,1);
   const relocated=action.destination?locate(next.nodes,action.destination):null;
   if(!relocated)next.nodes.push(node);
   else if(action.placement==='inside')relocated.node.children.push(node);
   else relocated.siblings.splice(relocated.index,0,node);
  }
  else if(action.type==='remove')siblings.splice(index,1);
  else if(action.type==='move'){const dest=index+action.delta;if(![-1,1].includes(action.delta)||dest<0||dest>=siblings.length)return document;[siblings[index],siblings[dest]]=[siblings[dest],siblings[index]]}
  else if(action.type==='duplicate'){
   const copy=structuredClone(node);let indexId=0;
   function rekey(n){n.id=action.prefix+'-'+indexId++;n.children.forEach(rekey)}rekey(copy);copy.name=(copy.name+' copy').slice(0,100);siblings.splice(index+1,0,copy);
  }else if(action.type==='lock')node.locked=!node.locked;
  else if(action.type==='hide')node.hidden=!node.hidden;
  else if(action.type==='property'){
   if(!['name','text','assetId','alt'].includes(action.key))fail('property');
   node[action.key]=action.value;
  }else if(action.type==='motion'){
   const motion=validateMotion(action.value);if(motion===null)delete node.motion;else node.motion=motion;
  }else if(action.type==='style'){
   if(!devices.includes(action.device)||!Object.hasOwn(styleRules,action.key)||!styleRules[action.key](action.value))fail('style command');
   if(action.device==='desktop')node.style[action.key]=action.value;
   else (node.overrides[action.device]??={})[action.key]=action.value;
  }else if(action.type==='resetOverride'){
   if(!['tablet','mobile'].includes(action.device))fail('breakpoint');
   delete node.overrides[action.device];
  }else fail('command');
 }
 return validateDocument(next);
}
export const emptyDocument=()=>({schemaVersion:1,nodes:[]});
export function seedFromFields(fields,values){
 const nodes=[];let n=0;
 for(const f of fields){
  if(typeof values[f.key]!=='string'||!values[f.key].trim())continue;
  const node=createNode(f.key==='title'?'heading':f.key==='quote'?'quote':'paragraph','seed-'+(++n));node.name=f.label;node.text=values[f.key].slice(0,8000);nodes.push(node);
 }
 return validateDocument({schemaVersion:1,nodes});
}
