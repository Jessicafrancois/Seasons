import test from 'node:test';
import assert from 'node:assert/strict';
import {createNode,validateDocument} from '../private/studio/atelier/model.js';
import {defaultMotion} from '../private/studio/atelier/motion.js';
import {pluginSettings,registry} from '../private/studio/atelier/plugin-registry.js';
import {changedPluginEffects} from '../server/studio-atelier.js';

test('legacy revisions migrate on read without modifying the source snapshot',()=>{
 const existing={schemaVersion:1,nodes:[{...createNode('heading','title'),motion:defaultMotion('rise','hover')}]};
 const snapshot=structuredClone(existing);
 const upgraded=validateDocument(existing);
 assert.equal(upgraded.schemaVersion,2);
 assert.equal(upgraded.nodes[0].motion.pluginId,'interactive-motion');
 assert.deepEqual(validateDocument(upgraded),upgraded);
 assert.deepEqual(existing,snapshot);
 assert.throws(()=>validateDocument({...existing,schemaVersion:99}));
 assert.throws(()=>validateDocument({...existing,schemaVersion:2}));
});

test('plugin manifests and configuration bound the declarative motion capability',()=>{
 assert.equal(new Set(registry.map(plugin=>plugin.id)).size,3);
 assert.ok(registry.every(plugin=>plugin.capability==='motion'&&plugin.contractVersion===1));
 assert.deepEqual(pluginSettings({enabled:false,duration:1250}),{enabled:false,duration:1250});
 assert.throws(()=>pluginSettings({enabled:true,duration:10001}));
 assert.throws(()=>pluginSettings({enabled:'true',duration:800}));
 assert.throws(()=>pluginSettings({enabled:true,duration:800,code:'script'}));
 const node={...createNode('heading','title'),motion:{...defaultMotion('rise'),pluginId:'cinematic-transitions'}};
 assert.throws(()=>validateDocument({schemaVersion:2,nodes:[node]}),/plugin or preset/);
});

test('trusted mutation comparison preserves unchanged dependencies and rejects locked effect edits',()=>{
 const prior=validateDocument({schemaVersion:1,nodes:[{...createNode('heading','title'),motion:defaultMotion()}]});
 const next=structuredClone(prior);
 next.nodes[0].name='Renamed';
 assert.deepEqual([...changedPluginEffects(prior,next)],[]);
 next.nodes[0].motion.duration=1250;
 assert.deepEqual([...changedPluginEffects(prior,next)],['motion-effects']);
 prior.nodes[0].locked=true;
 assert.throws(()=>changedPluginEffects(prior,next),/locked/);
});
