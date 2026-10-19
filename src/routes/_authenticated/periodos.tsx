import { createFileRoute } from "@tanstack/react-router";
import { SimpleCrud } from "@/components/SimpleCrud";
import { Cargando } from "@/components/PageHeader";
import { useDatos } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/periodos")({
  head: () => ({ meta: [{ title: "Períodos académicos — Centro de Deportes ESPOCH" }] }),
  component: Page,
});

function Page() {
  const { data } = useDatos();
  if (!data) return <Cargando />;
  return (
    <SimpleCrud
      tabla="periodos"
      titulo="Períodos académicos"
      subtitulo="Los períodos anteriores se conservan como historial; no es necesario borrar nada al cambiar de período."
      singular="período"
      campos={[
        { key: "nombre", label: "Nombre", required: true },
        { key: "fecha_inicio", label: "Inicio", type: "date", importKey: "inicio" },
        { key: "fecha_fin", label: "Fin", type: "date", importKey: "fin" },
        { key: "activo", label: "Período actual", type: "bool", importKey: "periodoactual" },
      ]}
      filas={data.periodos}
    />
  );
}
