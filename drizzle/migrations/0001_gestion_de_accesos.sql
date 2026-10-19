-- Funciones para que el coordinador gestione quién tiene acceso.
-- Solo el coordinador (rol 'admin') puede listar cuentas ni conceder/quitar el acceso.

create or replace function public.listar_cuentas()
returns table (
  user_id uuid,
  correo text,
  registrada_en timestamptz,
  es_coordinador boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'solo el coordinador puede ver la lista de cuentas';
  end if;

  return query
    select u.id,
           u.email::text,
           u.created_at,
           exists (
             select 1
             from public.user_roles r
             where r.user_id = u.id
               and r.role = 'admin'
           )
    from auth.users u
    order by u.created_at;
end;
$$;

create or replace function public.definir_coordinador(_user_id uuid, _es_coordinador boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'solo el coordinador puede dar o quitar acceso';
  end if;

  if _es_coordinador then
    insert into public.user_roles (user_id, role)
    values (_user_id, 'admin')
    on conflict (user_id, role) do nothing;
  else
    if _user_id = auth.uid() then
      raise exception 'no puedes quitarte el acceso a ti mismo';
    end if;
    delete from public.user_roles
    where user_id = _user_id
      and role = 'admin';
  end if;

  return true;
end;
$$;

revoke all on function public.listar_cuentas() from public, anon, authenticated;
grant execute on function public.listar_cuentas() to authenticated;

revoke all on function public.definir_coordinador(uuid, boolean) from public, anon, authenticated;
grant execute on function public.definir_coordinador(uuid, boolean) to authenticated;