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
      extra={(r) => {
        const grupos = [
          ...data.clubes.filter((g) => g.deporte_id === r.id).map((g) => ({ id: g.id, miembros: data.clubMiembros })),
          ...data.selecciones.filter((g) => g.deporte_id === r.id).map((g) => ({ id: g.id, miembros: data.selMiembros })),
        ];
        const deportistas = new Set(grupos.flatMap((g) => g.miembros.filter((m) => m.grupo_id === g.id).map((m) => m.deportista_id)));
        return <span className="text-sm text-muted-foreground">{deportistas.size} deportistas</span>;
      }}
    />
  );
}
