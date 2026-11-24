import test from 'node:test';
import assert from 'node:assert/strict';
import {creativeGroups,atelierGroups,allCreativeRoutes,currentEditorRoutes} from '../private/studio/components/creative-navigation.js';
test('creative and atelier navigation share stable canonical route keys',()=>{
 const keys=creativeGroups.flatMap(g=>g.items.map(i=>i.key));
 assert.equal(new Set(keys).size,keys.length);
 for(const g of atelierGroups)for(const item of g.items)assert.ok(allCreativeRoutes[item.key]);
 for(const key of currentEditorRoutes)assert.ok(allCreativeRoutes[key]);
 for(const key of ['media','design','components','templates','plugins','installed-plugins','developer-studio'])assert.ok(keys.includes(key));
 assert.equal(allCreativeRoutes['video-composition'].stage,'planned');
 assert.equal(allCreativeRoutes.editor.stage,'foundation');
});
