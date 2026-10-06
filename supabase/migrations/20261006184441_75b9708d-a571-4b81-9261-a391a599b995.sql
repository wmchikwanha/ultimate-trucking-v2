DO $do$
DECLARE d text;
BEGIN
  SELECT pg_get_functiondef('public.rank_suppliers(uuid,uuid,double precision,double precision,integer,uuid[])'::regprocedure) INTO d;
  d := replace(d, 'ST_Distance(l.geog, (SELECT g FROM here)) / 1000.0 AS km', '(ST_Distance(l.geog, (SELECT g FROM here)) / 1000.0)::numeric AS km');
  EXECUTE d;
END
$do$;