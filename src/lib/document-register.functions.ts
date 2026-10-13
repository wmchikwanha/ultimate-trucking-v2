import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

/** Private document viewer: reads through owner/staff RLS, never accepts a storage path from the browser. */
export const viewSupplierDocument = createServerFn({method:'POST'})
 .middleware([requireSupabaseAuth])
 .inputValidator(d => z.object({documentId:z.string().uuid()}).parse(d))
 .handler(async ({data,context}) => {
   const {data:doc,error} = await context.supabase.from('supplier_documents').select('storage_path').eq('id',data.documentId).maybeSingle();
   if(error || !doc) return {url:null};
   const {data:link} = await context.supabase.storage.from('supplier-documents').createSignedUrl(doc.storage_path,300);
   return {url:link?.signedUrl ?? null};
 });