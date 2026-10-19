import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Building2, CalendarRange, Flag, Trophy, Users, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import hero from "@/assets/hero-deportes.jpg";
import logoBlanco from "@/assets/espoch-logo-blanco.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Centro de Deportes ESPOCH — Sistema de gestión" },
      { name: "description", content: "Gestión de deportistas, selecciones, clubes, períodos y escenarios deportivos de la ESPOCH." },
      { property: "og:title", content: "Centro de Deportes ESPOCH — Sistema de gestión" },
      { property: "og:description", content: "Gestión de deportistas, selecciones, clubes, períodos y escenarios deportivos de la ESPOCH." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const modulos = [
  { icon: Users, t: "Deportistas", d: "Un solo registro por estudiante, con edad calculada y facultad." },
  { icon: Flag, t: "Selecciones", d: "Arma las selecciones oficiales por deporte y período." },
  { icon: UsersRound, t: "Clubes", d: "Gestiona miembros de cada club deportivo." },
  { icon: Building2, t: "Escenarios", d: "Estadios, coliseos y canchas con su capacidad." },
  { icon: CalendarRange, t: "Períodos", d: "Organiza todo por período académico." },
  { icon: Trophy, t: "Panel", d: "Gráficos y totales al instante." },
];

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <section className="relative isolate overflow-hidden bg-sidebar text-sidebar-foreground">
        <img src={hero} alt="Deportistas corriendo en la pista al atardecer" width={1600} height={1024} className="absolute inset-0 -z-10 h-full w-full object-cover opacity-45" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-sidebar via-sidebar/85 to-sidebar/20" />
        <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-2">
            <img src={logoBlanco} alt="Logo ESPOCH" className="h-11 w-auto" />
            <span className="font-display text-sm font-bold">Centro de Deportes · ESPOCH</span>
          </div>
          <Link to="/auth" className="text-sm font-medium opacity-80 hover:opacity-100">Ingresar</Link>
        </header>
        <div className="mx-auto max-w-6xl px-6 pb-28 pt-16 md:pt-24">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sidebar-primary">Sistema de gestión deportiva</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-[1.05] md:text-6xl">
            Deportistas, selecciones y clubes en un solo lugar.
          </h1>
          <p className="mt-6 max-w-xl text-lg opacity-85">
            Registra cada estudiante una sola vez, vincúlalo a varias selecciones y clubes por período académico y consulta todo en un panel con gráficos.
          </p>
          <Button asChild size="lg" className="mt-10 bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90">
            <Link to="/auth">Ingresar como coordinador <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>
      <section className="relative z-10 mx-auto -mt-14 max-w-6xl px-6 pb-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modulos.map((m) => (
            <div key={m.t} className="rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-primary">
                <m.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">{m.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{m.d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
