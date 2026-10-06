DO $do$
DECLARE d text;
BEGIN
  SELECT pg_get_functiondef('public.rank_suppliers(uuid,uuid,double precision,double precision,integer,uuid[])'::regprocedure) INTO d;
  d := replace(d, '''radius_km'', _radius_km)',
    '''radius_km'', _radius_km,
      ''corridor'', (SELECT jsonb_build_object(''name'', lc.name, ''route'', lc.description,
                       ''you_km'', round((ST_Distance(lc.path, (SELECT g FROM here)) / 1000.0)::numeric, 1))
                     FROM public.supplier_coverage sc JOIN public.location_corridors lc ON lc.id = sc.corridor_id
                     WHERE sc.supplier_id = x.id AND ST_DWithin(lc.path, (SELECT g FROM here), 75000)
                     ORDER BY ST_Distance(lc.path, (SELECT g FROM here)) LIMIT 1))');
  IF position('corridor' in d) = 0 THEN RAISE EXCEPTION 'patch not applied'; END IF;
  EXECUTE d;
END
$do$;