import { connected, db } from './studio-operations.js';

const INQUIRIES = 'id,inquiry_code,contact_name,contact_email,organization,inquiry_type,status,priority,suggested_priority,approval_decision,action_required,confidentiality,tags,created_at,last_activity_at,waiting_since,deadline_at,intended_use,requested_rights,project_id';
const OPPORTUNITIES = 'id,opportunity_code,inquiry_id,title,type,stage,contact_name,organization,priority,confidentiality,approval_decision,rights_fulfillment,requested_rights,territory,usage_term,proposed_value_usd,contracted_value_usd,created_at,updated_at';

export async function centerLists() {
  if (!connected()) return { connected: false, inquiries: [], opportunities: [], counts: null };
  const [inquiries, opportunities] = await Promise.all([
    db('seasons_inquiries?select=' + INQUIRIES + '&order=created_at.desc&limit=100'),
    db('seasons_opportunities?select=' + OPPORTUNITIES + '&order=created_at.desc&limit=100')
  ]);
  return {
    connected: true,
    inquiries, opportunities,
    counts: { recentInquiries: inquiries.length, recentOpportunities: opportunities.length },
    scope: 'latest 100 records per center; no unverified global totals'
  };
}

export async function inquiryDetails(id) {
  if (!connected()) return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  const [records, messages, notes, reviews] = await Promise.all([
    db('seasons_inquiries?select=' + INQUIRIES + ',message&' + 'id=eq.' + encodeURIComponent(id) + '&limit=1'),
    db('seasons_inquiry_messages?select=id,direction,sender_email,recipient_email,subject,body_text,delivery_status,created_at&inquiry_id=eq.' + encodeURIComponent(id) + '&order=created_at.asc&limit=100'),
    db('seasons_inquiry_notes?select=id,body_text,created_at&inquiry_id=eq.' + encodeURIComponent(id) + '&order=created_at.desc&limit=50'),
    db('seasons_approval_reviews?select=id,decision,review_notes,created_at&inquiry_id=eq.' + encodeURIComponent(id) + '&order=created_at.desc&limit=25')
  ]);
  if (!records.length) return null;
  return { inquiry: records[0], messages, notes, reviews };
}

export async function opportunityDetails(id) {
  if (!connected()) return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  const [records, docs, grants, reviews] = await Promise.all([
    db('seasons_opportunities?select=' + OPPORTUNITIES + '&id=eq.' + encodeURIComponent(id) + '&limit=1'),
    db('seasons_agreement_documents?select=id,document_family,version_number,original_filename,document_status,signature_status,created_at&opportunity_id=eq.' + encodeURIComponent(id) + '&order=created_at.desc&limit=100'),
    db('seasons_rights_grants?select=id,status,rights_description,territory,effective_at,expires_at&opportunity_id=eq.' + encodeURIComponent(id) + '&limit=50'),
    db('seasons_approval_reviews?select=id,decision,review_notes,created_at&opportunity_id=eq.' + encodeURIComponent(id) + '&order=created_at.desc&limit=25')
  ]);
  if (!records.length) return null;
  return { opportunity: records[0], documents: docs, grants, reviews };
}
