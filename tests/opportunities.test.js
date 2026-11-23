import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
test('Opportunities is linked from private Studio navigation and routing',async()=>{
 const [app,ui,server,html]=await Promise.all([
 read('private/studio/app.js'),read('private/studio/components/ui.js'),
 read('server.js'),read('private/studio/index.html')
 ]);
 assert.match(app,/renderOpportunities\(content\)/);
 assert.match(ui,/\['Opportunities','opportunities'\]/);
 assert.match(server,/\/pages\/opportunities\.js/);
 assert.match(server,/\/styles\/opportunities\.css/);
 assert.match(html,/\/studio\/assets\/styles\/opportunities\.css/);
});
test('Opportunities remains a demo without rights-granting operations',async()=>{
 const content=await read('private/studio/pages/opportunities.js');
 assert.match(content,/DEMONSTRATION/);
 assert.match(content,/No real agreement or rights granted/);
 assert.match(content,/URL\.revokeObjectURL/);
 assert.doesNotMatch(content,/fetch\(|localStorage|sessionStorage|signDocument|approveLicense/);
});
