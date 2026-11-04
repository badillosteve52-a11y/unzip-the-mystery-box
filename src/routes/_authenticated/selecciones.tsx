import { routeMeta } from "@/lib/route-meta";
import { createFileRoute } from "@tanstack/react-router";
import { GrupoModule } from "@/components/GrupoModule";
import { Cargando } from "@/components/PageHeader";
import { useDatos } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/selecciones")({
  head: () => routeMeta("Selecciones", "Selecciones deportivas de la ESPOCH e integrantes por disciplina y período."),
  component: Page,
});

function Page() {
  const { data } = useDatos();
  return data ? <GrupoModule tipo="selecciones" data={data} /> : <Cargando />;
}
