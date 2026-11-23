import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {home} from '../public/js/pages/home.js';

test('public homepage keeps current season, its artwork and the chapter route',()=>{
 const result=home();
 assert.match(result,/class="editorial-home"/);
 assert.match(result,/editorial-home-image/);
 assert.match(result,/src="\/seasons\/fall\/forest\.jpeg"/);
 assert.match(result,/href="#\/seasons\/fall"/);
 assert.match(result,/A life, <em>in seasons\.<\/em>/);
 assert.match(result,/Work in becoming/);
});
test('immersive design is scoped to home route and stylesheet is linked',async()=>{
 const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
 const [index,app,style]=await Promise.all([read('public/index.html'),read('public/js/app.js'),read('public/styles/home-editorial.css')]);
 assert.match(index,/\/styles\/home-editorial\.css/);
 assert.match(app,/classList\.toggle\('home-page',page==='home'\)/);
 assert.match(style,/body\.home-page>header/);
 assert.match(style,/@media\(prefers-reduced-motion:reduce\)/);
});

test('PWA activates fresh homepage assets rather than stale cached modules',async()=>{
 const sw=await readFile(new URL('../public/service-worker.js',import.meta.url),'utf8');
 assert.match(sw,/CACHE_PREFIX \+ 'v6'/);
 assert.match(sw,/\/styles\/home-editorial\.css/);
 assert.match(sw,/\/js\/pages\/home\.js/);
});
