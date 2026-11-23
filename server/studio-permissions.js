// Server-side role policy for future Supabase Auth Studio sessions.
// This module does not grant access on its own. Every request must first verify
// the authenticated user, then load an active membership from the database.
const ACTIONS = Object.freeze({
 'Founder': ['studio.read','inquiries.read','inquiries.manage','inquiries.reply','inquiries.convert','opportunities.read','opportunities.manage','approvals.decide','agreements.manage','rights.activate','members.manage'],
 'Studio Manager': ['studio.read','inquiries.read','inquiries.manage','inquiries.reply','opportunities.read','opportunities.manage'],
 'Reviewer': ['studio.read','inquiries.read','opportunities.read'],
 'Viewer': ['studio.read','inquiries.read','opportunities.read']
});
const CLEARANCES = Object.freeze({ Standard:0, Restricted:1, 'Founder Private':2 });
const ACTIONS_SET = new Set(Object.values(ACTIONS).flat());

export function studioCan(member, action, classification='Standard') {
 if (!studioMembershipValid(member) || !ACTIONS_SET.has(action)) return false;
 const permitted = ACTIONS[member.role];
 if (!permitted?.includes(action)) return false;
 const level = CLEARANCES[classification];
 if (level === undefined) return false; // Never silently downgrade unknown classes.
 const clearance = CLEARANCES[member.confidentiality_clearance];
 if (clearance === undefined || clearance < level) return false;
 if (classification === 'Founder Private' && member.role !== 'Founder') return false;
 return true;
}

export function studioCanSeeRecord(member, action, record) {
 return Boolean(record && studioCan(member,action,record.confidentiality));
}

export function studioMembershipValid(record) {
 return Boolean(record && typeof record.user_id === 'string'
  && /^(?:[a-f0-9]{8}-){1}(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(record.user_id)
  && record.is_active === true && Object.hasOwn(ACTIONS,record.role)
  && Object.hasOwn(CLEARANCES,record.confidentiality_clearance)
  && (record.role !== 'Founder' || record.confidentiality_clearance === 'Founder Private'));
}
