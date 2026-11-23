import test from 'node:test';
import assert from 'node:assert/strict';
import {readdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {publicDocument} from '../server/public-document.js';

async function htmlFiles(directory){
 const results=[];
 for(const entry of await readdir(directory,{withFileTypes:true})){
  if(entry.isDirectory())results.push(...await htmlFiles(join(directory,entry.name)));
  else if(entry.isFile()&&/\.html?$/i.test(entry.name))results.push(join(directory,entry.name));
 }
 return results;
}
test('public source contains no standalone HTML pages',async()=>{
 assert.deepEqual(await htmlFiles(resolve(import.meta.dirname,'../public')),[]);
});
test('public browser shell is generated from a JS module',()=>{
 const html=publicDocument();
 assert.match(html,/<!doctype html>/i);
 assert.match(html,/<main id="app"><\/main>/);
 assert.match(html,/src="\/js\/app\.js"/);
 assert.match(html,/href="\/styles\/home-editorial\.css"/);
});
