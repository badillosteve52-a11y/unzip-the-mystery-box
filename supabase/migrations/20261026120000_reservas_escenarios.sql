create extension if not exists btree_gist with schema extensions;

create table if not exists public.reservas_escenarios (
  id uuid primary key default gen_random_uuid(),
  escenario_id uuid not null references public.escenarios(id) on delete cascade,
  escenario_nombre text not null,
  solicitante text not null,
  correo text,
  motivo text not null,
  fecha date not null,
  hora_inicio time not null,
  hora_fin time not null,
  estado text not null default 'confirmada' check (estado in ('confirmada', 'cancelada')),
  created_at timestamptz not null default now(),
  constraint reservas_escenarios_horario_valido check (hora_fin > hora_inicio),
  constraint reservas_escenarios_sin_choques exclude using gist (
    escenario_id with =,
    tsrange(fecha + hora_inicio, fecha + hora_fin, '[)') with &&
  ) where (estado = 'confirmada')
);

create index if not exists reservas_escenarios_fecha_idx on public.reservas_escenarios (fecha, hora_inicio);
alter table public.reservas_escenarios enable row level security;
grant select, insert, update, delete on public.reservas_escenarios to authenticated;
grant all on public.reservas_escenarios to service_role;
create policy "coordinador gestiona reservas de escenarios"
  on public.reservas_escenarios for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

