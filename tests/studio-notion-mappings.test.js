import test from 'node:test';
import assert from 'node:assert/strict';
import {availableMappings,validateMappings} from '../server/studio-notion-mappings.js';
test('mapping suggestions use live property IDs and reject unrelated or incompatible properties',()=>{
 const fields=availableMappings('records',[{id:'title',name:'Record',type:'title'},{id:'legal',name:'Legal / Clearance Notes',type:'rich_text'},{id:'wrong',name:'BPM',type:'rich_text'}]);
 assert.equal(fields.find(x=>x.destination==='title').propertyId,'title');
 assert.equal(fields.find(x=>x.destination==='concept').choices.length,0);
 assert.equal(fields.find(x=>x.destination==='bpm').enabled,false);
 const input=fields.map(f=>({destination:f.destination,propertyId:f.propertyId,enabled:f.enabled}));
 assert.equal(validateMappings(fields,input).find(f=>f.destination==='title').direction,'notion_to_studio');
 input.find(f=>f.destination==='concept').propertyId='legal';
 assert.equal(validateMappings(fields,input),null);
});
test('stale mappings fail closed and publication eligibility is server-defined',()=>{
 const fields=availableMappings('opening',[{id:'color',name:'Tile Color',type:'rich_text'}],[{destination:'solidColor',propertyId:'old',enabled:true}]);
 assert.equal(fields.find(f=>f.destination==='solidColor').enabled,false);
 assert.equal(fields.find(f=>f.destination==='solidColor').stale,true);
 const input=fields.map(f=>({destination:f.destination,propertyId:f.propertyId,enabled:f.enabled,visibility:'public',direction:'two_way'}));
 assert.equal(validateMappings(fields,input).find(f=>f.destination==='solidColor').visibility,'review');
});
