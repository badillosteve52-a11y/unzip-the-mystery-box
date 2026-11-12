create or replace function public.mi_rol() returns text
language sql stable security definer set search_path = public
as $$ select case when public.has_role(auth.uid(), 'admin') then 'admin' else null end $$;
revoke all on function public.mi_rol() from public, anon;
grant execute on function public.mi_rol() to authenticated;