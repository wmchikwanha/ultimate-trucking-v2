DO $$ DECLARE c text; BEGIN
  SELECT conname INTO c FROM pg_constraint WHERE conrelid='public.supplier_documents'::regclass AND contype='c' AND pg_get_constraintdef(oid) ILIKE '%extraction_status%';
  IF c IS NOT NULL THEN EXECUTE format('ALTER TABLE public.supplier_documents DROP CONSTRAINT %I', c); END IF;
END $$;
ALTER TABLE public.supplier_documents ADD CONSTRAINT supplier_documents_extraction_status_check
  CHECK (extraction_status IN ('pending','processing','extracted','needs_review','confirmed','failed','unsupported','rejected'));