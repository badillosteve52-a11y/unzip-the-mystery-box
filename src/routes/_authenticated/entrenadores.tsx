import { createFileRoute } from "@tanstack/react-router";
import { SimpleCrud } from "@/components/SimpleCrud";
import { Cargando } from "@/components/PageHeader";
import { useDatos } from "@/lib/db";
import { routeMeta } from "@/lib/route-meta";

export const Route = createFileRoute("/_authenticated/entrenadores")({
  head: () => routeMeta("Entrenadores", "Registro y gestión de entrenadores del Centro de Deportes ESPOCH."),
  component: Page,
});

function Page() {
  const { data } = useDatos();
  if (!data) return <Cargando />;
  return <SimpleCrud tabla="entrenadores" titulo="Entrenadores" subtitulo="Personal del Centro de Deportes" singular="entrenador" filas={data.entrenadores} campos={[
    { key: "nombre", label: "Nombre", required: true },
    { key: "apellido", label: "Apellido", required: true },
    { key: "cedula", label: "Cédula", required: true },
    { key: "cargo", label: "Cargo", required: true },
  ]} />;
}