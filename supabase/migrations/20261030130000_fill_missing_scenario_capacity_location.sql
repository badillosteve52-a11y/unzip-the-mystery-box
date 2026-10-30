WITH datos(nombre, capacidad, ubicacion) AS (VALUES
  ('Estadio 1', 350, 'Centro de Deportes'),
  ('Estadio 2', 350, 'Centro de Deportes'),
  ('Pista atlética Estadio 1', 700, 'Centro de Deportes'),
  ('Pista de running Estadio 2', 350, 'Centro de Deportes'),
  ('Cancha de vóley playa', 30, 'Centro de Deportes'),
  ('Cancha de ecuavóley de tierra', 30, 'Centro de Deportes'),
  ('Cancha de fútbol tenis', 20, 'Centro de Deportes'),
  ('Cancha de tenis 1', 60, 'Centro de Educación Física'),
  ('Cancha de tenis 2', 60, 'Centro de Educación Física'),
  ('Cancha de tenis 3', 60, 'Centro de Educación Física'),
  ('Cancha de tenis 4', 60, 'Centro de Educación Física'),
  ('Cancha de tenis 5', 60, 'Centro de Educación Física'),
  ('Cancha de ecuavóley de cemento 1', 30, 'Centro de Deportes'),
  ('Cancha de ecuavóley de cemento 2', 30, 'Centro de Deportes'),
  ('Cancha de ecuavóley de cemento 3', 30, 'Centro de Deportes'),
  ('Cancha central de básquet 1', 100, 'Centro de Educación Física'),
  ('Cancha central de básquet 2', 100, 'Centro de Educación Física')
)
UPDATE public.escenarios e
SET capacidad = COALESCE(e.capacidad, d.capacidad),
    ubicacion = CASE
      WHEN e.ubicacion IS NULL OR trim(e.ubicacion) = '' OR lower(trim(e.ubicacion)) = 'no especificada'
      THEN d.ubicacion ELSE e.ubicacion END
FROM datos d
WHERE e.nombre = d.nombre
  AND (e.capacidad IS NULL OR e.ubicacion IS NULL OR trim(e.ubicacion) = '' OR lower(trim(e.ubicacion)) = 'no especificada');
