DO $do$
DECLARE d text;
BEGIN
  SELECT pg_get_functiondef('public.rank_suppliers(uuid,uuid,double precision,double precision,integer,uuid[])'::regprocedure) INTO d;
  d := replace(d, 'DECLARE _sys uuid', E'#variable_conflict use_column\nDECLARE _sys uuid');
  EXECUTE d;
END
$do$;