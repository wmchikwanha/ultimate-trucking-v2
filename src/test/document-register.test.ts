import { describe, it, expect } from 'vitest';
import { applicableDocuments, type DocumentType } from '@/lib/document-register';
const entry = (patch: Partial<DocumentType>): DocumentType => ({
 id:'one', code:'BW_TRADE_LICENCE', local_name:'Trade Licence (Workshop type)', issuer:'Council', category:'business_licence',
 country_code:'BW', applies_to:['ALL'], requirement:'required', verification_status:'verified', retired:false,
 validity_rule:'printed_dates', validity_months:null, fixed_expiry_month_day:null, online_check_url:null,
 extraction_schema:{}, notes:null, explanation_key:null, created_at:'', updated_at:'', ...patch,
});
describe('Country and trade document guidance', () => {
 it('never gates an unverified requirement, even with a required trade override', () => {
  const d=entry({ verification_status:'unverified' });
  expect(applicableDocuments([d],[{id:'o',document_type_id:'one',supplier_kind:'workshop',requirement:'required',created_at:'',updated_at:''}],'BW','workshop')[0]?.effectiveRequirement).toBe('optional');
 });
 it('does not request a Botswana municipal licence from a South African motor repair supplier', () => {
  expect(applicableDocuments([entry({})],[],'ZA','workshop')).toHaveLength(0);
 });
 it('retains official legal titles verbatim', () => {
  expect(applicableDocuments([entry({local_name:'Certidão de Quitação (fiscal)'})],[],'BW','workshop')[0]?.local_name).toBe('Certidão de Quitação (fiscal)');
 });
 it('treats employee-only requirements as conditional', () => {
  expect(applicableDocuments([entry({applies_to:['EMP']})],[],'BW','workshop')[0]?.effectiveRequirement).toBe('conditional');
 });
 it('excludes retired entries', () => {
  expect(applicableDocuments([entry({retired:true})],[],'BW','workshop')).toHaveLength(0);
 });
 it('does not show COMESA Yellow Card as cover in Botswana or Mozambique', () => {
  const d=entry({code:'CROSS_YELLOW_CARD',country_code:null,applies_to:['TOW'],requirement:'conditional'});
  expect(applicableDocuments([d],[],'BW','recovery_operator')).toHaveLength(0);
  expect(applicableDocuments([d],[],'MZ','recovery_operator')).toHaveLength(0);
  expect(applicableDocuments([d],[],'ZW','recovery_operator')).toHaveLength(1);
 });
 it('shows ATA Carnet only for accepted countries', () => {
  const d=entry({code:'CROSS_ATA',country_code:null,applies_to:['TOW'],requirement:'conditional'});
  expect(applicableDocuments([d],[],'ZW','recovery_operator')).toHaveLength(0);
  expect(applicableDocuments([d],[],'BW','recovery_operator')).toHaveLength(1);
 });
});