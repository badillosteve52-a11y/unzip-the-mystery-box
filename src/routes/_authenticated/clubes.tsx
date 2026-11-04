import { routeMeta } from "@/lib/route-meta";
import { createFileRoute } from "@tanstack/react-router";
import { GrupoModule } from "@/components/GrupoModule";
import { Cargando } from "@/components/PageHeader";
import { useDatos } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/clubes")({
  head: () => routeMeta("Clubes", "Clubes deportivos de la ESPOCH y sus integrantes por período académico."),
  component: Page,
});

function Page() {
  const { data } = useDatos();
  return data ? <GrupoModule tipo="clubes" data={data} /> : <Cargando />;
}
