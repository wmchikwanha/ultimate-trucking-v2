-- Regional demo supplier expansion for Match Engine testing.
-- These are synthetic seed records, not real businesses. They are deliberately
-- diverse in geography and supplier kind so ranking and part search have useful
-- coverage beyond Botswana.

ALTER TABLE public.suppliers DISABLE TRIGGER suppliers_approval_guard;
ALTER TABLE public.suppliers DISABLE TRIGGER suppliers_self_service_guard;

INSERT INTO public.locations (id, name, kind, country_code, geog) VALUES
 ('a1000000-0000-0000-0000-000000000001','Harare','supplier_base','ZW', ST_SetSRID(ST_MakePoint(31.0335,-17.8252),4326)::geography),
 ('a1000000-0000-0000-0000-000000000002','Bulawayo','supplier_base','ZW', ST_SetSRID(ST_MakePoint(28.5833,-20.1325),4326)::geography),
 ('a1000000-0000-0000-0000-000000000003','Masvingo','supplier_base','ZW', ST_SetSRID(ST_MakePoint(30.8328,-20.0744),4326)::geography),
 ('a1000000-0000-0000-0000-000000000004','Nyamapanda','supplier_base','ZW', ST_SetSRID(ST_MakePoint(32.7378,-16.8919),4326)::geography),
 ('a1000000-0000-0000-0000-000000000005','Mutare','supplier_base','ZW', ST_SetSRID(ST_MakePoint(32.6709,-18.9707),4326)::geography),
 ('a1000000-0000-0000-0000-000000000006','Lusaka','supplier_base','ZM', ST_SetSRID(ST_MakePoint(28.3228,-15.3875),4326)::geography),
 ('a1000000-0000-0000-0000-000000000007','Ndola','supplier_base','ZM', ST_SetSRID(ST_MakePoint(28.6366,-12.9587),4326)::geography),
 ('a1000000-0000-0000-0000-000000000008','Livingstone','supplier_base','ZM', ST_SetSRID(ST_MakePoint(25.8543,-17.8419),4326)::geography),
 ('a1000000-0000-0000-0000-000000000009','Luanda','supplier_base','AO', ST_SetSRID(ST_MakePoint(13.2894,-8.8390),4326)::geography),
 ('a1000000-0000-0000-0000-000000000010','Lubango','supplier_base','AO', ST_SetSRID(ST_MakePoint(13.4925,-14.9177),4326)::geography),
 ('a1000000-0000-0000-0000-000000000011','Huambo','supplier_base','AO', ST_SetSRID(ST_MakePoint(15.7392,-12.7761),4326)::geography),
 ('a1000000-0000-0000-0000-000000000012','Lilongwe','supplier_base','MW', ST_SetSRID(ST_MakePoint(33.7741,-13.9626),4326)::geography),
 ('a1000000-0000-0000-0000-000000000013','Blantyre','supplier_base','MW', ST_SetSRID(ST_MakePoint(35.0058,-15.7861),4326)::geography),
 ('a1000000-0000-0000-0000-000000000014','Mzuzu','supplier_base','MW', ST_SetSRID(ST_MakePoint(34.0151,-11.4581),4326)::geography),
 ('a1000000-0000-0000-0000-000000000015','Johannesburg','supplier_base','ZA', ST_SetSRID(ST_MakePoint(28.0473,-26.2041),4326)::geography),
 ('a1000000-0000-0000-0000-000000000016','Pretoria','supplier_base','ZA', ST_SetSRID(ST_MakePoint(28.2293,-25.7479),4326)::geography),
 ('a1000000-0000-0000-0000-000000000017','Durban','supplier_base','ZA', ST_SetSRID(ST_MakePoint(31.0218,-29.8587),4326)::geography)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.suppliers
 (id, legal_name, trading_name, kind, status, country_code, phone, base_location_id,
  operates_24_7, approved_at, contact_full_name, supplier_references, onboarding_step,
  is_available, handled_fault_type_ids, notes, capability_description)
VALUES
 ('b1000000-0000-0000-0000-000000000001','Harare Fleet & Diesel (Demo)','Harare Fleet & Diesel','workshop','approved','ZW','+263710100001','a1000000-0000-0000-0000-000000000001',false,now(),'Tariro Moyo','[]',10,true,'{}','Synthetic regional demo provider.','Heavy-truck and trailer workshop covering engine, transmission, brakes and cooling.'),
 ('b1000000-0000-0000-0000-000000000002','Matabeleland Heavy Recovery (Demo)','Matabeleland Heavy Recovery','recovery_operator','approved','ZW','+263710100002','a1000000-0000-0000-0000-000000000002',true,now(),'Sibusiso Ncube','[]',10,true,'{}','Synthetic regional demo provider.','24/7 heavy recovery, roadside mechanical support and tyre response.'),
 ('b1000000-0000-0000-0000-000000000003','Masvingo Mobile Truck Care (Demo)','Masvingo Mobile Truck Care','mobile_mechanic','approved','ZW','+263710100003','a1000000-0000-0000-0000-000000000003',true,now(),'Rufaro Chikore','[]',10,true,'{}','Synthetic regional demo provider.','Mobile diesel mechanic for engine, fuel, electrical and brake faults.'),
 ('b1000000-0000-0000-0000-000000000004','Nyamapanda Border Parts Link (Demo)','Nyamapanda Border Parts Link','parts_supplier','approved','ZW','+263710100004','a1000000-0000-0000-0000-000000000004',false,now(),'Farai Muchengeti','[]',10,true,'{}','Synthetic regional demo provider.','Cross-border parts desk with fuel, electrical and brake stock.'),
 ('b1000000-0000-0000-0000-000000000005','Mutare Trailer & Auto Electrical (Demo)','Mutare Trailer & Auto Electrical','auto_electrician','approved','ZW','+263710100005','a1000000-0000-0000-0000-000000000005',false,now(),'Chenai Dube','[]',10,true,'{}','Synthetic regional demo provider.','Trailer wiring, alternators, starter systems and brake electronics.'),
 ('b1000000-0000-0000-0000-000000000006','Lusaka Commercial Vehicle Works (Demo)','Lusaka Commercial Vehicle Works','workshop','approved','ZM','+260970100006','a1000000-0000-0000-0000-000000000006',false,now(),'Chanda Mwansa','[]',10,true,'{}','Synthetic regional demo provider.','Fleet workshop covering heavy trucks, trailers, engine and suspension.'),
 ('b1000000-0000-0000-0000-000000000007','Copperbelt Recovery & Tyres (Demo)','Copperbelt Recovery & Tyres','recovery_operator','approved','ZM','+260970100007','a1000000-0000-0000-0000-000000000007',true,now(),'Bwalya Phiri','[]',10,true,'{}','Synthetic regional demo provider.','Heavy recovery, tyre changes and cross-Copperbelt response.'),
 ('b1000000-0000-0000-0000-000000000008','Livingstone Corridor Mobile Mechanics (Demo)','Livingstone Corridor Mobile Mechanics','mobile_mechanic','approved','ZM','+260970100008','a1000000-0000-0000-0000-000000000008',true,now(),'Mulenga Banda','[]',10,true,'{}','Synthetic regional demo provider.','Mobile support for corridor trucks, fuel, cooling, brakes and electrical faults.'),
 ('b1000000-0000-0000-0000-000000000009','Luanda Heavy Vehicle Service Hub (Demo)','Luanda Heavy Vehicle Service Hub','workshop','approved','AO','+244923100009','a1000000-0000-0000-0000-000000000009',false,now(),'Joao Manuel','[]',10,true,'{}','Synthetic regional demo provider.','Urban heavy-vehicle workshop for engine, transmission, hydraulics and brakes.'),
 ('b1000000-0000-0000-0000-000000000010','Lubango Long-Haul Recovery (Demo)','Lubango Long-Haul Recovery','recovery_operator','approved','AO','+244923100010','a1000000-0000-0000-0000-000000000010',true,now(),'Ana Tchissola','[]',10,true,'{}','Synthetic regional demo provider.','24/7 long-haul recovery with trailer and tyre support.'),
 ('b1000000-0000-0000-0000-000000000011','Huambo Fleet Parts Exchange (Demo)','Huambo Fleet Parts Exchange','parts_supplier','approved','AO','+244923100011','a1000000-0000-0000-0000-000000000011',false,now(),'Mateus Chivinda','[]',10,true,'{}','Synthetic regional demo provider.','Commercial vehicle parts stock for fuel, electrical, brake and cooling systems.'),
 ('b1000000-0000-0000-0000-000000000012','Lilongwe Mobile Diesel Response (Demo)','Lilongwe Mobile Diesel Response','mobile_mechanic','approved','MW','+265991000012','a1000000-0000-0000-0000-000000000012',true,now(),'Thoko Kalua','[]',10,true,'{}','Synthetic regional demo provider.','Mobile diesel diagnostics, fuel, engine and cooling response.'),
 ('b1000000-0000-0000-0000-000000000013','Blantyre Truck & Trailer Works (Demo)','Blantyre Truck & Trailer Works','workshop','approved','MW','+265991000013','a1000000-0000-0000-0000-000000000013',false,now(),'Madalitso Phiri','[]',10,true,'{}','Synthetic regional demo provider.','Truck and trailer workshop for brakes, suspension, transmission and tyres.'),
 ('b1000000-0000-0000-0000-000000000014','Mzuzu North Corridor Recovery (Demo)','Mzuzu North Corridor Recovery','recovery_operator','approved','MW','+265991000014','a1000000-0000-0000-0000-000000000014',true,now(),'Yamikani Tembo','[]',10,true,'{}','Synthetic regional demo provider.','Northern-corridor recovery and mobile heavy-vehicle assistance.'),
 ('b1000000-0000-0000-0000-000000000015','Johannesburg Fleet Parts Network (Demo)','Johannesburg Fleet Parts Network','parts_supplier','approved','ZA','+27821000015','a1000000-0000-0000-0000-000000000015',false,now(),'Lerato Molefe','[]',10,true,'{}','Synthetic regional demo provider.','Broad commercial parts inventory with national dispatch potential.'),
 ('b1000000-0000-0000-0000-000000000016','Pretoria Heavy Truck Centre (Demo)','Pretoria Heavy Truck Centre','workshop','approved','ZA','+27821000016','a1000000-0000-0000-0000-000000000016',false,now(),'Pieter Botha','[]',10,true,'{}','Synthetic regional demo provider.','Heavy-truck workshop for engine, transmission, hydraulics and electrical faults.'),
 ('b1000000-0000-0000-0000-000000000017','Durban Coastal Recovery & Tow (Demo)','Durban Coastal Recovery & Tow','recovery_operator','approved','ZA','+27821000017','a1000000-0000-0000-0000-000000000017',true,now(),'Nandi Khumalo','[]',10,true,'{}','Synthetic regional demo provider.','24/7 recovery and towing for heavy vehicles, trailers and tyres.')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.suppliers ENABLE TRIGGER suppliers_approval_guard;
ALTER TABLE public.suppliers ENABLE TRIGGER suppliers_self_service_guard;

-- Broad, active capability coverage for both heavy trucks and trailers.
INSERT INTO public.supplier_capabilities (supplier_id, asset_class_id, system_id, source, confidence, active)
SELECT v.sid::uuid, ac.id, sy.id, 'self_declared'::public.capability_source, v.confidence, true
FROM (VALUES
 ('b1000000-0000-0000-0000-000000000001','engine',0.90),('b1000000-0000-0000-0000-000000000001','transmission',0.85),('b1000000-0000-0000-0000-000000000001','brakes',0.90),('b1000000-0000-0000-0000-000000000001','cooling',0.85),
 ('b1000000-0000-0000-0000-000000000002','body',0.90),('b1000000-0000-0000-0000-000000000002','tyres',0.90),('b1000000-0000-0000-0000-000000000002','brakes',0.80),
 ('b1000000-0000-0000-0000-000000000003','engine',0.90),('b1000000-0000-0000-0000-000000000003','fuel',0.90),('b1000000-0000-0000-0000-000000000003','electrical',0.80),('b1000000-0000-0000-0000-000000000003','brakes',0.75),
 ('b1000000-0000-0000-0000-000000000004','fuel',0.85),('b1000000-0000-0000-0000-000000000004','electrical',0.85),('b1000000-0000-0000-0000-000000000004','brakes',0.80),
 ('b1000000-0000-0000-0000-000000000005','electrical',0.95),('b1000000-0000-0000-0000-000000000005','brakes',0.85),('b1000000-0000-0000-0000-000000000005','tyres',0.75),
 ('b1000000-0000-0000-0000-000000000006','engine',0.90),('b1000000-0000-0000-0000-000000000006','suspension',0.85),('b1000000-0000-0000-0000-000000000006','transmission',0.85),('b1000000-0000-0000-0000-000000000006','brakes',0.85),
 ('b1000000-0000-0000-0000-000000000007','body',0.90),('b1000000-0000-0000-0000-000000000007','tyres',0.95),('b1000000-0000-0000-0000-000000000007','brakes',0.85),
 ('b1000000-0000-0000-0000-000000000008','engine',0.85),('b1000000-0000-0000-0000-000000000008','cooling',0.85),('b1000000-0000-0000-0000-000000000008','electrical',0.80),('b1000000-0000-0000-0000-000000000008','fuel',0.80),
 ('b1000000-0000-0000-0000-000000000009','engine',0.90),('b1000000-0000-0000-0000-000000000009','transmission',0.85),('b1000000-0000-0000-0000-000000000009','hydraulics',0.85),('b1000000-0000-0000-0000-000000000009','brakes',0.85),
 ('b1000000-0000-0000-0000-000000000010','body',0.90),('b1000000-0000-0000-0000-000000000010','tyres',0.90),('b1000000-0000-0000-0000-000000000010','brakes',0.80),
 ('b1000000-0000-0000-0000-000000000011','fuel',0.85),('b1000000-0000-0000-0000-000000000011','electrical',0.85),('b1000000-0000-0000-0000-000000000011','brakes',0.80),('b1000000-0000-0000-0000-000000000011','cooling',0.80),
 ('b1000000-0000-0000-0000-000000000012','engine',0.90),('b1000000-0000-0000-0000-000000000012','fuel',0.90),('b1000000-0000-0000-0000-000000000012','cooling',0.85),
 ('b1000000-0000-0000-0000-000000000013','brakes',0.90),('b1000000-0000-0000-0000-000000000013','suspension',0.85),('b1000000-0000-0000-0000-000000000013','transmission',0.85),('b1000000-0000-0000-0000-000000000013','tyres',0.80),
 ('b1000000-0000-0000-0000-000000000014','body',0.90),('b1000000-0000-0000-0000-000000000014','tyres',0.90),('b1000000-0000-0000-0000-000000000014','engine',0.80),
 ('b1000000-0000-0000-0000-000000000015','engine',0.85),('b1000000-0000-0000-0000-000000000015','electrical',0.85),('b1000000-0000-0000-0000-000000000015','brakes',0.85),('b1000000-0000-0000-0000-000000000015','cooling',0.80),
 ('b1000000-0000-0000-0000-000000000016','engine',0.95),('b1000000-0000-0000-0000-000000000016','transmission',0.90),('b1000000-0000-0000-0000-000000000016','hydraulics',0.85),('b1000000-0000-0000-0000-000000000016','electrical',0.85),
 ('b1000000-0000-0000-0000-000000000017','body',0.90),('b1000000-0000-0000-0000-000000000017','tyres',0.90),('b1000000-0000-0000-0000-000000000017','brakes',0.85)
) v(sid, sys, confidence)
JOIN public.systems sy ON sy.code = v.sys
JOIN public.asset_classes ac ON ac.code IN ('heavy_truck','trailer')
ON CONFLICT DO NOTHING;

-- Coverage is deliberately local/regional; the Match Engine can still search
-- across borders by using a larger radius where appropriate.
INSERT INTO public.supplier_coverage (supplier_id, country_code, radius_km, response_time_minutes) VALUES
 ('b1000000-0000-0000-0000-000000000001','ZW',220,90),('b1000000-0000-0000-0000-000000000002','ZW',450,75),('b1000000-0000-0000-0000-000000000003','ZW',260,60),('b1000000-0000-0000-0000-000000000004','ZW',300,180),('b1000000-0000-0000-0000-000000000005','ZW',300,90),
 ('b1000000-0000-0000-0000-000000000006','ZM',250,90),('b1000000-0000-0000-0000-000000000007','ZM',350,75),('b1000000-0000-0000-0000-000000000008','ZM',350,60),
 ('b1000000-0000-0000-0000-000000000009','AO',250,100),('b1000000-0000-0000-0000-000000000010','AO',400,75),('b1000000-0000-0000-0000-000000000011','AO',300,180),
 ('b1000000-0000-0000-0000-000000000012','MW',250,60),('b1000000-0000-0000-0000-000000000013','MW',300,90),('b1000000-0000-0000-0000-000000000014','MW',400,75),
 ('b1000000-0000-0000-0000-000000000015','ZA',350,180),('b1000000-0000-0000-0000-000000000016','ZA',300,90),('b1000000-0000-0000-0000-000000000017','ZA',400,75)
ON CONFLICT DO NOTHING;

-- Seed representative parts stock so part searches can return regional options.
-- BWP is the existing demo currency in the seed dataset and keeps this migration
-- independent of any optional local-currency catalogue entries.
INSERT INTO public.supplier_parts (supplier_id, part_id, stock_qty, price_minor, currency_code) VALUES
 ('b1000000-0000-0000-0000-000000000004','c0000000-0000-0000-0000-000000000001',8,85000,'BWP'),
 ('b1000000-0000-0000-0000-000000000004','c0000000-0000-0000-0000-000000000002',12,42000,'BWP'),
 ('b1000000-0000-0000-0000-000000000004','c0000000-0000-0000-0000-000000000003',6,39000,'BWP'),
 ('b1000000-0000-0000-0000-000000000005','c0000000-0000-0000-0000-000000000004',5,520000,'BWP'),
 ('b1000000-0000-0000-0000-000000000005','c0000000-0000-0000-0000-000000000005',8,110000,'BWP'),
 ('b1000000-0000-0000-0000-000000000006','c0000000-0000-0000-0000-000000000001',10,85000,'BWP'),
 ('b1000000-0000-0000-0000-000000000006','c0000000-0000-0000-0000-000000000005',6,110000,'BWP'),
 ('b1000000-0000-0000-0000-000000000011','c0000000-0000-0000-0000-000000000003',10,39000,'BWP'),
 ('b1000000-0000-0000-0000-000000000011','c0000000-0000-0000-0000-000000000004',5,520000,'BWP'),
 ('b1000000-0000-0000-0000-000000000015','c0000000-0000-0000-0000-000000000001',20,85000,'BWP'),
 ('b1000000-0000-0000-0000-000000000015','c0000000-0000-0000-0000-000000000002',25,42000,'BWP'),
 ('b1000000-0000-0000-0000-000000000015','c0000000-0000-0000-0000-000000000003',12,39000,'BWP'),
 ('b1000000-0000-0000-0000-000000000015','c0000000-0000-0000-0000-000000000004',8,520000,'BWP'),
 ('b1000000-0000-0000-0000-000000000015','c0000000-0000-0000-0000-000000000005',15,110000,'BWP'),
 ('b1000000-0000-0000-0000-000000000016','c0000000-0000-0000-0000-000000000001',7,85000,'BWP'),
 ('b1000000-0000-0000-0000-000000000016','c0000000-0000-0000-0000-000000000005',7,110000,'BWP')
ON CONFLICT DO NOTHING;