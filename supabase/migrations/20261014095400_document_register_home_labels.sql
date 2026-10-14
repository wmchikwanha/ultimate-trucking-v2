INSERT INTO public.translations(locale,namespace,key,value,source,reviewed) VALUES
('af','ui','module.document_register.tagline','Dokumentvereistes per land en ambag','machine',false),
('en','ui','module.document_register.tagline','Country and trade document requirements','human',true),
('sn','ui','module.document_register.tagline','Magwaro anodiwa nenyika nebasa','machine',false),
('tn','ui','module.document_register.tagline','Ditlhokego tsa ditokomane tsa naga le tiro','machine',false),
('zu','ui','module.document_register.tagline','Amadokhumenti adingekayo ngezwe nangomsebenzi','machine',false)
ON CONFLICT(locale,namespace,key) DO UPDATE SET value=EXCLUDED.value,source=EXCLUDED.source,reviewed=EXCLUDED.reviewed;
