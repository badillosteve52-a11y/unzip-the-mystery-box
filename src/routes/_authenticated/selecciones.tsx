import { createFileRoute } from "@tanstack/react-router";
import { GrupoModule } from "@/components/GrupoModule";
import { Cargando } from "@/components/PageHeader";
import { useDatos } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/selecciones")({
  head: () => ({ meta: [{ title: "Selecciones — Centro de Deportes ESPOCH" }] }),
  component: Page,
});

function Page() {
  const { data } = useDatos();
  return data ? <GrupoModule tipo="selecciones" data={data} /> : <Cargando />;
}
