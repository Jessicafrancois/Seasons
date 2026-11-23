import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {matchesInquiryView,INQUIRY_TYPES,INQUIRY_PRIORITIES,APPROVAL_DECISIONS,TAG_GROUPS} from '../private/studio/pages/inquiry-center.js';

test('approved inquiry classification and prefixes',()=>{
 assert.deepEqual(INQUIRY_TYPES,{sampling:'SMP',commercial:'LIC',collaboration:'COL',general:'GEN'});
 assert.deepEqual(INQUIRY_PRIORITIES,['Normal','High','Urgent']);
 assert.ok(APPROVAL_DECISIONS.includes('Approved'));
 assert.ok(APPROVAL_DECISIONS.includes('Not Approved'));
 assert.ok(TAG_GROUPS['Rights scope'].includes('Composition'));
});
test('inbox views use independent approval, response responsibility and archive state',()=>{
 const record={status:'in_review',approval_decision:'Pending Review',action_required:'Founder Decision',response_responsibility:'studio'};
 assert.equal(matchesInquiryView(record,'approvals'),true);
 assert.equal(matchesInquiryView(record,'reply'),true);
 assert.equal(matchesInquiryView(record,'review'),true);
 assert.equal(matchesInquiryView({...record,archived_at:'2026-11-23T01:00:00Z'},'all'),false);
 assert.equal(matchesInquiryView({...record,archived_at:'2026-11-23T01:00:00Z'},'archived'),true);
 assert.equal(matchesInquiryView({...record,approval_decision:'Approved',action_required:'None'},'approvals'),false);
});
test('protected Studio serves modular inquiry stylesheet and JS, with no standalone prototype HTML',async()=>{
 const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
 const [server,html,ui,code]=await Promise.all([read('server.js'),read('private/studio/index.html'),read('private/studio/components/ui.js'),read('private/studio/pages/inquiry-center.js')]);
 assert.match(server,/\/styles\/inquiry-center\.css/);
 assert.match(server,/\/pages\/inquiry-center\.js/);
 assert.match(html,/\/studio\/assets\/styles\/inquiry-center\.css/);
 assert.match(ui,/\['Inquiries','inquiries'\]/);
 assert.match(code,/DEMONSTRATION MODE/);
 assert.match(code,/INQ-LIC-26-001/);
 assert.doesNotMatch(code,/fetch\(|localStorage|sessionStorage|signDocument|approveLicense/);
});
