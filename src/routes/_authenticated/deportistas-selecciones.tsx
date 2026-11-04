import { routeMeta } from "@/lib/route-meta";
import { createFileRoute } from "@tanstack/react-router";
import { DeportistasLista } from "@/components/DeportistasLista";

export const Route = createFileRoute("/_authenticated/deportistas-selecciones")({
  head: () => routeMeta("Deportistas de selecciones", "Registro y consulta de deportistas de selecciones de la ESPOCH por facultad y región."),
  component: () => <DeportistasLista tipo="SELECCION" />,
});
