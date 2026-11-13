import { routeMeta } from "@/lib/route-meta";
import { createFileRoute } from "@tanstack/react-router";
import { DeportistasLista } from "@/components/DeportistasLista";

export const Route = createFileRoute("/_authenticated/deportistas-clubes")({
  head: () => routeMeta("Deportistas de clubes", "Registro y consulta de deportistas de clubes de la ESPOCH por facultad y región."),
  component: () => <DeportistasLista tipo="CLUB" />,
});
