import { useEffect, useState } from "react";
import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { BarChart3, Building2, CalendarRange, ChevronDown, Dumbbell, Flag, LogOut, ShieldCheck, Trophy, UsersRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import logoBlanco from "@/assets/espoch-logo-blanco.png";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    await supabase.rpc("claim_admin");
    const { data: role } = await (supabase as any).rpc("mi_rol");
    return { user: data.user, role: typeof role === "string" ? role : null };
  },
  component: Layout,
});

const nav = [
  { to: "/panel", label: "Panel", corto: "Panel", icon: BarChart3 },
  { to: "/deportistas", label: "Deportistas", corto: "Deportistas", icon: UsersRound },
  { to: "/selecciones", label: "Selecciones", corto: "Selecciones", icon: Flag },
  { to: "/clubes", label: "Clubes", corto: "Clubes", icon: Trophy },
  { to: "/deportes", label: "Deportes", corto: "Deportes", icon: Dumbbell },
  { to: "/escenarios", label: "Escenarios", corto: "Escenarios", icon: Building2 },
  { to: "/periodos", label: "Períodos", corto: "Períodos", icon: CalendarRange },
  { to: "/accesos", label: "Accesos", corto: "Accesos", icon: ShieldCheck },
] as const;

function NavLista({ activo, onNavigate, role }: { activo: string; onNavigate?: () => void; role: string | null }) {
  const accesosPersonal = new Set(["/panel", "/deportistas", "/deportistas-clubes", "/deportistas-selecciones", "/selecciones", "/clubes"]);
  const enlaces = role === "admin" ? nav : nav.filter((item) => role === "gestor_grupos" && accesosPersonal.has(item.to));
  return (
    <nav aria-label="Secciones" className="flex flex-col gap-1.5">
      {enlaces.map((n) => {
        const esActivo = n.to === activo;
        const Icono = n.icon;
        return (
          <Link
            key={n.to}
            to={n.to}
            onClick={onNavigate}
            aria-current={esActivo ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors",
              esActivo
                ? "bg-sidebar-accent text-sidebar-primary"
                : "text-sidebar-foreground/85 hover:bg-sidebar-accent/55 hover:text-sidebar-foreground",
            )}
          >
            <span
              className={cn(
                "grid h-9 w-9 shrink-0 place-items-center rounded-lg border",
                esActivo
                  ? "border-sidebar-primary/60 bg-sidebar-primary text-sidebar-primary-foreground"
                  : "border-sidebar-border bg-sidebar/70 text-sidebar-foreground",
              )}
            >
              <Icono className="h-5 w-5" />
            </span>
            <span className="min-w-0 text-sm leading-snug font-semibold">{n.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function Pie({ email, onSalir, onNavigate }: { email: string; onSalir: () => void; onNavigate?: () => void }) {
  return (
    <div className="border-t border-sidebar-border p-3">
      <div className="truncate px-2 pb-2 text-xs opacity-70">{email}</div>
      <button
        onClick={() => {
          onNavigate?.();
          onSalir();
        }}
        className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-semibold text-sidebar-foreground/85 hover:bg-sidebar-accent/55 hover:text-sidebar-foreground"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-sidebar-border bg-sidebar/70">
          <LogOut className="h-5 w-5" />
        </span>
        Cerrar sesión
      </button>
    </div>
  );
}

function Layout() {
  const { role, user } = Route.useRouteContext();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname ?? "" });
  const [abierto, setAbierto] = useState(false);

  const accesosPersonal = new Set(["/panel", "/deportistas", "/deportistas-clubes", "/deportistas-selecciones", "/selecciones", "/clubes"]);
  const enlaces = role === "admin" ? nav : nav.filter((item) => role === "gestor_grupos" && accesosPersonal.has(item.to));
  useEffect(() => {
    if (role === "gestor_grupos" && !accesosPersonal.has(pathname)) {
      navigate({ to: "/panel", replace: true });
    }
  }, [role, pathname, navigate]);
  const actual = enlaces.find((n) => n.to === pathname) ?? enlaces[0] ?? nav[0];
  const IconoActual = actual.icon;

  async function salir() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (!role) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-bold">Aún no tienes acceso</h1>
          <p className="mt-2 text-muted-foreground">
            Tu cuenta ({user.email}) quedó registrada, pero el administrador todavía no le asigna un rol. Pídele que te dé acceso
            desde la pantalla «Accesos» y vuelve a intentar.
          </p>
          <Button className="mt-4" onClick={() => window.location.reload()}>
            Volver a intentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Pantallas pequeñas: barra superior + menú desplegable */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-sidebar-border bg-sidebar px-3 py-2.5 text-sidebar-foreground md:hidden">
        <img src={logoBlanco} alt="Logo ESPOCH" className="h-8 w-auto shrink-0" />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate font-display text-sm font-bold">Centro de Deportes</div>
          <div className="truncate text-xs opacity-75">{actual.label}</div>
        </div>
        <Sheet open={abierto} onOpenChange={setAbierto}>
          <SheetTrigger asChild>
            <button
              className="flex shrink-0 items-center gap-2 rounded-xl border border-sidebar-border bg-sidebar-accent px-3 py-2 text-sm font-bold text-sidebar-foreground"
              aria-label="Abrir el menú de secciones"
            >
              <IconoActual className="h-5 w-5 shrink-0" />
              Menú
              <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
            </button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="flex w-[85vw] max-w-[20rem] flex-col gap-0 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
          >
            <SheetHeader className="border-b border-sidebar-border px-4 py-4 text-left">
              <div className="flex items-center gap-3 pr-10">
                <img src={logoBlanco} alt="Logo ESPOCH" className="h-9 w-auto shrink-0" />
                <div className="min-w-0 leading-tight">
                  <SheetTitle className="truncate font-display text-sm font-bold text-sidebar-foreground">Centro de Deportes</SheetTitle>
                  <div className="truncate text-xs opacity-75">ESPOCH</div>
                </div>
              </div>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
              <NavLista activo={pathname} onNavigate={() => setAbierto(false)} role={role} />
            </div>
            <Pie email={user.email ?? ""} onSalir={salir} onNavigate={() => setAbierto(false)} />
          </SheetContent>
        </Sheet>
      </header>

      {/* Pantallas medianas y grandes: barra lateral fija */}
      <aside className="hidden shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex md:w-64">
        <div className="flex items-center gap-3 px-4 py-5">
          <img src={logoBlanco} alt="Logo ESPOCH" className="h-10 w-auto shrink-0" />
          <div className="min-w-0 leading-tight">
            <div className="truncate font-display text-sm font-bold">Centro de Deportes</div>
            <div className="truncate text-xs opacity-75">ESPOCH</div>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          <NavLista activo={pathname} role={role} />
        </div>
        <Pie email={user.email ?? ""} onSalir={salir} />
      </aside>

      <main className="min-w-0 flex-1 p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
