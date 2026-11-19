CREATE OR REPLACE FUNCTION public.puede_acceder_certificado_seleccion(_nombre_archivo text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  _carpeta text := (storage.foldername(_nombre_archivo))[1];
  _archivo text := storage.filename(_nombre_archivo);
  _seleccion_id uuid;
  _deportista_id uuid;
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN true;
  END IF;

  IF _nombre_archivo ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$' THEN
    _deportista_id := left(_nombre_archivo, length(_nombre_archivo) - 4)::uuid;
    RETURN EXISTS (
      SELECT 1
      FROM public.seleccion_miembros miembro
      WHERE miembro.deportista_id = _deportista_id
        AND public.puede_gestionar_grupo(auth.uid(), 'seleccion', miembro.seleccion_id)
    );
  END IF;

  IF _carpeta !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     OR _archivo !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$' THEN
    RETURN false;
  END IF;

  _seleccion_id := _carpeta::uuid;
  _deportista_id := left(_archivo, length(_archivo) - 4)::uuid;

  RETURN public.puede_gestionar_grupo(auth.uid(), 'seleccion', _seleccion_id)
    AND EXISTS (
      SELECT 1
      FROM public.seleccion_miembros miembro
      WHERE miembro.seleccion_id = _seleccion_id
        AND miembro.deportista_id = _deportista_id
    );
END;
$$;

CREATE INDEX IF NOT EXISTS idx_seleccion_miembros_deportista_seleccion
ON public.seleccion_miembros (deportista_id, seleccion_id);

REVOKE ALL ON FUNCTION public.puede_acceder_certificado_seleccion(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.puede_acceder_certificado_seleccion(text) TO authenticated;

DROP POLICY IF EXISTS "administradores y entrenadores leen certificados de selección" ON storage.objects;
CREATE POLICY "administradores y entrenadores leen certificados de selección"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'certificados-matricula'
  AND public.puede_acceder_certificado_seleccion(name)
);

DROP POLICY IF EXISTS "administradores y entrenadores cargan certificados de selección" ON storage.objects;
CREATE POLICY "administradores y entrenadores cargan certificados de selección"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'certificados-matricula'
  AND storage.extension(name) = 'pdf'
  AND public.puede_acceder_certificado_seleccion(name)
);

DROP POLICY IF EXISTS "administradores y entrenadores actualizan certificados de selección" ON storage.objects;
CREATE POLICY "administradores y entrenadores actualizan certificados de selección"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'certificados-matricula'
  AND public.puede_acceder_certificado_seleccion(name)
)
WITH CHECK (
  bucket_id = 'certificados-matricula'
  AND storage.extension(name) = 'pdf'
  AND public.puede_acceder_certificado_seleccion(name)
);
