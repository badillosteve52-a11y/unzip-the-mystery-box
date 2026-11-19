CREATE OR REPLACE FUNCTION public.puede_gestionar_grupo(_user_id uuid, _tipo text, _grupo_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    AND (
      public.has_role(_user_id, 'admin')
      OR (
        public.has_role(_user_id, 'gestor_grupos')
        AND (
          (
            _tipo = 'seleccion'
            AND EXISTS (
              SELECT 1
              FROM public.accesos_selecciones acceso
              JOIN public.selecciones asignada ON asignada.id = acceso.seleccion_id
              LEFT JOIN public.deportes deporte_asignado ON deporte_asignado.id = asignada.deporte_id
              JOIN public.selecciones objetivo ON objetivo.id = _grupo_id
              LEFT JOIN public.deportes deporte_objetivo ON deporte_objetivo.id = objetivo.deporte_id
              WHERE acceso.user_id = _user_id
                AND lower(btrim(asignada.nombre)) = lower(btrim(objetivo.nombre))
                AND lower(btrim(coalesce(deporte_asignado.nombre, ''))) =
                    lower(btrim(coalesce(deporte_objetivo.nombre, '')))
            )
          )
          OR (
            _tipo = 'club'
            AND EXISTS (
              SELECT 1
              FROM public.accesos_clubes acceso
              JOIN public.clubes asignado ON asignado.id = acceso.club_id
              LEFT JOIN public.deportes deporte_asignado ON deporte_asignado.id = asignado.deporte_id
              JOIN public.clubes objetivo ON objetivo.id = _grupo_id
              LEFT JOIN public.deportes deporte_objetivo ON deporte_objetivo.id = objetivo.deporte_id
              WHERE acceso.user_id = _user_id
                AND lower(btrim(asignado.nombre)) = lower(btrim(objetivo.nombre))
                AND lower(btrim(coalesce(deporte_asignado.nombre, ''))) =
                    lower(btrim(coalesce(deporte_objetivo.nombre, '')))
            )
          )
        )
      )
    )
$$;

CREATE OR REPLACE FUNCTION public.listar_grupos_acceso()
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
    SELECT 'seleccion'::text, grupos.id, grupos.nombre, 'Todos los períodos'::text, grupos.deporte
    FROM (
      SELECT DISTINCT ON (
        lower(btrim(seleccion.nombre)),
        lower(btrim(coalesce(deporte.nombre, '')))
      )
        seleccion.id,
        seleccion.nombre,
        deporte.nombre AS deporte
      FROM public.selecciones seleccion
      LEFT JOIN public.deportes deporte ON deporte.id = seleccion.deporte_id
      ORDER BY
        lower(btrim(seleccion.nombre)),
        lower(btrim(coalesce(deporte.nombre, ''))),
        seleccion.created_at,
        seleccion.id
    ) grupos
    ORDER BY grupos.nombre, grupos.deporte;

  RETURN QUERY
    SELECT 'club'::text, grupos.id, grupos.nombre, 'Todos los períodos'::text, grupos.deporte
    FROM (
      SELECT DISTINCT ON (
        lower(btrim(club.nombre)),
        lower(btrim(coalesce(deporte.nombre, '')))
      )
        club.id,
        club.nombre,
        deporte.nombre AS deporte
      FROM public.clubes club
      LEFT JOIN public.deportes deporte ON deporte.id = club.deporte_id
      ORDER BY
        lower(btrim(club.nombre)),
        lower(btrim(coalesce(deporte.nombre, ''))),
        club.created_at,
        club.id
    ) grupos
    ORDER BY grupos.nombre, grupos.deporte;
END;
$$;

CREATE OR REPLACE FUNCTION public.listar_grupos_cuenta(_user_id uuid)
RETURNS TABLE (tipo text, grupo_id uuid)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'solo el administrador puede consultar accesos';
  END IF;

  RETURN QUERY
    WITH grupos AS (
      SELECT
        seleccion.id,
        lower(btrim(seleccion.nombre)) AS nombre_key,
        lower(btrim(coalesce(deporte.nombre, ''))) AS deporte_key,
        row_number() OVER (
          PARTITION BY lower(btrim(seleccion.nombre)), lower(btrim(coalesce(deporte.nombre, '')))
          ORDER BY seleccion.created_at, seleccion.id
        ) AS numero
      FROM public.selecciones seleccion
      LEFT JOIN public.deportes deporte ON deporte.id = seleccion.deporte_id
    ),
    asignados AS (
      SELECT DISTINCT
        lower(btrim(seleccion.nombre)) AS nombre_key,
        lower(btrim(coalesce(deporte.nombre, ''))) AS deporte_key
      FROM public.accesos_selecciones acceso
      JOIN public.selecciones seleccion ON seleccion.id = acceso.seleccion_id
      LEFT JOIN public.deportes deporte ON deporte.id = seleccion.deporte_id
      WHERE acceso.user_id = _user_id
    )
    SELECT 'seleccion'::text, grupos.id
    FROM grupos
    JOIN asignados USING (nombre_key, deporte_key)
    WHERE grupos.numero = 1;

  RETURN QUERY
    WITH grupos AS (
      SELECT
        club.id,
        lower(btrim(club.nombre)) AS nombre_key,
        lower(btrim(coalesce(deporte.nombre, ''))) AS deporte_key,
        row_number() OVER (
          PARTITION BY lower(btrim(club.nombre)), lower(btrim(coalesce(deporte.nombre, '')))
          ORDER BY club.created_at, club.id
        ) AS numero
      FROM public.clubes club
      LEFT JOIN public.deportes deporte ON deporte.id = club.deporte_id
    ),
    asignados AS (
      SELECT DISTINCT
        lower(btrim(club.nombre)) AS nombre_key,
        lower(btrim(coalesce(deporte.nombre, ''))) AS deporte_key
      FROM public.accesos_clubes acceso
      JOIN public.clubes club ON club.id = acceso.club_id
      LEFT JOIN public.deportes deporte ON deporte.id = club.deporte_id
      WHERE acceso.user_id = _user_id
    )
    SELECT 'club'::text, grupos.id
    FROM grupos
    JOIN asignados USING (nombre_key, deporte_key)
    WHERE grupos.numero = 1;
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

  WITH grupos_seleccionados AS (
    SELECT DISTINCT
      lower(btrim(seleccion.nombre)) AS nombre_key,
      lower(btrim(coalesce(deporte.nombre, ''))) AS deporte_key
    FROM unnest(coalesce(_selecciones, '{}'::uuid[])) AS seleccion_seleccionada(id)
    JOIN public.selecciones seleccion ON seleccion.id = seleccion_seleccionada.id
    LEFT JOIN public.deportes deporte ON deporte.id = seleccion.deporte_id
  )
  INSERT INTO public.accesos_selecciones (user_id, seleccion_id)
  SELECT _user_id, seleccion.id
  FROM public.selecciones seleccion
  LEFT JOIN public.deportes deporte ON deporte.id = seleccion.deporte_id
  JOIN grupos_seleccionados grupo
    ON grupo.nombre_key = lower(btrim(seleccion.nombre))
   AND grupo.deporte_key = lower(btrim(coalesce(deporte.nombre, '')))
  ON CONFLICT (user_id, seleccion_id) DO NOTHING;

  WITH grupos_seleccionados AS (
    SELECT DISTINCT
      lower(btrim(club.nombre)) AS nombre_key,
      lower(btrim(coalesce(deporte.nombre, ''))) AS deporte_key
    FROM unnest(coalesce(_clubes, '{}'::uuid[])) AS club_seleccionado(id)
    JOIN public.clubes club ON club.id = club_seleccionado.id
    LEFT JOIN public.deportes deporte ON deporte.id = club.deporte_id
  )
  INSERT INTO public.accesos_clubes (user_id, club_id)
  SELECT _user_id, club.id
  FROM public.clubes club
  LEFT JOIN public.deportes deporte ON deporte.id = club.deporte_id
  JOIN grupos_seleccionados grupo
    ON grupo.nombre_key = lower(btrim(club.nombre))
   AND grupo.deporte_key = lower(btrim(coalesce(deporte.nombre, '')))
  ON CONFLICT (user_id, club_id) DO NOTHING;

  RETURN true;
END;
$$;

DROP POLICY IF EXISTS "lectura grupos autorizados" ON public.deportistas;
CREATE POLICY "lectura grupos autorizados" ON public.deportistas
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1
    FROM public.seleccion_miembros miembro
    WHERE miembro.deportista_id = deportistas.id
      AND public.puede_gestionar_grupo(auth.uid(), 'seleccion', miembro.seleccion_id)
  )
  OR EXISTS (
    SELECT 1
    FROM public.club_miembros miembro
    WHERE miembro.deportista_id = deportistas.id
      AND public.puede_gestionar_grupo(auth.uid(), 'club', miembro.club_id)
  )
);

DROP POLICY IF EXISTS "editar deportistas de grupos asignados" ON public.deportistas;
CREATE POLICY "editar deportistas de grupos asignados" ON public.deportistas
FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1
    FROM public.seleccion_miembros miembro
    WHERE miembro.deportista_id = deportistas.id
      AND public.puede_gestionar_grupo(auth.uid(), 'seleccion', miembro.seleccion_id)
  )
  OR EXISTS (
    SELECT 1
    FROM public.club_miembros miembro
    WHERE miembro.deportista_id = deportistas.id
      AND public.puede_gestionar_grupo(auth.uid(), 'club', miembro.club_id)
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1
    FROM public.seleccion_miembros miembro
    WHERE miembro.deportista_id = deportistas.id
      AND public.puede_gestionar_grupo(auth.uid(), 'seleccion', miembro.seleccion_id)
  )
  OR EXISTS (
    SELECT 1
    FROM public.club_miembros miembro
    WHERE miembro.deportista_id = deportistas.id
      AND public.puede_gestionar_grupo(auth.uid(), 'club', miembro.club_id)
  )
);

DROP POLICY IF EXISTS "deportes de deportistas asignados" ON public.deportista_deportes;
CREATE POLICY "deportes de deportistas asignados" ON public.deportista_deportes
FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1
    FROM public.seleccion_miembros miembro
    WHERE miembro.deportista_id = deportista_deportes.deportista_id
      AND public.puede_gestionar_grupo(auth.uid(), 'seleccion', miembro.seleccion_id)
  )
  OR EXISTS (
    SELECT 1
    FROM public.club_miembros miembro
    WHERE miembro.deportista_id = deportista_deportes.deportista_id
      AND public.puede_gestionar_grupo(auth.uid(), 'club', miembro.club_id)
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1
    FROM public.seleccion_miembros miembro
    WHERE miembro.deportista_id = deportista_deportes.deportista_id
      AND public.puede_gestionar_grupo(auth.uid(), 'seleccion', miembro.seleccion_id)
  )
  OR EXISTS (
    SELECT 1
    FROM public.club_miembros miembro
    WHERE miembro.deportista_id = deportista_deportes.deportista_id
      AND public.puede_gestionar_grupo(auth.uid(), 'club', miembro.club_id)
  )
);

REVOKE ALL ON FUNCTION public.puede_gestionar_grupo(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.listar_grupos_acceso() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.listar_grupos_cuenta(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guardar_grupos_cuenta(uuid, uuid[], uuid[]) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.puede_gestionar_grupo(uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.listar_grupos_acceso() TO authenticated;
GRANT EXECUTE ON FUNCTION public.listar_grupos_cuenta(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.guardar_grupos_cuenta(uuid, uuid[], uuid[]) TO authenticated;
