import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyDocument,command,validateDocument,locate,resolveStyle,seedFromFields} from '../private/studio/atelier/model.js';
test('insert nested nodes, responsive overrides and duplicate produce valid stable identities',()=>{
 let d=emptyDocument();
 d=command(d,{type:'insert',nodeType:'stack',newId:'a'});
 d=command(d,{type:'insert',parent:'a',nodeType:'heading',newId:'b'});
 d=command(d,{type:'style',id:'b',device:'mobile',key:'fontSize',value:24});
 assert.equal(resolveStyle(locate(d.nodes,'b').node,'mobile').fontSize,24);
 assert.equal(resolveStyle(locate(d.nodes,'b').node,'desktop').fontSize,40);
 d=command(d,{type:'duplicate',id:'a',prefix:'copy'});
 assert.equal(d.nodes.length,2);
 assert.notEqual(d.nodes[0].children[0].id,d.nodes[1].children[0].id);
 assert.deepEqual(validateDocument(d),d);
});
test('reject unknown fields, unsafe assets, invalid style and locked ancestors',()=>{
 let d=command(emptyDocument(),{type:'insert',nodeType:'frame',newId:'f'});
 d=command(d,{type:'insert',parent:'f',nodeType:'image',newId:'i'});
 assert.throws(()=>command(d,{type:'property',id:'i',key:'assetId',value:'https://outside.example'}));
 assert.throws(()=>command(d,{type:'style',id:'i',device:'mobile',key:'width',value:999}));
 d=command(d,{type:'lock',id:'f'});
 assert.throws(()=>command(d,{type:'remove',id:'i'}));
 assert.throws(()=>validateDocument({...d,rawHtml:'<script>'}));
});
test('seed is explicit structured content copy',()=>{
 const d=seedFromFields([{key:'title',label:'Title'},{key:'quote',label:'Quote'}],{title:'Fall',quote:'Time'});
 assert.equal(d.nodes[0].type,'heading');assert.equal(d.nodes[1].type,'quote');
});
