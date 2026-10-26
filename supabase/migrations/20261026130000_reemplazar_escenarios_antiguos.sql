-- Reemplaza únicamente el inventario de escenarios por la lista solicitada.
-- No modifica clubes, deportistas, selecciones ni sus integrantes.
delete from public.escenarios
where lower(btrim(nombre)) not in (
  lower('Estadio 1'), lower('Estadio 2'),
  lower('Pista atlética Estadio 1'), lower('Pista Estadio 2'), lower('Pista de running Estadio 2'),
  lower('Cancha de vóley playa'), lower('Cancha de ecuavóley de tierra'), lower('Cancha de fútbol tenis'),
  lower('Cancha sintética de fútbol'), lower('Gimnasio institucional'),
  lower('Cancha de tenis 1'), lower('Cancha de tenis 2'), lower('Cancha de tenis 3'), lower('Cancha de tenis 4'), lower('Cancha de tenis 5'),
  lower('Cancha de ecuavóley de cemento 1'), lower('Cancha de ecuavóley de cemento 2'), lower('Cancha de ecuavóley de cemento 3'),
  lower('Cancha central de básquet 1'), lower('Cancha central de básquet 2')
);

with catalogo(nombre, tipo, ubicacion, grupo) as (
  values
    ('Estadio 1', 'Estadio', 'Campus Matriz - Estadio 1', null::text),
    ('Estadio 2', 'Estadio', 'Campus Matriz - Estadio 2', null::text),
    ('Pista atlética Estadio 1', 'Pista Atlética', 'Campus Matriz - Estadio 1', null::text),
    ('Pista Estadio 2', 'Pista Atlética', 'Campus Matriz - Estadio 2', null::text),
    ('Pista de running Estadio 2', 'Pista Atlética', 'Campus Matriz - Estadio 2', null::text),
    ('Cancha de vóley playa', 'Cancha de Arena', 'Campus Matriz - Centro de Deportes', null::text),
    ('Cancha de ecuavóley de tierra', 'Cancha de Ecuavóley', 'Campus Matriz - Centro de Deportes', null::text),
    ('Cancha de fútbol tenis', 'Cancha de Fútbol Tenis', 'Campus Matriz - Centro de Deportes', null::text),
    ('Cancha sintética de fútbol', 'Cancha Sintética', 'Campus Matriz - Centro de Deportes', null::text),
    ('Gimnasio institucional', 'Gimnasio', 'Campus Matriz - Centro de Deportes', null::text),
    ('Cancha de tenis 1', 'Cancha de Tenis', 'Campus Matriz - Centro de Deportes', 'Canchas de tenis'),
    ('Cancha de tenis 2', 'Cancha de Tenis', 'Campus Matriz - Centro de Deportes', 'Canchas de tenis'),
    ('Cancha de tenis 3', 'Cancha de Tenis', 'Campus Matriz - Centro de Deportes', 'Canchas de tenis'),
    ('Cancha de tenis 4', 'Cancha de Tenis', 'Campus Matriz - Centro de Deportes', 'Canchas de tenis'),
    ('Cancha de tenis 5', 'Cancha de Tenis', 'Campus Matriz - Centro de Deportes', 'Canchas de tenis'),
    ('Cancha de ecuavóley de cemento 1', 'Cancha de Ecuavóley', 'Campus Matriz - Centro de Deportes', 'Canchas de ecuavóley de cemento'),
    ('Cancha de ecuavóley de cemento 2', 'Cancha de Ecuavóley', 'Campus Matriz - Centro de Deportes', 'Canchas de ecuavóley de cemento'),
    ('Cancha de ecuavóley de cemento 3', 'Cancha de Ecuavóley', 'Campus Matriz - Centro de Deportes', 'Canchas de ecuavóley de cemento'),
    ('Cancha central de básquet 1', 'Cancha de Baloncesto', 'Campus Matriz - Centro de Deportes', 'Canchas centrales de básquet'),
    ('Cancha central de básquet 2', 'Cancha de Baloncesto', 'Campus Matriz - Centro de Deportes', 'Canchas centrales de básquet')
)
insert into public.escenarios (nombre, capacidad, tipo, ubicacion, observaciones, detalles, es_ejemplo)
select c.nombre, null, c.tipo, c.ubicacion, '',
       case when c.grupo is null then '{}'::jsonb else jsonb_build_object('grupo', c.grupo) end,
       false
from catalogo c
where not exists (
  select 1 from public.escenarios e where lower(btrim(e.nombre)) = lower(c.nombre)
);

