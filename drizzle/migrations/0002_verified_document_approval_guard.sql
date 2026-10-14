CREATE OR REPLACE FUNCTION public.guard_registered_documents() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE missing text;
BEGIN
 IF NEW.status='approved' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM 'approved') THEN
  SELECT string_agg(d.local_name, ', ' ORDER BY d.local_name) INTO missing
  FROM public.document_types d
  LEFT JOIN public.trade_document_requirements r ON r.document_type_id=d.id AND r.supplier_kind=NEW.kind
  WHERE NOT d.retired AND d.verification_status='verified'
   AND (d.country_code IS NULL OR d.country_code=NEW.country_code)
   AND coalesce(r.requirement,d.requirement)='required'
   AND NOT (d.applies_to && ARRAY['EMP','FOREIGN','WASTE'])
   AND (r.id IS NOT NULL OR 'ALL'=ANY(d.applies_to) OR d.applies_to && CASE NEW.kind
    WHEN 'mobile_mechanic' THEN ARRAY['MECHANIC'] WHEN 'workshop' THEN ARRAY['WORKSHOP','MECHANIC']
    WHEN 'auto_electrician' THEN ARRAY['AUTO_ELECTRICIAN'] WHEN 'trailer_technician' THEN ARRAY['MECHANIC']
    WHEN 'tyre_specialist' THEN ARRAY['WORKSHOP'] WHEN 'welder' THEN ARRAY['WELDER']
    WHEN 'recovery_operator' THEN ARRAY['TOW'] WHEN 'parts_supplier' THEN ARRAY['PARTS']
    WHEN 'telematics_installer' THEN ARRAY['AUTO_ELECTRICIAN'] WHEN 'logistics' THEN ARRAY['TOW'] ELSE ARRAY[]::text[] END)
   AND NOT EXISTS (SELECT 1 FROM public.supplier_documents sd WHERE sd.supplier_id=NEW.id AND sd.doc_type=d.code
    AND sd.status<>'rejected' AND sd.extraction_status='confirmed' AND (sd.expires_at IS NULL OR sd.expires_at>=current_date));
  IF missing IS NOT NULL THEN RAISE EXCEPTION 'Cannot approve: required documents missing or unconfirmed: %',missing; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER suppliers_registered_document_guard BEFORE INSERT OR UPDATE OF status ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.guard_registered_documents();
COMMENT ON FUNCTION public.guard_registered_documents() IS 'Enforces only verified, unconditional country/trade requirements on human approval. Unverified, retired and circumstance-dependent entries are never hard gates.';