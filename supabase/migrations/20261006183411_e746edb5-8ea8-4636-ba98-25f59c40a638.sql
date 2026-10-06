ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS is_available boolean NOT NULL DEFAULT true;

-- Prompt 5 hard rules: approval only by a human operator, never with expired required certs or zero capabilities.
CREATE OR REPLACE FUNCTION public.guard_supplier_approval()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'approved' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'approved') THEN
    IF auth.uid() IS NULL OR NOT public.has_role(ARRAY['admin','approver']::public.app_role[]) THEN
      RAISE EXCEPTION 'Only a human approver can approve a supplier';
    END IF;
    NEW.approved_by := auth.uid();
    NEW.approved_at := now();
    IF NOT EXISTS (SELECT 1 FROM public.supplier_capabilities WHERE supplier_id = NEW.id AND active) THEN
      RAISE EXCEPTION 'Cannot approve a supplier with no capabilities';
    END IF;
    IF EXISTS (SELECT 1 FROM public.supplier_documents WHERE supplier_id = NEW.id
               AND doc_type IN ('trade_certificate','safety_certificate','company_registration')
               AND expires_at IS NOT NULL AND expires_at < current_date) THEN
      RAISE EXCEPTION 'Cannot approve: a required certificate has expired';
    END IF;
    IF EXISTS (SELECT 1 FROM public.supplier_documents WHERE supplier_id = NEW.id AND (status = 'rejected' OR extraction_status = 'rejected')) THEN
      RAISE EXCEPTION 'Cannot approve: a document was rejected';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS suppliers_approval_guard ON public.suppliers;
CREATE TRIGGER suppliers_approval_guard BEFORE INSERT OR UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.guard_supplier_approval();

-- Prompt 6 ranking
CREATE OR REPLACE FUNCTION public.rank_suppliers(
  _fault_type_id uuid, _system_id uuid, _lat double precision, _lng double precision,
  _radius_km integer DEFAULT 250, _exclude uuid[] DEFAULT '{}'::uuid[])
RETURNS TABLE(supplier_id uuid, score numeric, rationale jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $$
DECLARE _sys uuid := coalesce(_system_id, (SELECT system_id FROM public.fault_types WHERE id = _fault_type_id));
BEGIN
  RETURN QUERY
  WITH here AS (SELECT ST_SetSRID(ST_MakePoint(_lng, _lat), 4326)::geography g),
  cand AS (
    SELECT s.id, s.legal_name, s.trading_name, s.kind, s.phone,
           ST_Distance(l.geog, (SELECT g FROM here)) / 1000.0 AS km
    FROM public.suppliers s JOIN public.locations l ON l.id = s.base_location_id
    WHERE s.status = 'approved' AND s.is_available AND NOT (s.id = ANY(_exclude))
      AND NOT EXISTS (SELECT 1 FROM public.supplier_documents d WHERE d.supplier_id = s.id
            AND d.doc_type IN ('trade_certificate','safety_certificate','company_registration')
            AND d.expires_at IS NOT NULL AND d.expires_at < current_date)
  ),
  caps AS (
    SELECT c.supplier_id sid,
      jsonb_agg(jsonb_build_object(
        'system', sy.name, 'fault', ft.name, 'asset_class', ac.name, 'make', mk.name,
        'source', c.source, 'proficiency', round(c.confidence * 100),
        'exact_fault', (c.fault_type_id = _fault_type_id)) ORDER BY c.confidence DESC) AS rows,
      max(
        (CASE c.source WHEN 'human_confirmed' THEN 1.0 WHEN 'ai_extracted' THEN 0.85 ELSE 0.7 END)
        * c.confidence
        * (CASE WHEN c.fault_type_id = _fault_type_id
                  OR (_fault_type_id IS NOT NULL AND _fault_type_id = ANY(s.handled_fault_type_ids)) THEN 1.0 ELSE 0.85 END)
      ) AS cap
    FROM public.supplier_capabilities c
    JOIN public.suppliers s ON s.id = c.supplier_id
    JOIN public.systems sy ON sy.id = c.system_id
    JOIN public.asset_classes ac ON ac.id = c.asset_class_id
    LEFT JOIN public.fault_types ft ON ft.id = c.fault_type_id
    LEFT JOIN public.makes mk ON mk.id = c.make_id
    WHERE c.active AND c.system_id = _sys AND (c.fault_type_id IS NULL OR c.fault_type_id = _fault_type_id)
    GROUP BY c.supplier_id
  ),
  rat AS (SELECT subject_id sid, count(*) n, avg(score)::numeric a, sum(score)::numeric total
          FROM public.ratings WHERE subject_type = 'supplier' GROUP BY subject_id),
  ont AS (SELECT subject_id sid, count(*) FILTER (WHERE event_type = 'job_on_time') ok, count(*) n
          FROM public.trust_events WHERE subject_type = 'supplier' AND event_type IN ('job_on_time','job_late') GROUP BY subject_id),
  resp AS (SELECT sc.supplier_id sid, min(sc.response_time_minutes) m FROM public.supplier_coverage sc GROUP BY sc.supplier_id),
  scored AS (
    SELECT c.*, cp.rows, cp.cap,
      coalesce(r.n, 0) AS n_ratings, round(coalesce(r.a, 0), 2) AS avg_rating,
      ((5 * 3.5) + coalesce(r.total, 0)) / (5 + coalesce(r.n, 0)) AS bayes,
      coalesce(o.ok, 0) AS on_time, coalesce(o.n, 0) AS jobs,
      (coalesce(o.ok, 0) + 1.6) / (coalesce(o.n, 0) + 2) AS on_time_rate,
      coalesce(rs.m, 120) AS response_min
    FROM cand c JOIN caps cp ON cp.sid = c.id
    LEFT JOIN rat r ON r.sid = c.id LEFT JOIN ont o ON o.sid = c.id LEFT JOIN resp rs ON rs.sid = c.id
    WHERE c.km <= _radius_km
  )
  SELECT x.id,
    round((0.45 * (0.5 * x.cap + 0.5 * x.bayes / 5)
         + 0.30 * greatest(0, 1 - x.km / _radius_km)
         + 0.15 * x.on_time_rate
         + 0.10 * greatest(0, 1 - x.response_min / 240.0)) * 100, 1)::numeric,
    jsonb_build_object(
      'name', coalesce(x.trading_name, x.legal_name), 'legal_name', x.legal_name, 'kind', x.kind, 'phone', x.phone,
      'distance_km', round(x.km::numeric, 1), 'response_minutes', x.response_min,
      'rating', x.avg_rating, 'rating_count', x.n_ratings, 'bayesian_rating', round(x.bayes, 2),
      'jobs', x.jobs, 'on_time', x.on_time, 'on_time_rate', round(x.on_time_rate * 100),
      'capabilities', x.rows,
      'parts', jsonb_build_object(
        'capability_and_rating', round(0.45 * (0.5 * x.cap + 0.5 * x.bayes / 5) * 100, 1),
        'proximity', round(0.30 * greatest(0, 1 - x.km / _radius_km)::numeric * 100, 1),
        'on_time', round(0.15 * x.on_time_rate * 100, 1),
        'response', round(0.10 * greatest(0, 1 - x.response_min / 240.0) * 100, 1)),
      'radius_km', _radius_km)
  FROM scored x
  ORDER BY 2 DESC;
END $$;
REVOKE ALL ON FUNCTION public.rank_suppliers(uuid, uuid, double precision, double precision, integer, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rank_suppliers(uuid, uuid, double precision, double precision, integer, uuid[]) TO authenticated;

-- Part search: suppliers stocking a part or an equivalent
CREATE OR REPLACE FUNCTION public.search_parts(_q text, _lat double precision, _lng double precision, _radius_km integer DEFAULT 400)
RETURNS TABLE(part_id uuid, part_name text, part_number text, manufacturer text, via_part text, equivalence text, verification text,
              supplier_id uuid, supplier_name text, distance_km numeric, stock_qty integer, price_minor bigint, currency_code text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $$
  WITH hits AS (
    SELECT id FROM public.parts
    WHERE length(trim(_q)) >= 2 AND (name ILIKE '%'||_q||'%' OR part_number ILIKE '%'||_q||'%' OR description ILIKE '%'||_q||'%')
  ),
  opts AS (
    SELECT h.id searched, h.id stocked, NULL::text eq, 'verified'::text ver FROM hits h
    UNION ALL
    SELECT x.part_id, x.equivalent_part_id, x.equivalence_type::text, x.verification_status::text
    FROM public.parts_cross_reference x JOIN hits h ON h.id = x.part_id WHERE x.verification_status <> 'rejected'
    UNION ALL
    SELECT x.equivalent_part_id, x.part_id, x.equivalence_type::text, x.verification_status::text
    FROM public.parts_cross_reference x JOIN hits h ON h.id = x.equivalent_part_id WHERE x.verification_status <> 'rejected'
  )
  SELECT sp.part_id, p.name, p.part_number, p.manufacturer,
         CASE WHEN o.eq IS NULL THEN NULL ELSE sp2.name END, o.eq, o.ver,
         s.id, coalesce(s.trading_name, s.legal_name),
         round((ST_Distance(l.geog, ST_SetSRID(ST_MakePoint(_lng,_lat),4326)::geography)/1000)::numeric, 1),
         sp.stock_qty, sp.price_minor, sp.currency_code::text
  FROM opts o
  JOIN public.parts p ON p.id = o.stocked
  JOIN public.parts sp2 ON sp2.id = o.searched
  JOIN public.supplier_parts sp ON sp.part_id = o.stocked AND sp.stock_qty > 0
  JOIN public.suppliers s ON s.id = sp.supplier_id AND s.status = 'approved'
  JOIN public.locations l ON l.id = s.base_location_id
  WHERE ST_DWithin(l.geog, ST_SetSRID(ST_MakePoint(_lng,_lat),4326)::geography, _radius_km * 1000)
  ORDER BY (o.eq IS NOT NULL), 10;
$$;
REVOKE ALL ON FUNCTION public.search_parts(text, double precision, double precision, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_parts(text, double precision, double precision, integer) TO authenticated;

-- Demo providers (seeded directly, bypassing the human-approval guard only for demo rows)
ALTER TABLE public.suppliers DISABLE TRIGGER suppliers_approval_guard;
ALTER TABLE public.suppliers DISABLE TRIGGER suppliers_self_service_guard;

INSERT INTO public.locations (id, name, kind, country_code, geog) VALUES
 ('a0000000-0000-0000-0000-000000000001','Gaborone West','supplier_base','BW', ST_SetSRID(ST_MakePoint(25.8800,-24.6550),4326)::geography),
 ('a0000000-0000-0000-0000-000000000002','Tlokweng','supplier_base','BW', ST_SetSRID(ST_MakePoint(25.9750,-24.6650),4326)::geography),
 ('a0000000-0000-0000-0000-000000000003','Mogoditshane','supplier_base','BW', ST_SetSRID(ST_MakePoint(25.8650,-24.6270),4326)::geography),
 ('a0000000-0000-0000-0000-000000000004','Mahalapye','supplier_base','BW', ST_SetSRID(ST_MakePoint(26.8150,-23.1050),4326)::geography),
 ('a0000000-0000-0000-0000-000000000005','Palapye','supplier_base','BW', ST_SetSRID(ST_MakePoint(27.1250,-22.5470),4326)::geography),
 ('a0000000-0000-0000-0000-000000000006','Francistown','supplier_base','BW', ST_SetSRID(ST_MakePoint(27.5100,-21.1700),4326)::geography),
 ('a0000000-0000-0000-0000-000000000007','Lobatse','supplier_base','BW', ST_SetSRID(ST_MakePoint(25.6800,-25.2250),4326)::geography)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.suppliers (id, legal_name, trading_name, kind, status, country_code, phone, base_location_id, operates_24_7, approved_at, contact_full_name, supplier_references, onboarding_step, is_available, handled_fault_type_ids) VALUES
 ('b0000000-0000-0000-0000-000000000001','Mike Kgosi','Mike''s Mobile Diesel','mobile_mechanic','approved','BW','+26771000001','a0000000-0000-0000-0000-000000000001',true, now(),'Mike Kgosi','[]',10,true,'{}'),
 ('b0000000-0000-0000-0000-000000000002','Tlokweng Truck Works (Pty) Ltd','Tlokweng Truck Works','workshop','approved','BW','+26771000002','a0000000-0000-0000-0000-000000000002',false, now(),'Neo Molefe','[]',10,true,'{}'),
 ('b0000000-0000-0000-0000-000000000003','Kabelo Sparks','Sparky Auto Electric','auto_electrician','approved','BW','+26771000003','a0000000-0000-0000-0000-000000000003',true, now(),'Kabelo Sparks','[]',10,true,'{}'),
 ('b0000000-0000-0000-0000-000000000004','Central Recovery (Pty) Ltd','Central Recovery','recovery_operator','approved','BW','+26771000004','a0000000-0000-0000-0000-000000000004',true, now(),'Thato Dube','[]',10,true,'{}'),
 ('b0000000-0000-0000-0000-000000000005','A1 Tyre Specialists','A1 Tyres','tyre_specialist','approved','BW','+26771000005','a0000000-0000-0000-0000-000000000005',false, now(),'Lesego Pule','[]',10,true,'{}'),
 ('b0000000-0000-0000-0000-000000000006','North Diesel & Parts (Pty) Ltd','North Diesel & Parts','parts_supplier','approved','BW','+26771000006','a0000000-0000-0000-0000-000000000006',false, now(),'Boitumelo Sithole','[]',10,true,'{}'),
 ('b0000000-0000-0000-0000-000000000007','Onalenna Motlhabane','Ona Mobile Mechanic','mobile_mechanic','approved','BW','+26771000007','a0000000-0000-0000-0000-000000000007',false, now(),'Onalenna Motlhabane','[]',10,true,'{}')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.suppliers ENABLE TRIGGER suppliers_approval_guard;
ALTER TABLE public.suppliers ENABLE TRIGGER suppliers_self_service_guard;

-- Capabilities: each provider across heavy trucks and trailers for their systems
INSERT INTO public.supplier_capabilities (supplier_id, asset_class_id, system_id, source, confidence, active)
SELECT v.sid::uuid, ac.id, sy.id, v.src::public.capability_source, v.conf, true
FROM (VALUES
 ('b0000000-0000-0000-0000-000000000001','engine','human_confirmed',0.95),
 ('b0000000-0000-0000-0000-000000000001','fuel','human_confirmed',0.9),
 ('b0000000-0000-0000-0000-000000000001','cooling','self_declared',0.9),
 ('b0000000-0000-0000-0000-000000000001','brakes','self_declared',0.8),
 ('b0000000-0000-0000-0000-000000000002','engine','human_confirmed',0.9),
 ('b0000000-0000-0000-0000-000000000002','transmission','human_confirmed',0.95),
 ('b0000000-0000-0000-0000-000000000002','brakes','human_confirmed',0.9),
 ('b0000000-0000-0000-0000-000000000002','suspension','self_declared',0.85),
 ('b0000000-0000-0000-0000-000000000002','cooling','human_confirmed',0.85),
 ('b0000000-0000-0000-0000-000000000003','electrical','human_confirmed',0.95),
 ('b0000000-0000-0000-0000-000000000003','engine','ai_extracted',0.7),
 ('b0000000-0000-0000-0000-000000000004','body','human_confirmed',0.9),
 ('b0000000-0000-0000-0000-000000000004','engine','self_declared',0.6),
 ('b0000000-0000-0000-0000-000000000004','tyres','self_declared',0.7),
 ('b0000000-0000-0000-0000-000000000005','tyres','human_confirmed',0.98),
 ('b0000000-0000-0000-0000-000000000005','suspension','self_declared',0.7),
 ('b0000000-0000-0000-0000-000000000006','engine','self_declared',0.75),
 ('b0000000-0000-0000-0000-000000000006','hydraulics','human_confirmed',0.85),
 ('b0000000-0000-0000-0000-000000000007','engine','self_declared',0.85),
 ('b0000000-0000-0000-0000-000000000007','electrical','self_declared',0.8),
 ('b0000000-0000-0000-0000-000000000007','brakes','self_declared',0.8),
 ('b0000000-0000-0000-0000-000000000007','tyres','self_declared',0.75)
) v(sid, sys, src, conf)
JOIN public.systems sy ON sy.code = v.sys
JOIN public.asset_classes ac ON ac.code IN ('heavy_truck','trailer');

INSERT INTO public.supplier_coverage (supplier_id, country_code, radius_km, response_time_minutes) VALUES
 ('b0000000-0000-0000-0000-000000000001','BW',150,35),
 ('b0000000-0000-0000-0000-000000000002','BW',80,90),
 ('b0000000-0000-0000-0000-000000000003','BW',120,45),
 ('b0000000-0000-0000-0000-000000000004','BW',400,60),
 ('b0000000-0000-0000-0000-000000000005','BW',200,75),
 ('b0000000-0000-0000-0000-000000000006','BW',300,150),
 ('b0000000-0000-0000-0000-000000000007','BW',150,50);

-- Ratings (Bayesian demo: Ona has one 5-star job, Tlokweng has many 4-star jobs)
INSERT INTO public.ratings (rater_id, rater_role, subject_type, subject_id, score)
SELECT gen_random_uuid(), 'customer', 'supplier', v.sid::uuid, v.score
FROM (VALUES ('b0000000-0000-0000-0000-000000000001',5,22),('b0000000-0000-0000-0000-000000000001',4,8),
             ('b0000000-0000-0000-0000-000000000002',4,80),('b0000000-0000-0000-0000-000000000002',5,6),
             ('b0000000-0000-0000-0000-000000000003',5,12),('b0000000-0000-0000-0000-000000000003',3,4),
             ('b0000000-0000-0000-0000-000000000004',4,30),('b0000000-0000-0000-0000-000000000005',5,40),
             ('b0000000-0000-0000-0000-000000000006',4,10),('b0000000-0000-0000-0000-000000000007',5,1)) v(sid, score, n),
     generate_series(1, v.n);

INSERT INTO public.trust_events (subject_type, subject_id, event_type, weight)
SELECT 'supplier', v.sid::uuid, v.ev, 1
FROM (VALUES ('b0000000-0000-0000-0000-000000000001','job_on_time',27),('b0000000-0000-0000-0000-000000000001','job_late',3),
             ('b0000000-0000-0000-0000-000000000002','job_on_time',70),('b0000000-0000-0000-0000-000000000002','job_late',16),
             ('b0000000-0000-0000-0000-000000000003','job_on_time',14),('b0000000-0000-0000-0000-000000000003','job_late',2),
             ('b0000000-0000-0000-0000-000000000004','job_on_time',24),('b0000000-0000-0000-0000-000000000004','job_late',6),
             ('b0000000-0000-0000-0000-000000000005','job_on_time',38),('b0000000-0000-0000-0000-000000000005','job_late',2),
             ('b0000000-0000-0000-0000-000000000006','job_on_time',7),('b0000000-0000-0000-0000-000000000006','job_late',3),
             ('b0000000-0000-0000-0000-000000000007','job_on_time',1)) v(sid, ev, n),
     generate_series(1, v.n);

-- Parts and cross references
INSERT INTO public.parts (id, manufacturer, part_number, name, description, system_id) VALUES
 ('c0000000-0000-0000-0000-000000000001','Mercedes-Benz','A0004771302','Fuel filter element','Actros diesel fuel filter', (SELECT id FROM public.systems WHERE code='fuel')),
 ('c0000000-0000-0000-0000-000000000002','MANN-FILTER','PU 1059 x','Fuel filter element','Aftermarket equivalent for Actros fuel filter', (SELECT id FROM public.systems WHERE code='fuel')),
 ('c0000000-0000-0000-0000-000000000003','Bosch','F 026 402 120','Fuel filter element','Possible fit for Actros fuel filter', (SELECT id FROM public.systems WHERE code='fuel')),
 ('c0000000-0000-0000-0000-000000000004','Scania','1873016','Alternator','Scania R-series 24V alternator', (SELECT id FROM public.systems WHERE code='electrical')),
 ('c0000000-0000-0000-0000-000000000005','WABCO','4324102227','Brake chamber','Type 24/24 spring brake chamber', (SELECT id FROM public.systems WHERE code='brakes'))
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.parts_cross_reference (part_id, equivalent_part_id, equivalence_type, verification_status, notes) VALUES
 ('c0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000002','interchangeable','verified','Confirmed by UTS workshop'),
 ('c0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000003','functional','ai_suggested','AI suggestion — not yet checked by a person');

INSERT INTO public.supplier_parts (supplier_id, part_id, stock_qty, price_minor, currency_code) VALUES
 ('b0000000-0000-0000-0000-000000000006','c0000000-0000-0000-0000-000000000001',4,85000,'BWP'),
 ('b0000000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-000000000002',10,42000,'BWP'),
 ('b0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000003',2,39000,'BWP'),
 ('b0000000-0000-0000-0000-000000000003','c0000000-0000-0000-0000-000000000004',1,520000,'BWP'),
 ('b0000000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-000000000005',6,110000,'BWP');

INSERT INTO public.translations(locale, namespace, key, value) VALUES
('en','app','approvals.sort','Sort by'),
('en','app','approvals.request_evidence','Request more evidence'),
('en','app','approvals.reason','Reason (sent to the supplier)'),
('en','app','approvals.confirm_title','Confirm approval'),
('en','app','approvals.verified','What was verified'),
('en','app','approvals.overridden','What a person changed from the AI'),
('en','app','approvals.none_overridden','Nothing — all AI readings were accepted as is'),
('en','app','approvals.human_decides','AI does the reading. You do the deciding.'),
('en','app','approvals.approved_by','Approved by {name} on {date}'),
('en','app','approvals.claims_vs_ai','Supplier''s claims vs AI tags'),
('en','app','approvals.supplier_says','Supplier says'),
('en','app','approvals.ai_says','AI suggests'),
('en','app','approvals.disagree','Disagreement'),
('en','app','approvals.save_corrections','Save corrections'),
('en','app','approvals.flags','flags'),
('en','app','approvals.docs_count','{n} docs'),
('en','app','wizard.evidence_requested','UTS asked for more information: {reason}')
ON CONFLICT (locale, namespace, key) DO UPDATE SET value = EXCLUDED.value;