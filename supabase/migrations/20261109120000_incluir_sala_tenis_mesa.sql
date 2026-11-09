-- Incluye la sala de tenis de mesa sin duplicarla y completa sus datos oficiales.
update public.escenarios
set capacidad = 50,
    tipo = 'Sala de Tenis de Mesa',
    ubicacion = 'Centro de Educación Física'
where lower(btrim(nombre)) = lower('Sala de tenis de mesa');

insert into public.escenarios (nombre, capacidad, tipo, ubicacion, observaciones, detalles, es_ejemplo)
select 'Sala de tenis de mesa', 50, 'Sala de Tenis de Mesa', 'Centro de Educación Física', '', '{}'::jsonb, false
where not exists (
  select 1
  from public.escenarios
  where lower(btrim(nombre)) = lower('Sala de tenis de mesa')
);
