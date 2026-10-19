create type public.app_role as enum ('admin');
create table public.user_roles (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, role app_role not null, unique(user_id, role));
grant select on public.user_roles to authenticated; grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create or replace function public.has_role(_user_id uuid, _role app_role) returns boolean language sql stable security definer set search_path = public as $$ select exists(select 1 from public.user_roles where user_id=_user_id and role=_role) $$;
create policy "own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());
create or replace function public.claim_admin() returns boolean language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return false; end if;
  if exists(select 1 from public.user_roles where role='admin') then
    return public.has_role(auth.uid(),'admin');
  end if;
  insert into public.user_roles(user_id, role) values (auth.uid(),'admin');
  return true;
end $$;
revoke execute on function public.claim_admin() from anon, public;
grant execute on function public.claim_admin() to authenticated;

create table public.periodos (id uuid primary key default gen_random_uuid(), nombre text not null unique, fecha_inicio date, fecha_fin date, activo boolean not null default false, es_ejemplo boolean not null default false, created_at timestamptz not null default now());
create table public.deportes (id uuid primary key default gen_random_uuid(), nombre text not null unique, es_ejemplo boolean not null default false, created_at timestamptz not null default now());
create table public.deportistas (id uuid primary key default gen_random_uuid(), cedula text not null unique, nombres text not null, apellidos text not null, fecha_nacimiento date, carrera text, facultad text, es_ejemplo boolean not null default false, created_at timestamptz not null default now());
create table public.deportista_deportes (deportista_id uuid not null references public.deportistas(id) on delete cascade, deporte_id uuid not null references public.deportes(id) on delete cascade, primary key (deportista_id, deporte_id));
create table public.selecciones (id uuid primary key default gen_random_uuid(), nombre text not null, deporte_id uuid references public.deportes(id) on delete set null, periodo_id uuid references public.periodos(id) on delete set null, es_ejemplo boolean not null default false, created_at timestamptz not null default now());
create table public.seleccion_miembros (seleccion_id uuid not null references public.selecciones(id) on delete cascade, deportista_id uuid not null references public.deportistas(id) on delete cascade, primary key (seleccion_id, deportista_id));
create table public.clubes (id uuid primary key default gen_random_uuid(), nombre text not null, deporte_id uuid references public.deportes(id) on delete set null, periodo_id uuid references public.periodos(id) on delete set null, es_ejemplo boolean not null default false, created_at timestamptz not null default now());
create table public.club_miembros (club_id uuid not null references public.clubes(id) on delete cascade, deportista_id uuid not null references public.deportistas(id) on delete cascade, primary key (club_id, deportista_id));
create table public.escenarios (id uuid primary key default gen_random_uuid(), nombre text not null, capacidad integer, tipo text, ubicacion text, observaciones text, detalles jsonb not null default '{}'::jsonb, es_ejemplo boolean not null default false, created_at timestamptz not null default now());

do $$ declare t text; begin
foreach t in array array['periodos','deportes','deportistas','deportista_deportes','selecciones','seleccion_miembros','clubes','club_miembros','escenarios'] loop
  execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  execute format('grant all on public.%I to service_role', t);
  execute format('alter table public.%I enable row level security', t);
  execute format('create policy "coordinador" on public.%I for all to authenticated using (public.has_role(auth.uid(),''admin'')) with check (public.has_role(auth.uid(),''admin''))', t);
end loop; end $$;

insert into public.periodos(nombre, fecha_inicio, fecha_fin, activo, es_ejemplo) values
('2025-2', '2025-09-01','2026-02-28', false, true), ('2026-1','2026-03-01','2026-08-31', true, true);
insert into public.deportes(nombre, es_ejemplo) values ('Fútbol',true),('Baloncesto',true),('Vóley',true),('Atletismo',true),('Natación',true),('Ajedrez',true);
insert into public.deportistas(cedula,nombres,apellidos,fecha_nacimiento,carrera,facultad,es_ejemplo) values
('0600000001','Ana','Guamán','2003-04-12','Software','FACULTAD DE INFORMÁTICA Y ELECTRÓNICA',true),
('0600000002','Luis','Paredes','2002-11-03','Medicina','FACULTAD DE SALUD PÚBLICA',true),
('0600000003','María','Yépez','2004-01-22','Ingeniería Industrial','FACULTAD DE MECÁNICA',true),
('0600000004','Carlos','Naranjo','2001-07-30','Agronomía','FACULTAD DE RECURSOS NATURALES',true),
('0600000005','Sofía','Cando','2003-09-15','Nutrición y Dietética','FACULTAD DE SALUD PÚBLICA',true),
('0600000006','Diego','Lema','2002-05-08','Tecnologías de la Información','FACULTAD DE INFORMÁTICA Y ELECTRÓNICA',true),
('0600000007','Valeria','Ortiz','2004-03-19','Administración de Empresas','FACULTAD DE ADMINISTRACIÓN DE EMPRESAS',true),
('0600000008','Jorge','Cáceres','2000-12-01','Mecánica','FACULTAD DE MECÁNICA',true),
('0600000009','Camila','Silva','2003-06-25','Contabilidad y Auditoría','FACULTAD DE ADMINISTRACIÓN DE EMPRESAS',true),
('0600000010','Andrés','Pilco','2002-02-14','Zootecnia','FACULTAD DE CIENCIAS PECUARIAS',true);
insert into public.deportista_deportes select d.id, p.id from public.deportistas d, public.deportes p where
 (d.cedula in ('0600000001','0600000002','0600000006','0600000008','0600000010') and p.nombre='Fútbol') or
 (d.cedula in ('0600000003','0600000005','0600000007') and p.nombre='Vóley') or
 (d.cedula in ('0600000002','0600000004','0600000009') and p.nombre='Baloncesto') or
 (d.cedula in ('0600000001','0600000005') and p.nombre='Atletismo') or
 (d.cedula in ('0600000007') and p.nombre='Ajedrez');
insert into public.selecciones(nombre,deporte_id,periodo_id,es_ejemplo) select 'Selección de Fútbol Masculino', (select id from public.deportes where nombre='Fútbol'), (select id from public.periodos where nombre='2026-1'), true;
insert into public.selecciones(nombre,deporte_id,periodo_id,es_ejemplo) select 'Selección de Vóley Femenino', (select id from public.deportes where nombre='Vóley'), (select id from public.periodos where nombre='2026-1'), true;
insert into public.clubes(nombre,deporte_id,periodo_id,es_ejemplo) select 'Club de Baloncesto', (select id from public.deportes where nombre='Baloncesto'), (select id from public.periodos where nombre='2026-1'), true;
insert into public.clubes(nombre,deporte_id,periodo_id,es_ejemplo) select 'Club de Atletismo', (select id from public.deportes where nombre='Atletismo'), (select id from public.periodos where nombre='2025-2'), true;
insert into public.seleccion_miembros select s.id, d.id from public.selecciones s, public.deportistas d where s.nombre like '%Fútbol%' and d.cedula in ('0600000002','0600000006','0600000008','0600000010');
insert into public.seleccion_miembros select s.id, d.id from public.selecciones s, public.deportistas d where s.nombre like '%Vóley%' and d.cedula in ('0600000003','0600000005','0600000007');
insert into public.club_miembros select c.id, d.id from public.clubes c, public.deportistas d where c.nombre like '%Baloncesto%' and d.cedula in ('0600000002','0600000004','0600000009');
insert into public.club_miembros select c.id, d.id from public.clubes c, public.deportistas d where c.nombre like '%Atletismo%' and d.cedula in ('0600000001','0600000005');
insert into public.escenarios(nombre,capacidad,tipo,ubicacion,es_ejemplo) values ('Estadio Politécnico',3000,'Estadio','Campus central',true),('Coliseo ESPOCH',1500,'Coliseo','Campus central',true),('Piscina Semiolímpica',200,'Piscina','Junto al coliseo',true),('Cancha sintética 1',100,'Cancha','Zona deportiva',true);