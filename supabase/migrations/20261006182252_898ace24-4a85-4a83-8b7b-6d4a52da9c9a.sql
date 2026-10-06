CREATE OR REPLACE FUNCTION public.guard_supplier_self_service()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR public.is_operator() THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('draft','pending_review') THEN
    RAISE EXCEPTION 'Suppliers can only save drafts or submit for review';
  END IF;
  IF TG_OP = 'INSERT' THEN NEW.approved_at := NULL; NEW.approved_by := NULL;
  ELSE NEW.approved_at := OLD.approved_at; NEW.approved_by := OLD.approved_by; END IF;
  IF NEW.status = 'pending_review' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'pending_review') THEN
    IF NOT EXISTS (SELECT 1 FROM public.supplier_capabilities WHERE supplier_id = NEW.id AND active) THEN
      RAISE EXCEPTION 'At least one capability is required before submitting';
    END IF;
    IF NEW.kind IN ('workshop','recovery_operator','parts_supplier','logistics','telematics_installer','marketplace_participant')
       AND coalesce(trim(NEW.registration_number),'') = '' THEN
      RAISE EXCEPTION 'Company registration number is required for this type of business';
    END IF;
    IF coalesce(NEW.phone,'') !~ '^\+[1-9][0-9]{7,14}$' THEN
      RAISE EXCEPTION 'Phone must be in international E.164 format';
    END IF;
    IF EXISTS (SELECT 1 FROM public.supplier_documents WHERE supplier_id = NEW.id AND extraction_status IN ('extracted','needs_review','pending','processing')) THEN
      RAISE EXCEPTION 'Please confirm the details read from your documents before submitting';
    END IF;
    IF EXISTS (SELECT 1 FROM public.supplier_documents WHERE supplier_id = NEW.id AND (extraction_status = 'rejected' OR status = 'rejected')) THEN
      RAISE EXCEPTION 'Remove or replace rejected documents before submitting';
    END IF;
    NEW.submitted_at := now();
  END IF;
  RETURN NEW;
END $function$;

INSERT INTO public.translations(locale, namespace, key, value) VALUES
('en','app','ai.status.rejected','Rejected — not a valid document'),
('en','app','wizard.err.not_document','This file is not a readable document. Please upload a clear scan or photo of the official document.'),
('en','app','wizard.err.wrong_type','This file does not look like the document type you chose. Please check and upload the right one.'),
('en','app','wizard.checking_doc','Checking the document…'),
('en','app','wizard.delete_doc','Delete'),
('en','app','wizard.delete_confirm','Delete this document? You can upload a replacement afterwards.'),
('en','app','wizard.doc_deleted','Document deleted'),
('en','app','wizard.edit','Edit'),
('en','app','wizard.review_identity','Contact person'),
('en','app','approvals.open','Review application'),
('en','app','approvals.close','Close review'),
('en','app','approvals.documents','Documents supplied'),
('en','app','approvals.view_doc','View'),
('en','app','approvals.no_docs','No documents supplied'),
('en','app','approvals.referees','Referees'),
('en','app','approvals.contact','Applicant'),
('en','app','approvals.ai_title','AI assessment'),
('en','app','approvals.conformity','Conformity'),
('en','app','approvals.credibility','Credibility'),
('en','app','approvals.checklist','Conditions'),
('en','app','approvals.red_flags','Points to check'),
('en','app','approvals.reassess','Re-assess'),
('en','app','approvals.assessing','AI is assessing this application…'),
('en','app','approvals.ai_failed','The AI assessment could not run. You can still review manually.'),
('en','app','approvals.coverage','Coverage'),
('en','app','approvals.expires','Expires'),
('en','app','approvals.ai_read','AI read')
ON CONFLICT (locale, namespace, key) DO UPDATE SET value = EXCLUDED.value;