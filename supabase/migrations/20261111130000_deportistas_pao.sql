alter table public.deportistas
  add column if not exists pao text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'deportistas_pao_valido'
      and conrelid = 'public.deportistas'::regclass
  ) then
    alter table public.deportistas
      add constraint deportistas_pao_valido
      check (pao is null or pao in ('Nivelación', 'PAO 1', 'PAO 2', 'PAO 3', 'PAO 4', 'PAO 5', 'PAO 6', 'PAO 7', 'PAO 8', 'PAO 9'));
  end if;
end $$;
