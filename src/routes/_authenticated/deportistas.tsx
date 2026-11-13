import { routeMeta } from "@/lib/route-meta";
import { createFileRoute } from "@tanstack/react-router";
import { DeportistasLista } from "@/components/DeportistasLista";

export const Route = createFileRoute("/_authenticated/deportistas")({
  head: () => routeMeta("Deportistas", "Padrón general de deportistas y asignación a clubes y selecciones de la ESPOCH."),
  component: () => <DeportistasLista tipo="TODOS" />,
});
