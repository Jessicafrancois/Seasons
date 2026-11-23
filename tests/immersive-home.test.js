import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {home} from '../public/js/pages/home.js';
import {publicDocument} from '../server/public-document.js';

test('public homepage keeps current season, its artwork and the chapter route',()=>{
 const result=home();
 assert.match(result,/class="editorial-home"/);
 assert.match(result,/editorial-home-image/);
 assert.match(result,/src="\/seasons\/fall\/forest\.jpeg"/);
 assert.match(result,/href="#\/seasons\/fall"/);
 assert.match(result,/<h1 id="editorial-title">A life, in seasons\.<\/h1>/);
 assert.match(result,/EXPLORE THE CHAPTER/);
 assert.match(result,/editorial-home-pagination-current/);
});
test('immersive design is scoped to home route and stylesheet is linked',async()=>{
 const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
 const [app,style]=await Promise.all([read('public/js/app.js'),read('public/styles/home-editorial.css')]);
 const index=publicDocument();
 assert.match(index,/\/styles\/home-editorial\.css/);
 assert.match(app,/classList\.toggle\('home-page',page==='home'\)/);
 assert.match(style,/body\.home-page>header/);
 assert.match(style,/@media\(prefers-reduced-motion:reduce\)/);
});

test('PWA activates fresh homepage assets rather than stale cached modules',async()=>{
 const sw=await readFile(new URL('../public/service-worker.js',import.meta.url),'utf8');
 assert.match(sw,/CACHE_PREFIX \+ 'v8'/);
 assert.match(sw,/\/styles\/home-editorial\.css/);
 assert.match(sw,/\/js\/pages\/home\.js/);
});

test('public document is emitted by server code, rather than an HTML file',async()=>{
 const server=await readFile(new URL('../server.js',import.meta.url),'utf8');
 assert.match(server,/publicDocument\(\)/);
 assert.doesNotMatch(server,/page \? '\/index\.html'/);
 assert.match(publicDocument(), /<main id="app"><\/main>/);
});

test('reference layout retains ruled top navigation and modest centered title',async()=>{
 const css=await readFile(new URL('../public/styles/home-editorial.css',import.meta.url),'utf8');
 assert.match(css,/border-top:1px solid rgba\(255,255,255,\.36\)/);
 assert.match(css,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
 assert.match(css,/font:normal clamp\(37px,4\.3vw,67px\)/);
 assert.match(css,/editorial-home-pagination-current/);
});

test('home replaces old selected explorations heading with four linked tiles',()=>{
 const rendered=home();
 assert.match(rendered,/home-feature-section/);
 assert.equal((rendered.match(/class="home-feature-tile home-feature-tile--/g)||[]).length,4);
 assert.doesNotMatch(rendered,/Selected explorations|01 \/ Selected explorations/);
 assert.match(rendered,/href="#\/seasons\/fall"/);
});
