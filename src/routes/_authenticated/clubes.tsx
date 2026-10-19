import { createFileRoute } from "@tanstack/react-router";
import { GrupoModule } from "@/components/GrupoModule";
import { Cargando } from "@/components/PageHeader";
import { useDatos } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/clubes")({
  head: () => ({ meta: [{ title: "Clubes — Centro de Deportes ESPOCH" }] }),
  component: Page,
});

function Page() {
  const { data } = useDatos();
  return data ? <GrupoModule tipo="clubes" data={data} /> : <Cargando />;
}
