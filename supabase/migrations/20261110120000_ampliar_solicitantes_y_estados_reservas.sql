-- Añade clasificación y datos de contacto del solicitante sin borrar el campo
-- carrera histórico de las reservas ya registradas.
alter table public.reservas_escenarios
  add column if not exists tipo_usuario text not null default 'Por clasificar',
  add column if not exists tipo_externo text,
  add column if not exists identificacion text not null default '',
  add column if not exists institucion text,
  add column if not exists cargo text;

alter table public.reservas_escenarios
  drop constraint if exists reservas_escenarios_estado_check;

alter table public.reservas_escenarios
  add constraint reservas_escenarios_estado_check
  check (estado in ('pendiente', 'aprobada', 'rechazada', 'confirmada', 'atendida', 'no_asistio', 'cancelada'));

-- Solicitudes pendientes, aprobadas y confirmadas reservan el horario mientras
-- se revisan o se cumplen. Los demás estados liberan el espacio.
alter table public.reservas_escenarios
  drop constraint if exists reservas_escenarios_sin_choques;

alter table public.reservas_escenarios
  add constraint reservas_escenarios_sin_choques exclude using gist (
    escenario_id with =,
    tsrange(fecha + hora_inicio, fecha + hora_fin, '[)') with &&
  ) where (estado in ('pendiente', 'aprobada', 'confirmada'));
