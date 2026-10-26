-- La piscina forma parte del catálogo vigente; elimina únicamente escenarios
-- ajenos a la lista aprobada y añade la piscina si aún no existe.
delete from public.escenarios
where lower(btrim(nombre)) not in (
  lower('Estadio 1'), lower('Estadio 2'),
  lower('Pista atlética Estadio 1'), lower('Pista Estadio 2'), lower('Pista de running Estadio 2'),
  lower('Cancha de vóley playa'), lower('Cancha de ecuavóley de tierra'), lower('Cancha de fútbol tenis'),
  lower('Cancha sintética de fútbol'), lower('Gimnasio institucional'), lower('Piscina'),
  lower('Cancha de tenis 1'), lower('Cancha de tenis 2'), lower('Cancha de tenis 3'), lower('Cancha de tenis 4'), lower('Cancha de tenis 5'),
  lower('Cancha de ecuavóley de cemento 1'), lower('Cancha de ecuavóley de cemento 2'), lower('Cancha de ecuavóley de cemento 3'),
  lower('Cancha central de básquet 1'), lower('Cancha central de básquet 2')
);

insert into public.escenarios (nombre, tipo, ubicacion, observaciones, detalles, es_ejemplo)
select 'Piscina', 'Piscina', 'Campus Matriz - Centro de Deportes', '', '{}'::jsonb, false
where not exists (
  select 1 from public.escenarios where lower(btrim(nombre)) = lower('Piscina')
);

