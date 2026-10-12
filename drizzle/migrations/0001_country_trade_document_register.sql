CREATE TABLE public.document_types (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), country_code char(2) REFERENCES public.countries(iso2), code text NOT NULL UNIQUE,
 local_name text NOT NULL, issuer text NOT NULL, category text NOT NULL CHECK(category IN ('identity','business_licence','tax','trade_qualification','industry_registration','social_security','vehicle','transport_permit','work_permit','environmental','customs','insurance','safety','asset_register')),
 applies_to text[] NOT NULL DEFAULT ARRAY['ALL'], requirement text NOT NULL DEFAULT 'optional' CHECK(requirement IN ('required','conditional','optional')),
 validity_rule text NOT NULL DEFAULT 'printed_dates' CHECK(validity_rule IN ('printed_dates','no_expiry','fixed_months','fixed_annual_date')),
 validity_months integer, fixed_expiry_month_day text, online_check_url text,
 verification_status text NOT NULL DEFAULT 'unverified' CHECK(verification_status IN ('verified','unverified')),
 extraction_schema jsonb NOT NULL DEFAULT '{"schema":"registered_document","fields":[{"key":"reference_number"},{"key":"issuing_body"},{"key":"holder_name"},{"key":"issue_date"},{"key":"expiry_date"}]}'::jsonb,
 notes text, explanation_key text, retired boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.document_types TO authenticated;
GRANT INSERT,UPDATE ON public.document_types TO authenticated;
GRANT ALL ON public.document_types TO service_role;
ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY document_register_read ON public.document_types FOR SELECT TO authenticated USING(true);
CREATE POLICY document_register_insert ON public.document_types FOR INSERT TO authenticated WITH CHECK(public.has_role(ARRAY['admin','ops']::public.app_role[]));
CREATE POLICY document_register_update ON public.document_types FOR UPDATE TO authenticated USING(public.has_role(ARRAY['admin','ops']::public.app_role[])) WITH CHECK(public.has_role(ARRAY['admin','ops']::public.app_role[]));
CREATE TRIGGER document_types_updated BEFORE UPDATE ON public.document_types FOR EACH ROW EXECUTE FUNCTION public.set_updated_fields();
CREATE TRIGGER document_types_audit AFTER INSERT OR UPDATE OR DELETE ON public.document_types FOR EACH ROW EXECUTE FUNCTION public.write_audit_event();
CREATE TABLE public.trade_document_requirements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), supplier_kind public.supplier_kind NOT NULL,
 document_type_id uuid NOT NULL REFERENCES public.document_types(id), requirement text NOT NULL CHECK(requirement IN ('required','conditional','optional')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(supplier_kind,document_type_id)
);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.trade_document_requirements TO authenticated;
GRANT ALL ON public.trade_document_requirements TO service_role;
ALTER TABLE public.trade_document_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY trade_documents_read ON public.trade_document_requirements FOR SELECT TO authenticated USING(true);
CREATE POLICY trade_documents_manage ON public.trade_document_requirements FOR ALL TO authenticated USING(public.has_role(ARRAY['admin','ops']::public.app_role[])) WITH CHECK(public.has_role(ARRAY['admin','ops']::public.app_role[]));
CREATE TRIGGER trade_documents_updated BEFORE UPDATE ON public.trade_document_requirements FOR EACH ROW EXECUTE FUNCTION public.set_updated_fields();
CREATE TRIGGER trade_documents_audit AFTER INSERT OR UPDATE OR DELETE ON public.trade_document_requirements FOR EACH ROW EXECUTE FUNCTION public.write_audit_event();
COMMENT ON TABLE public.document_types IS 'Configurable supplier document register. Unverified entries are collection guidance only, never mandatory approval gates.';