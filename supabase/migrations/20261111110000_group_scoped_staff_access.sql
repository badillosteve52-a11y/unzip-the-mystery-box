create table if not exists public.accesos_selecciones (
  user_id uuid not null references auth.users(id) on delete cascade,
  seleccion_id uuid not null references public.selecciones(id) on delete cascade,
  primary key (user_id, seleccion_id)
);

create table if not exists public.accesos_clubes (
  user_id uuid not null references auth.users(id) on delete cascade,
  club_id uuid not null references public.clubes(id) on delete cascade,
  primary key (user_id, club_id)
);

alter table public.accesos_selecciones enable row level security;
alter table public.accesos_clubes enable row level security;
revoke all on public.accesos_selecciones, public.accesos_clubes from anon, authenticated;
grant select on public.accesos_selecciones, public.accesos_clubes to authenticated;
grant all on public.accesos_selecciones, public.accesos_clubes to service_role;

create policy "usuarios ven sus grupos asignados" on public.accesos_selecciones
  for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "usuarios ven sus clubes asignados" on public.accesos_clubes
  for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create or replace function public.mi_rol() returns text
language sql stable security definer set search_path = public
as $$
  select case
    when public.has_role(auth.uid(), 'admin') then 'admin'
    when public.has_role(auth.uid(), 'gestor_grupos') then 'gestor_grupos'
    else null
  end
$$;

create or replace function public.puede_gestionar_grupo(_user_id uuid, _tipo text, _grupo_id uuid) returns boolean
language sql stable security definer set search_path = public
as $$
  select (_user_id = auth.uid() or public.has_role(auth.uid(), 'admin')) and (public.has_role(_user_id, 'admin') or (
    public.has_role(_user_id, 'gestor_grupos') and (
      (_tipo = 'seleccion' and exists (select 1 from public.accesos_selecciones a where a.user_id = _user_id and a.seleccion_id = _grupo_id)) or
      (_tipo = 'club' and exists (select 1 from public.accesos_clubes a where a.user_id = _user_id and a.club_id = _grupo_id))
    )
  ))
$$;

drop function if exists public.listar_cuentas();
create or replace function public.listar_cuentas()
returns table (user_id uuid, correo text, registrada_en timestamptz, es_coordinador boolean, rol text)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'solo el administrador puede ver las cuentas'; end if;
  return query
    select u.id, u.email::text, u.created_at,
      public.has_role(u.id, 'admin'),
      case when public.has_role(u.id, 'admin') then 'admin' when public.has_role(u.id, 'gestor_grupos') then 'gestor_grupos' else 'sin_acceso' end
    from auth.users u order by u.created_at;
end;
$$;

create or replace function public.listar_grupos_acceso()
returns table (tipo text, grupo_id uuid, nombre text)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'solo el administrador puede configurar accesos'; end if;
  return query select 'seleccion'::text, s.id, s.nombre from public.selecciones s order by s.nombre;
  return query select 'club'::text, c.id, c.nombre from public.clubes c order by c.nombre;
end;
$$;

create or replace function public.listar_grupos_cuenta(_user_id uuid)
returns table (tipo text, grupo_id uuid)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'solo el administrador puede consultar accesos'; end if;
  return query select 'seleccion'::text, a.seleccion_id from public.accesos_selecciones a where a.user_id = _user_id;
  return query select 'club'::text, a.club_id from public.accesos_clubes a where a.user_id = _user_id;
end;
$$;

create or replace function public.asignar_rol_cuenta(_user_id uuid, _rol text) returns boolean
language plpgsql security definer set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'solo el administrador puede cambiar roles'; end if;
  if _user_id = auth.uid() then raise exception 'no puedes cambiar tu propio rol'; end if;
  if _rol is null or _rol not in ('admin', 'gestor_grupos', 'sin_acceso') then raise exception 'rol no válido'; end if;
  delete from public.user_roles where user_id = _user_id;
  if _rol = 'admin' then
    insert into public.user_roles (user_id, role) values (_user_id, 'admin');
    delete from public.accesos_selecciones where user_id = _user_id;
    delete from public.accesos_clubes where user_id = _user_id;
  elsif _rol = 'gestor_grupos' then
    insert into public.user_roles (user_id, role) values (_user_id, 'gestor_grupos');
  else
    delete from public.accesos_selecciones where user_id = _user_id;
    delete from public.accesos_clubes where user_id = _user_id;
  end if;
  return true;
end;
$$;

create or replace function public.guardar_grupos_cuenta(_user_id uuid, _selecciones uuid[], _clubes uuid[]) returns boolean
language plpgsql security definer set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'solo el administrador puede asignar grupos'; end if;
  if not public.has_role(_user_id, 'gestor_grupos') then raise exception 'primero asigna el rol profesor / entrenador'; end if;
  delete from public.accesos_selecciones where user_id = _user_id;
  delete from public.accesos_clubes where user_id = _user_id;
  insert into public.accesos_selecciones (user_id, seleccion_id)
    select _user_id, unnest(coalesce(_selecciones, '{}'::uuid[]));
  insert into public.accesos_clubes (user_id, club_id)
    select _user_id, unnest(coalesce(_clubes, '{}'::uuid[]));
  return true;
end;
$$;

create or replace function public.resumen_reservas_escenarios()
returns table (escenario text, reservas bigint)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'solo el administrador puede consultar las reservas'; end if;
  return query select r.escenario_nombre, count(*)::bigint
    from public.reservas_escenarios r
    where r.estado in ('pendiente', 'aprobada', 'confirmada')
    group by r.escenario_nombre order by count(*) desc, r.escenario_nombre;
end;
$$;

revoke all on function public.mi_rol() from public, anon, authenticated;
revoke all on function public.puede_gestionar_grupo(uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.listar_cuentas() from public, anon, authenticated;
revoke all on function public.listar_grupos_acceso() from public, anon, authenticated;
revoke all on function public.listar_grupos_cuenta(uuid) from public, anon, authenticated;
revoke all on function public.asignar_rol_cuenta(uuid, text) from public, anon, authenticated;
revoke all on function public.guardar_grupos_cuenta(uuid, uuid[], uuid[]) from public, anon, authenticated;
revoke all on function public.resumen_reservas_escenarios() from public, anon, authenticated;
grant execute on function public.mi_rol() to authenticated;
grant execute on function public.puede_gestionar_grupo(uuid, text, uuid) to authenticated;
grant execute on function public.listar_cuentas(), public.listar_grupos_acceso(), public.listar_grupos_cuenta(uuid) to authenticated;
grant execute on function public.asignar_rol_cuenta(uuid, text), public.guardar_grupos_cuenta(uuid, uuid[], uuid[]) to authenticated;
grant execute on function public.resumen_reservas_escenarios() to authenticated;

drop policy if exists "coordinador" on public.selecciones;
create policy "acceso por selección asignada" on public.selecciones for select to authenticated
  using (public.puede_gestionar_grupo(auth.uid(), 'seleccion', id));
create policy "administrador gestiona selecciones" on public.selecciones for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "profesor edita selección asignada" on public.selecciones for update to authenticated
  using (public.puede_gestionar_grupo(auth.uid(), 'seleccion', id))
  with check (public.puede_gestionar_grupo(auth.uid(), 'seleccion', id));
drop policy if exists "coordinador" on public.clubes;
create policy "acceso por club asignado" on public.clubes for select to authenticated
  using (public.puede_gestionar_grupo(auth.uid(), 'club', id));
create policy "administrador gestiona clubes" on public.clubes for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "profesor edita club asignado" on public.clubes for update to authenticated
  using (public.puede_gestionar_grupo(auth.uid(), 'club', id))
  with check (public.puede_gestionar_grupo(auth.uid(), 'club', id));
drop policy if exists "coordinador" on public.seleccion_miembros;
create policy "gestionar integrantes de selección asignada" on public.seleccion_miembros for all to authenticated
  using (public.puede_gestionar_grupo(auth.uid(), 'seleccion', seleccion_id))
  with check (public.puede_gestionar_grupo(auth.uid(), 'seleccion', seleccion_id));
drop policy if exists "coordinador" on public.club_miembros;
create policy "gestionar integrantes de club asignado" on public.club_miembros for all to authenticated
  using (public.puede_gestionar_grupo(auth.uid(), 'club', club_id))
  with check (public.puede_gestionar_grupo(auth.uid(), 'club', club_id));

create policy "lectura grupos autorizados" on public.deportistas for select to authenticated using (
  public.has_role(auth.uid(), 'admin') or
  exists (select 1 from public.seleccion_miembros m join public.accesos_selecciones a on a.seleccion_id = m.seleccion_id where m.deportista_id = id and a.user_id = auth.uid()) or
  exists (select 1 from public.club_miembros m join public.accesos_clubes a on a.club_id = m.club_id where m.deportista_id = id and a.user_id = auth.uid())
);
create policy "profesor puede crear deportistas" on public.deportistas for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'gestor_grupos'));
create policy "editar deportistas de grupos asignados" on public.deportistas for update to authenticated
  using (
    public.has_role(auth.uid(), 'admin') or
    exists (select 1 from public.seleccion_miembros m join public.accesos_selecciones a on a.seleccion_id = m.seleccion_id where m.deportista_id = id and a.user_id = auth.uid()) or
    exists (select 1 from public.club_miembros m join public.accesos_clubes a on a.club_id = m.club_id where m.deportista_id = id and a.user_id = auth.uid())
  ) with check (
    public.has_role(auth.uid(), 'admin') or
    exists (select 1 from public.seleccion_miembros m join public.accesos_selecciones a on a.seleccion_id = m.seleccion_id where m.deportista_id = id and a.user_id = auth.uid()) or
    exists (select 1 from public.club_miembros m join public.accesos_clubes a on a.club_id = m.club_id where m.deportista_id = id and a.user_id = auth.uid())
  );

create policy "leer deportes y periodos autenticado" on public.deportes for select to authenticated using (true);
create policy "leer periodos autenticado" on public.periodos for select to authenticated using (true);
create policy "leer escenarios autenticado" on public.escenarios for select to authenticated using (true);
create policy "leer entrenadores de grupos asignados" on public.entrenadores for select to authenticated using (
  public.has_role(auth.uid(), 'admin') or
  (seleccion_id is not null and public.puede_gestionar_grupo(auth.uid(), 'seleccion', seleccion_id)) or
  (club_id is not null and public.puede_gestionar_grupo(auth.uid(), 'club', club_id))
);

create policy "deportes de deportistas asignados" on public.deportista_deportes for all to authenticated
  using (
    public.has_role(auth.uid(), 'admin') or
    exists (select 1 from public.seleccion_miembros m join public.accesos_selecciones a on a.seleccion_id = m.seleccion_id where m.deportista_id = deportista_deportes.deportista_id and a.user_id = auth.uid()) or
    exists (select 1 from public.club_miembros m join public.accesos_clubes a on a.club_id = m.club_id where m.deportista_id = deportista_deportes.deportista_id and a.user_id = auth.uid())
  )
  with check (
    public.has_role(auth.uid(), 'admin') or
    exists (select 1 from public.seleccion_miembros m join public.accesos_selecciones a on a.seleccion_id = m.seleccion_id where m.deportista_id = deportista_deportes.deportista_id and a.user_id = auth.uid()) or
    exists (select 1 from public.club_miembros m join public.accesos_clubes a on a.club_id = m.club_id where m.deportista_id = deportista_deportes.deportista_id and a.user_id = auth.uid())
  );
