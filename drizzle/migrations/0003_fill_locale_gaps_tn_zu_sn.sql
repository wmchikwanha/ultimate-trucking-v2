INSERT INTO public.translations (locale, namespace, key, value, source, reviewed)
SELECT v.locale, e.namespace, v.key, v.value, 'machine', false
FROM (VALUES
  ('tn','auth.email','Imeile'),('sn','auth.email','Email yako'),
  ('tn','auth.password','Lefoko la sephiri'),('sn','auth.password','Pasiwedhi'),
  ('tn','contact.email_label','Imeile'),('sn','contact.email_label','Email yedu'),
  ('sn','doc.company_registration','Kunyoreswa kwekambani'),
  ('sn','doc.national_id','Chitupa chenyika'),
  ('sn','doc.safety_certificate','Chitupa chekuchengetedza'),
  ('sn','doc.trade_certificate','Chitupa chebasa remaoko'),
  ('tn','equipment.air_compressor','Motšhine wa phefo'),('sn','equipment.air_compressor','Muchina wemhepo'),
  ('tn','equipment.crane','Kreine'),('sn','equipment.crane','Kireni'),
  ('sn','equipment.flatbed','Rori isina madziro'),
  ('tn','equipment.generator','Jenereitara'),
  ('tn','equipment.hydraulic_jack','Jeke ya haetroliki'),('sn','equipment.hydraulic_jack','Jeki yehaidhiroriki'),
  ('sn','equipment.tow_truck','Rori yekudhonza'),
  ('tn','help.faq3.q','Go diragala eng fa motlamedi a tsenya lokwalo lwa maaka kgotsa lo lo sa baleng?'),
  ('zu','help.faq3.q','Kwenzekani uma umhlinzeki elayisha idokhumenti engamanga noma engafundeki?'),
  ('tn','help.step4.title','Amogela, gana kgotsa kopa tse dingwe'),
  ('tn','module.dispatch.title','Romelo'),('tn','nav.dispatch','Romelo'),
  ('tn','module.help.title','Kaelo ya pontsho le dipotso'),('tn','nav.help','Kaelo ya pontsho le dipotso'),
  ('sn','nav.help','Gwara rekuratidza nemibvunzo'),
  ('tn','module.telematics.title','Tlhokomelo ya dikoloi'),('tn','nav.telematics','Tlhokomelo ya dikoloi'),
  ('sn','module.telematics.title','Kutarisa mota kure'),('sn','nav.telematics','Kutarisa mota kure'),
  ('sn','payment.mobile_money','Mari parunhare'),
  ('tn','register.code','Khoutu ya rejisetara'),('zu','register.code','Ikhodi yerejista'),('sn','register.code','Kodhi yerejista'),
  ('sn','role.admin','Mutungamiri'),('sn','role.auditor','Muongorori'),
  ('sn','supplier_kind.workshop','Wekishopu'),
  ('sn','supplier_status.draft','Gwaro risati rapera'),
  ('sn','sync.error','Kukanganisa kwekuwiriranisa'),
  ('sn','wizard.radius','Nharaunda (km)'),
  ('sn','wizard.reference_n','Mupupuri {n}')
) AS v(locale, key, value)
JOIN public.translations e ON e.locale = 'en' AND e.key = v.key
ON CONFLICT (locale, namespace, key) DO UPDATE
  SET value = EXCLUDED.value, source = EXCLUDED.source, reviewed = EXCLUDED.reviewed;