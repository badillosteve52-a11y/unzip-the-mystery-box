CREATE TEMP TABLE _clubes_periodo_duplicados AS
WITH duplicados AS (
  SELECT
    id,
    first_value(id) OVER (
      PARTITION BY periodo_id, lower(btrim(nombre)), deporte_id
      ORDER BY created_at, id
    ) AS club_canonico,
    row_number() OVER (
      PARTITION BY periodo_id, lower(btrim(nombre)), deporte_id
      ORDER BY created_at, id
    ) AS numero
  FROM public.clubes
)
SELECT id AS club_duplicado, club_canonico
FROM duplicados
WHERE numero > 1;

UPDATE public.clubes canonico
SET es_ejemplo = false
WHERE canonico.id IN (
  SELECT duplicados.club_canonico
  FROM _clubes_periodo_duplicados duplicados
  JOIN public.clubes duplicado ON duplicado.id = duplicados.club_duplicado
  WHERE NOT duplicado.es_ejemplo
);

INSERT INTO public.club_miembros (club_id, deportista_id)
SELECT duplicados.club_canonico, miembros.deportista_id
FROM _clubes_periodo_duplicados duplicados
JOIN public.club_miembros miembros ON miembros.club_id = duplicados.club_duplicado
ON CONFLICT (club_id, deportista_id) DO NOTHING;

INSERT INTO public.accesos_clubes (user_id, club_id)
SELECT DISTINCT accesos.user_id, duplicados.club_canonico
FROM _clubes_periodo_duplicados duplicados
JOIN public.accesos_clubes accesos ON accesos.club_id = duplicados.club_duplicado
ON CONFLICT (user_id, club_id) DO NOTHING;

UPDATE public.entrenadores entrenadores
SET club_id = duplicados.club_canonico
FROM _clubes_periodo_duplicados duplicados
WHERE entrenadores.club_id = duplicados.club_duplicado;

DELETE FROM public.accesos_clubes accesos
USING _clubes_periodo_duplicados duplicados
WHERE accesos.club_id = duplicados.club_duplicado;

DELETE FROM public.club_miembros miembros
USING _clubes_periodo_duplicados duplicados
WHERE miembros.club_id = duplicados.club_duplicado;

DELETE FROM public.clubes clubes
USING _clubes_periodo_duplicados duplicados
WHERE clubes.id = duplicados.club_duplicado;

DROP TABLE _clubes_periodo_duplicados;

CREATE UNIQUE INDEX clubes_periodo_nombre_deporte_unique
ON public.clubes (periodo_id, lower(btrim(nombre)), deporte_id)
WHERE periodo_id IS NOT NULL AND deporte_id IS NOT NULL;

CREATE UNIQUE INDEX clubes_periodo_nombre_sin_deporte_unique
ON public.clubes (periodo_id, lower(btrim(nombre)))
WHERE periodo_id IS NOT NULL AND deporte_id IS NULL;

CREATE UNIQUE INDEX clubes_sin_periodo_nombre_deporte_unique
ON public.clubes (lower(btrim(nombre)), deporte_id)
WHERE periodo_id IS NULL AND deporte_id IS NOT NULL;

CREATE UNIQUE INDEX clubes_sin_periodo_nombre_sin_deporte_unique
ON public.clubes (lower(btrim(nombre)))
WHERE periodo_id IS NULL AND deporte_id IS NULL;

CREATE TABLE public.herencias_clubes_periodo (
  destino_periodo_id uuid PRIMARY KEY REFERENCES public.periodos(id) ON DELETE CASCADE,
  origen_periodo_id uuid REFERENCES public.periodos(id) ON DELETE SET NULL,
  creada_en timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.herencias_clubes_periodo ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.herencias_clubes_periodo FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.herencias_clubes_periodo TO service_role;

CREATE OR REPLACE FUNCTION public.heredar_clubes_periodo(_origen_id uuid, _destino_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'solo el administrador puede heredar clubes entre períodos';
  END IF;

  PERFORM 1
  FROM public.periodos
  WHERE id = _destino_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'el período destino no existe';
  END IF;

  IF _origen_id = _destino_id THEN
    RAISE EXCEPTION 'el período origen debe ser distinto al destino';
  END IF;

  IF _origen_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.periodos WHERE id = _origen_id
  ) THEN
    RAISE EXCEPTION 'el período origen no existe';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.herencias_clubes_periodo
    WHERE destino_periodo_id = _destino_id
  ) THEN
    RETURN false;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.clubes origen
    WHERE (_origen_id IS NULL AND origen.periodo_id IS NULL)
       OR origen.periodo_id = _origen_id
  ) THEN
    RETURN false;
  END IF;

  INSERT INTO public.clubes (nombre, deporte_id, periodo_id, es_ejemplo)
  SELECT origen.nombre, origen.deporte_id, _destino_id, false
  FROM public.clubes origen
  WHERE (_origen_id IS NULL AND origen.periodo_id IS NULL)
     OR origen.periodo_id = _origen_id
  ON CONFLICT DO NOTHING;

  WITH correspondencias AS (
    SELECT origen.id AS origen_id, destino.id AS destino_id
    FROM public.clubes origen
    JOIN LATERAL (
      SELECT club.id
      FROM public.clubes club
      WHERE club.periodo_id = _destino_id
        AND lower(btrim(club.nombre)) = lower(btrim(origen.nombre))
        AND club.deporte_id IS NOT DISTINCT FROM origen.deporte_id
      ORDER BY club.created_at, club.id
      LIMIT 1
    ) destino ON true
    WHERE (_origen_id IS NULL AND origen.periodo_id IS NULL)
       OR origen.periodo_id = _origen_id
  )
  INSERT INTO public.club_miembros (club_id, deportista_id)
  SELECT correspondencias.destino_id, miembros.deportista_id
  FROM correspondencias
  JOIN public.club_miembros miembros ON miembros.club_id = correspondencias.origen_id
  WHERE true
  ON CONFLICT (club_id, deportista_id) DO NOTHING;

  WITH correspondencias AS (
    SELECT origen.id AS origen_id, destino.id AS destino_id
    FROM public.clubes origen
    JOIN LATERAL (
      SELECT club.id
      FROM public.clubes club
      WHERE club.periodo_id = _destino_id
        AND lower(btrim(club.nombre)) = lower(btrim(origen.nombre))
        AND club.deporte_id IS NOT DISTINCT FROM origen.deporte_id
      ORDER BY club.created_at, club.id
      LIMIT 1
    ) destino ON true
    WHERE (_origen_id IS NULL AND origen.periodo_id IS NULL)
       OR origen.periodo_id = _origen_id
  )
  INSERT INTO public.accesos_clubes (user_id, club_id)
  SELECT accesos.user_id, correspondencias.destino_id
  FROM correspondencias
  JOIN public.accesos_clubes accesos ON accesos.club_id = correspondencias.origen_id
  WHERE true
  ON CONFLICT (user_id, club_id) DO NOTHING;

  INSERT INTO public.herencias_clubes_periodo (destino_periodo_id, origen_periodo_id)
  VALUES (_destino_id, _origen_id);

  RETURN true;
END;
$$;

DROP FUNCTION public.listar_grupos_acceso();
CREATE FUNCTION public.listar_grupos_acceso()
RETURNS TABLE (tipo text, grupo_id uuid, nombre text, periodo text, deporte text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'solo el administrador puede configurar accesos';
  END IF;

  RETURN QUERY
    SELECT 'seleccion'::text, seleccion.id, seleccion.nombre, periodo.nombre, deporte.nombre
    FROM public.selecciones seleccion
    LEFT JOIN public.periodos periodo ON periodo.id = seleccion.periodo_id
    LEFT JOIN public.deportes deporte ON deporte.id = seleccion.deporte_id
    ORDER BY seleccion.nombre, periodo.nombre, deporte.nombre;

  RETURN QUERY
    SELECT 'club'::text, club.id, club.nombre, periodo.nombre, deporte.nombre
    FROM public.clubes club
    LEFT JOIN public.periodos periodo ON periodo.id = club.periodo_id
    LEFT JOIN public.deportes deporte ON deporte.id = club.deporte_id
    ORDER BY club.nombre, periodo.nombre, deporte.nombre;
END;
$$;

CREATE OR REPLACE FUNCTION public.guardar_grupos_cuenta(_user_id uuid, _selecciones uuid[], _clubes uuid[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'solo el administrador puede asignar grupos';
  END IF;
  IF NOT public.has_role(_user_id, 'gestor_grupos') THEN
    RAISE EXCEPTION 'primero asigna el rol profesor / entrenador';
  END IF;

  DELETE FROM public.accesos_selecciones WHERE user_id = _user_id;
  DELETE FROM public.accesos_clubes WHERE user_id = _user_id;

  INSERT INTO public.accesos_selecciones (user_id, seleccion_id)
  SELECT _user_id, grupo_id
  FROM (
    SELECT DISTINCT unnest(coalesce(_selecciones, '{}'::uuid[])) AS grupo_id
  ) grupos
  WHERE true
  ON CONFLICT (user_id, seleccion_id) DO NOTHING;

  INSERT INTO public.accesos_clubes (user_id, club_id)
  SELECT _user_id, grupo_id
  FROM (
    SELECT DISTINCT unnest(coalesce(_clubes, '{}'::uuid[])) AS grupo_id
  ) grupos
  WHERE true
  ON CONFLICT (user_id, club_id) DO NOTHING;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.heredar_clubes_periodo(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.heredar_clubes_periodo(uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.listar_grupos_acceso() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.listar_grupos_acceso() TO authenticated;

REVOKE ALL ON FUNCTION public.guardar_grupos_cuenta(uuid, uuid[], uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guardar_grupos_cuenta(uuid, uuid[], uuid[]) TO authenticated;
