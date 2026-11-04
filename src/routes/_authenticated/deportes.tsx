import { routeMeta } from "@/lib/route-meta";
import { createFileRoute } from "@tanstack/react-router";
import { SimpleCrud } from "@/components/SimpleCrud";
import { Cargando } from "@/components/PageHeader";
import { useDatos } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/deportes")({
  head: () => routeMeta("Deportes", "Catálogo de disciplinas deportivas y participación de deportistas de la ESPOCH."),
  component: Page,
});

function Page() {
  const { data } = useDatos();
  if (!data) return <Cargando />;
  return (
    <SimpleCrud
      tabla="deportes"
      titulo="Deportes"
      subtitulo="Catálogo de disciplinas deportivas."
      singular="deporte"
      campos={[{ key: "nombre", label: "Nombre", required: true }]}
      filas={data.deportes}
      extra={(r) => (
        <span className="text-sm text-muted-foreground">
          {data.dd.filter((x) => x.deporte_id === r.id).length} deportistas
        </span>
      )}
    />
  );
}
