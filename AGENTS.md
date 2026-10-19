<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Project rules

- Data access uses the browser Cloud client with RLS restricted to `has_role(auth.uid(),'admin')`; `claim_admin()` makes the first account the first coordinator, and from then on only an existing coordinator grants or revokes access through the security-definer `definir_coordinador()` / `listar_cuentas()` pair — keeps role changes server-side and out of client code.
- Selecciones and clubes live in separate tables with separate membership tables; both reference a single `deportistas` table — avoids duplicating personal data while keeping the modules independent.
- Age is never stored; it is computed from `fecha_nacimiento` in `src/lib/edad.ts` — stays correct over time.
- Sample rows carry `es_ejemplo = true` so they can be wiped with one action without touching real data.
- All app data is loaded once via `useDatos()` (`src/lib/db.ts`) and filtered client-side — dataset is small and it keeps filters instant.
