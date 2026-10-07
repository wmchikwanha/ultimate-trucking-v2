-- Pending-review demo applications for approvals-queue testing.
-- These are synthetic companies, deliberately seeded without documents.
-- Capabilities are included because the application's submission guard requires
-- at least one active capability before a supplier can enter pending_review.
-- They remain unavailable and are excluded from Match Engine results by status.

ALTER TABLE public.suppliers DISABLE TRIGGER suppliers_approval_guard;
ALTER TABLE public.suppliers DISABLE TRIGGER suppliers_self_service_guard;

-- Reuse five existing regional demo locations and add one Mozambique location.
INSERT INTO public.locations (id, name, kind, country_code, geog) VALUES
 ('a2000000-0000-0000-0000-000000000001','Maputo','supplier_base','MZ', ST_SetSRID(ST_MakePoint(32.5732,-25.9692),4326)::geography)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.suppliers
 (id, legal_name, trading_name, kind, status, country_code, phone, base_location_id,
  operates_24_7, approved_at, approved_by, submitted_at, contact_full_name,
  registration_number, supplier_references, onboarding_step, is_available,
  handled_fault_type_ids, notes, capability_description)
VALUES
 ('b2000000-0000-0000-0000-000000000001','Harare Transit Mechanics (Demo)','Harare Transit Mechanics','workshop','pending_review','ZW','+263710200001','a1000000-0000-0000-0000-000000000001',false,NULL,NULL,now(),'Tendai Chirwa','ZW-DEMO-PR-001','[]',10,false,'{}','Synthetic pending-review demo company. No documents supplied.','Heavy-truck workshop for engine, brakes and transmission.'),
 ('b2000000-0000-0000-0000-000000000002','Lusaka RoadLink Recovery (Demo)','Lusaka RoadLink Recovery','recovery_operator','pending_review','ZM','+260970200002','a1000000-0000-0000-0000-000000000006',true,NULL,NULL,now(),'Chipo Mumba','ZM-DEMO-PR-002','[]',10,false,'{}','Synthetic pending-review demo company. No documents supplied.','Heavy recovery and towing with tyre response.'),
 ('b2000000-0000-0000-0000-000000000003','Luanda Commercial Parts Co (Demo)','Luanda Commercial Parts Co','parts_supplier','pending_review','AO','+244923200003','a1000000-0000-0000-0000-000000000009',false,NULL,NULL,now(),'Paulo Domingos','AO-DEMO-PR-003','[]',10,false,'{}','Synthetic pending-review demo company. No documents supplied.','Commercial vehicle parts for fuel, electrical and brake systems.'),
 ('b2000000-0000-0000-0000-000000000004','Blantyre Mobile Fleet Assist (Demo)','Blantyre Mobile Fleet Assist','mobile_mechanic','pending_review','MW','+265991200004','a1000000-0000-0000-0000-000000000013',true,NULL,NULL,now(),'Chisomo Banda',NULL,'[]',10,false,'{}','Synthetic pending-review demo company. No documents supplied.','Mobile diesel, cooling and electrical support for trucks and trailers.'),
 ('b2000000-0000-0000-0000-000000000005','Pretoria Fleet Electrical & Trailer (Demo)','Pretoria Fleet Electrical & Trailer','auto_electrician','pending_review','ZA','+278210200005','a1000000-0000-0000-0000-000000000016',false,NULL,NULL,now(),'Naledi Mokoena',NULL,'[]',10,false,'{}','Synthetic pending-review demo company. No documents supplied.','Trailer wiring, alternators, starter systems and brake electronics.'),
 ('b2000000-0000-0000-0000-000000000006','Maputo Corridor Tow & Recovery (Demo)','Maputo Corridor Tow & Recovery','recovery_operator','pending_review','MZ','+258821200006','a2000000-0000-0000-0000-000000000001',true,NULL,NULL,now(),'Amina Jamal','MZ-DEMO-PR-006','[]',10,false,'{}','Synthetic pending-review demo company. No documents supplied.','Corridor recovery, towing and trailer support.')
ON CONFLICT (id) DO NOTHING;

-- Capabilities make the applications structurally eligible for review while
-- the absence of supplier_documents deliberately creates the missing-document flag.
INSERT INTO public.supplier_capabilities (supplier_id, asset_class_id, system_id, source, confidence, active)
SELECT v.sid::uuid, ac.id, sy.id, 'self_declared'::public.capability_source, 0.75, true
FROM (VALUES
 ('b2000000-0000-0000-0000-000000000001','engine'),('b2000000-0000-0000-0000-000000000001','brakes'),('b2000000-0000-0000-0000-000000000001','transmission'),
 ('b2000000-0000-0000-0000-000000000002','body'),('b2000000-0000-0000-0000-000000000002','tyres'),('b2000000-0000-0000-0000-000000000002','brakes'),
 ('b2000000-0000-0000-0000-000000000003','fuel'),('b2000000-0000-0000-0000-000000000003','electrical'),('b2000000-0000-0000-0000-000000000003','brakes'),
 ('b2000000-0000-0000-0000-000000000004','engine'),('b2000000-0000-0000-0000-000000000004','cooling'),('b2000000-0000-0000-0000-000000000004','electrical'),
 ('b2000000-0000-0000-0000-000000000005','electrical'),('b2000000-0000-0000-0000-000000000005','brakes'),('b2000000-0000-0000-0000-000000000005','tyres'),
 ('b2000000-0000-0000-0000-000000000006','body'),('b2000000-0000-0000-0000-000000000006','tyres'),('b2000000-0000-0000-0000-000000000006','brakes')
) v(sid, sys)
JOIN public.systems sy ON sy.code = v.sys
JOIN public.asset_classes ac ON ac.code IN ('heavy_truck','trailer')
ON CONFLICT DO NOTHING;

ALTER TABLE public.suppliers ENABLE TRIGGER suppliers_approval_guard;
ALTER TABLE public.suppliers ENABLE TRIGGER suppliers_self_service_guard;
