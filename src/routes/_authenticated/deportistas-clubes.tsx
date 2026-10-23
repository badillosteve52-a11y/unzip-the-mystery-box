import { createFileRoute } from "@tanstack/react-router";
import { DeportistasLista } from "@/components/DeportistasLista";

export const Route = createFileRoute("/_authenticated/deportistas-clubes")({
  head: () => ({ meta: [{ title: "Deportistas de clubes — Centro de Deportes ESPOCH" }] }),
  component: () => <DeportistasLista tipo="CLUB" />,
});
