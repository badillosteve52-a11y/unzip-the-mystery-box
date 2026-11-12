insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('certificados-matricula', 'certificados-matricula', false, 10485760, array['application/pdf'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "administradores y entrenadores leen certificados de selección"
on storage.objects for select to authenticated
using (
  bucket_id = 'certificados-matricula'
  and (
    public.has_role((select auth.uid()), 'admin')
    or (
      public.puede_gestionar_grupo((select auth.uid()), 'seleccion', (storage.foldername(name))[1]::uuid)
      and exists (
        select 1 from public.seleccion_miembros m
        where m.seleccion_id = (storage.foldername(name))[1]::uuid
          and m.deportista_id = replace(storage.filename(name), '.pdf', '')::uuid
      )
    )
  )
);

create policy "administradores y entrenadores cargan certificados de selección"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'certificados-matricula'
  and storage.extension(name) = 'pdf'
  and (
    public.has_role((select auth.uid()), 'admin')
    or (
      public.puede_gestionar_grupo((select auth.uid()), 'seleccion', (storage.foldername(name))[1]::uuid)
      and exists (
        select 1 from public.seleccion_miembros m
        where m.seleccion_id = (storage.foldername(name))[1]::uuid
          and m.deportista_id = replace(storage.filename(name), '.pdf', '')::uuid
      )
    )
  )
);

create policy "administradores y entrenadores actualizan certificados de selección"
on storage.objects for update to authenticated
using (
  bucket_id = 'certificados-matricula'
  and (
    public.has_role((select auth.uid()), 'admin')
    or (
      public.puede_gestionar_grupo((select auth.uid()), 'seleccion', (storage.foldername(name))[1]::uuid)
      and exists (
        select 1 from public.seleccion_miembros m
        where m.seleccion_id = (storage.foldername(name))[1]::uuid
          and m.deportista_id = replace(storage.filename(name), '.pdf', '')::uuid
      )
    )
  )
)
with check (
  bucket_id = 'certificados-matricula'
  and storage.extension(name) = 'pdf'
  and (
    public.has_role((select auth.uid()), 'admin')
    or (
      public.puede_gestionar_grupo((select auth.uid()), 'seleccion', (storage.foldername(name))[1]::uuid)
      and exists (
        select 1 from public.seleccion_miembros m
        where m.seleccion_id = (storage.foldername(name))[1]::uuid
          and m.deportista_id = replace(storage.filename(name), '.pdf', '')::uuid
      )
    )
  )
);
