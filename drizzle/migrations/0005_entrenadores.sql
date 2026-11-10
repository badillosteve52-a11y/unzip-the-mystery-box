CREATE TABLE public.entrenadores (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nombre text NOT NULL, apellido text NOT NULL, cedula text NOT NULL, cargo text NOT NULL, es_ejemplo boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entrenadores TO authenticated;
GRANT ALL ON public.entrenadores TO service_role;
ALTER TABLE public.entrenadores ENABLE ROW LEVEL SECURITY;
CREATE POLICY coordinador ON public.entrenadores FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));