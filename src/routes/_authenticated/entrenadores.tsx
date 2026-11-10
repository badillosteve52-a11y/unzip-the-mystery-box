import { createFileRoute, redirect } from "@tanstack/react-router";
import { routeMeta } from "@/lib/route-meta";

export const Route = createFileRoute("/_authenticated/entrenadores")({
  head: () => routeMeta("Entrenadores", "Registro y gestión de entrenadores del Centro de Deportes ESPOCH."),
  beforeLoad: () => { throw redirect({ to: "/clubes", replace: true }); },
});