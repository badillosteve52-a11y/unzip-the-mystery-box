import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { BarChart3, Building2, CalendarRange, Dumbbell, Flag, LogOut, ShieldCheck, Users, UsersRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import logoBlanco from "@/assets/espoch-logo-blanco.png";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    const { data: esAdmin } = await supabase.rpc("claim_admin");
    return { user: data.user, esAdmin: !!esAdmin };
  },
  component: Layout,
});

const nav = [
  { to: "/panel", label: "Panel", icon: BarChart3 },
  { to: "/deportistas", label: "Deportistas", icon: Users },
  { to: "/selecciones", label: "Selecciones", icon: Flag },
  { to: "/clubes", label: "Clubes", icon: UsersRound },
  { to: "/deportes", label: "Deportes", icon: Dumbbell },
  { to: "/escenarios", label: "Escenarios", icon: Building2 },
  { to: "/periodos", label: "Períodos", icon: CalendarRange },
  { to: "/accesos", label: "Accesos", icon: ShieldCheck },
] as const;

function Layout() {
  const { esAdmin, user } = Route.useRouteContext();
  const qc = useQueryClient();
  const navigate = useNavigate();

  async function salir() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (!esAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-bold">Aún no tienes acceso</h1>
          <p className="mt-2 text-muted-foreground">
            Tu cuenta ({user.email}) quedó registrada, pero el coordinador todavía no la autoriza. Pídele que te dé acceso
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
      <aside className="flex shrink-0 flex-col bg-sidebar text-sidebar-foreground md:w-60">
        <div className="flex items-center gap-2 px-5 py-5">
          <img src={logoBlanco} alt="Logo ESPOCH" className="h-10 w-auto" />
          <div className="leading-tight">
            <div className="font-display text-sm font-bold">Centro de Deportes</div>
            <div className="text-xs opacity-70">ESPOCH</div>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:overflow-visible">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="flex items-center gap-3 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium opacity-80 hover:bg-sidebar-accent hover:opacity-100"
              activeProps={{ className: "bg-sidebar-accent !opacity-100 text-sidebar-primary" }}
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="hidden border-t border-sidebar-border p-3 md:block">
          <div className="truncate px-2 pb-2 text-xs opacity-70">{user.email}</div>
          <button onClick={salir} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent">
            <LogOut className="h-4 w-4" /> Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
