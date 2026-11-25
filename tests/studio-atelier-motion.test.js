import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultMotion,validateMotion,motionFrames,motionOptions,presets} from '../private/studio/atelier/motion.js';
import {emptyDocument,command,validateDocument} from '../private/studio/atelier/model.js';
test('motion presets are bounded and persist with document commands',()=>{
 let d=command(emptyDocument(),{type:'insert',nodeType:'heading',newId:'a'});
 const before=structuredClone(d);
 d=command(d,{type:'motion',id:'a',value:defaultMotion('rise')});
 assert.deepEqual(d.nodes[0].motion,{...defaultMotion('rise'),pluginId:'motion-effects'});
 assert.deepEqual(validateDocument(d),d);
 assert.deepEqual(command(d,{type:'motion',id:'a',value:null}),before);
 assert.throws(()=>validateMotion({...defaultMotion(),duration:0}));
 assert.throws(()=>validateMotion({...defaultMotion(),preset:'arbitrary-script'}));
 assert.throws(()=>validateMotion({...defaultMotion(),extra:'anything'}));
 for(const key of Object.keys(presets)){const m=defaultMotion(key);assert.ok(motionFrames(m).length>=2);assert.equal(motionOptions(m).duration,800);}
});
test('motion preserves node opacity and respects lock commands',()=>{
 assert.equal(motionFrames(defaultMotion('rise'),.35).at(-1).opacity,.35);
 let d=command(emptyDocument(),{type:'insert',nodeType:'shape',newId:'a'});
 d=command(d,{type:'lock',id:'a'});
 assert.throws(()=>command(d,{type:'motion',id:'a',value:defaultMotion()}));
});
