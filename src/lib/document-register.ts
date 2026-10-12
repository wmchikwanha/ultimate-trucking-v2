import type { Database } from '@/integrations/supabase/types';
import type { SupplierKind } from './onboarding/model';

export type DocumentType = Database['public']['Tables']['document_types']['Row'];
export type TradeRequirement = Database['public']['Tables']['trade_document_requirements']['Row'];
export type Requirement = 'required' | 'conditional' | 'optional';
export const TRADE_TAGS: Record<SupplierKind, string[]> = {
  mobile_mechanic: ['MECHANIC'], workshop: ['WORKSHOP', 'MECHANIC'], auto_electrician: ['AUTO_ELECTRICIAN'],
  trailer_technician: ['MECHANIC'], tyre_specialist: ['WORKSHOP'], welder: ['WELDER'], recovery_operator: ['TOW'],
  parts_supplier: ['PARTS'], telematics_installer: ['AUTO_ELECTRICIAN'], inspector: [], logistics: ['TOW'], marketplace_participant: [],
};
export function applicableDocuments(types: DocumentType[], overrides: TradeRequirement[], country: string, trade: SupplierKind | '') {
  const tags = trade ? TRADE_TAGS[trade] : [];
  return types.filter(d => !d.retired && (!d.country_code || d.country_code === country) && (
    d.applies_to.includes('ALL') || d.applies_to.some(tag => tags.includes(tag) || ['EMP', 'FOREIGN', 'WASTE'].includes(tag)) ||
    overrides.some(o => o.document_type_id === d.id && o.supplier_kind === trade)
  )).map(d => {
    const override = overrides.find(o => o.document_type_id === d.id && o.supplier_kind === trade);
    // Unverified entries and circumstance-dependent requirements can never become unconditional gates.
    const requirement: Requirement = d.verification_status === 'unverified' ? 'optional' :
      (override?.requirement ?? d.requirement) === 'required' && d.applies_to.some(t => ['EMP', 'FOREIGN', 'WASTE'].includes(t)) ? 'conditional' :
      (override?.requirement ?? d.requirement) as Requirement;
    return { ...d, effectiveRequirement: requirement };
  }).sort((a,b) => a.local_name.localeCompare(b.local_name));
}