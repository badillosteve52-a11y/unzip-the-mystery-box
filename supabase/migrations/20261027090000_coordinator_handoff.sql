create table if not exists public.coordinator_handoff (
  singleton boolean primary key default true check (singleton),
  handoff_after timestamptz
);

insert into public.coordinator_handoff (singleton, handoff_after)
values (true, null)
on conflict (singleton) do nothing;

alter table public.coordinator_handoff enable row level security;
revoke all on public.coordinator_handoff from public, anon, authenticated;

create or replace function public.claim_admin() returns boolean
language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_handoff_after timestamptz;
begin
  if v_user_id is null then return false; end if;
  select handoff_after into v_handoff_after
  from public.coordinator_handoff where singleton = true for update;

  if v_handoff_after is not null then
    if exists (
      select 1 from auth.users where id = v_user_id and created_at > v_handoff_after
    ) then
      insert into public.user_roles (user_id, role) values (v_user_id, 'admin')
      on conflict (user_id, role) do nothing;
      update public.coordinator_handoff set handoff_after = null where singleton = true;
      return true;
    end if;
    return public.has_role(v_user_id, 'admin');
  end if;

  if exists (select 1 from public.user_roles where role = 'admin') then
    return public.has_role(v_user_id, 'admin');
  end if;

  insert into public.user_roles (user_id, role) values (v_user_id, 'admin');
  return true;
end;
$function$;

create or replace function public.definir_coordinador(_user_id uuid, _es_coordinador boolean) returns boolean
language plpgsql security definer set search_path to 'public'
as $function$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'solo el coordinador puede dar o quitar acceso';
  end if;

  if _es_coordinador then
    insert into public.user_roles (user_id, role) values (_user_id, 'admin')
    on conflict (user_id, role) do nothing;
  else
    if _user_id = auth.uid() then
      raise exception 'no puedes quitarte el acceso a ti mismo';
    end if;
    delete from public.user_roles where user_id = _user_id and role = 'admin';
  end if;
  return true;
end;
$function$;

grant execute on function public.claim_admin() to authenticated;
grant execute on function public.definir_coordinador(uuid, boolean) to authenticated;
