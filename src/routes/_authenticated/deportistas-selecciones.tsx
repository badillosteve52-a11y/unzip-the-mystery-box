import { createFileRoute } from "@tanstack/react-router";
import { DeportistasLista } from "@/components/DeportistasLista";

export const Route = createFileRoute("/_authenticated/deportistas-selecciones")({
  head: () => ({ meta: [{ title: "Deportistas de selecciones — Centro de Deportes ESPOCH" }] }),
  component: () => <DeportistasLista tipo="SELECCION" />,
});
