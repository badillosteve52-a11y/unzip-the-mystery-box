alter table public.reservas_escenarios
  add column if not exists telefono text not null default '',
  add column if not exists carrera text not null default '';

