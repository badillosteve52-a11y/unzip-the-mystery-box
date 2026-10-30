CREATE OR REPLACE FUNCTION public.claim_admin()
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_handoff_after timestamptz;
begin
  if v_user_id is null then return false; end if;
  if public.has_role(v_user_id, 'admin') then return true; end if;
  select handoff_after into v_handoff_after
  from public.coordinator_handoff where singleton = true for update;
  if v_handoff_after is not null then
    if exists (select 1 from auth.users where id = v_user_id and created_at > v_handoff_after and email_confirmed_at is not null) then
      insert into public.user_roles (user_id, role) values (v_user_id, 'admin') on conflict do nothing;
      update public.coordinator_handoff set handoff_after = null where singleton = true;
      return true;
    end if;
    return false;
  end if;
  if exists (select 1 from public.user_roles where role = 'admin') then return false; end if;
  insert into public.user_roles (user_id, role) values (v_user_id, 'admin');
  return true;
end;
$function$;