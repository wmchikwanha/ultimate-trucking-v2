import { queryOptions, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { kv } from './offline/idb';
import type { DocumentType, TradeRequirement } from './document-register';

export type Register = { types: DocumentType[]; overrides: TradeRequirement[] };
export const registerQuery = queryOptions({
  queryKey: ['document-register'], staleTime: 60_000,
  queryFn: async (): Promise<Register> => {
    try {
      const [types, overrides] = await Promise.all([
        supabase.from('document_types').select('*').order('local_name'),
        supabase.from('trade_document_requirements').select('*'),
      ]);
      if (types.error || overrides.error) throw types.error ?? overrides.error;
      const result = { types: types.data ?? [], overrides: overrides.data ?? [] };
      await kv.set('document-register', result).catch(() => {});
      return result;
    } catch (error) {
      const cached = await kv.get<Register>('document-register');
      if (cached) return cached;
      throw error;
    }
  },
});
export const useDocumentRegister = () => useQuery(registerQuery);