import test from 'node:test';
import assert from 'node:assert/strict';
import { studioCan, studioCanSeeRecord, studioMembershipValid } from '../server/studio-permissions.js';

const user_id='123e4567-e89b-42d3-a456-426614174000';
const founder={user_id,role:'Founder',confidentiality_clearance:'Founder Private',is_active:true};
const manager={user_id,role:'Studio Manager',confidentiality_clearance:'Restricted',is_active:true};
const reviewer={user_id,role:'Reviewer',confidentiality_clearance:'Standard',is_active:true};

test('founder grants explicit elevated capabilities only for valid active membership',()=>{
 assert.equal(studioMembershipValid(founder),true);
 for(const action of ['inquiries.convert','approvals.decide','agreements.manage','rights.activate','members.manage'])
  assert.equal(studioCan(founder,action,'Founder Private'),true);
 assert.equal(studioCan({...founder,is_active:false},'rights.activate'),false);
 assert.equal(studioCan(null,'studio.read'),false);
 assert.equal(studioCan({...founder,role:'Founder',confidentiality_clearance:'Standard'},'studio.read'),false);
 assert.equal(studioMembershipValid({...founder,confidentiality_clearance:'Standard'}),false);
});

test('manager may work with restricted inquiries but cannot approve or activate rights',()=>{
 assert.equal(studioCan(manager,'inquiries.reply','Restricted'),true);
 assert.equal(studioCan(manager,'opportunities.manage','Restricted'),true);
 assert.equal(studioCan(manager,'inquiries.convert','Restricted'),false);
 assert.equal(studioCan(manager,'rights.activate','Standard'),false);
 assert.equal(studioCan(manager,'approvals.decide','Standard'),false);
 assert.equal(studioCan(manager,'inquiries.read','Founder Private'),false);
});

test('viewer and reviewer are limited to read capabilities within clearance',()=>{
 assert.equal(studioCan(reviewer,'inquiries.read'),true);
 assert.equal(studioCan(reviewer,'inquiries.reply'),false);
 assert.equal(studioCan(reviewer,'inquiries.manage'),false);
 assert.equal(studioCan({...reviewer,role:'Viewer'},'opportunities.read'),true);
 assert.equal(studioCanSeeRecord(reviewer,'inquiries.read',{confidentiality:'Restricted'}),false);
 assert.equal(studioCanSeeRecord(reviewer,'inquiries.read',{confidentiality:'Standard'}),true);
});

test('unknown roles, classifications and action names fail closed',()=>{
 assert.equal(studioCan({...manager,role:'admin'},'studio.read'),false);
 assert.equal(studioCan(manager,'inquiries.read','Unknown'),false);
 assert.equal(studioCan(manager,'delete.everything'),false);
 assert.equal(studioCanSeeRecord(manager,'inquiries.read',null),false);
 assert.equal(studioMembershipValid({...manager,user_id:'not-a-user-id'}),false);
});
