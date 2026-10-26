import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Building2, ChevronDown, Dumbbell, Trophy } from "lucide-react";
import { Cargando } from "@/components/PageHeader";
import { ReservasEscenarios } from "@/components/ReservasEscenarios";
import { useDatos } from "@/lib/db";
import { CATALOGO_ESCENARIOS } from "@/lib/catalogos";

export const Route = createFileRoute("/_authenticated/escenarios")({
  head: () => ({ meta: [{ title: "Escenarios deportivos — Centro de Deportes ESPOCH" }] }),
  component: Page,
});

const INFO_GRUPOS: Record<string, string> = {
  "Estadios 1 y 2": "Aforo publicado para ambos estadios: 700 aficionados",
  "Canchas de tenis": "Aforo publicado para el conjunto: 300 aficionados",
  "Canchas de ecuavóley de cemento": "La ESPOCH publica 150 aficionados para canchas de ecuavóley y vóley playero en conjunto; no desglosa el aforo por cancha.",
  "Canchas centrales de básquet": "Aforo publicado para las canchas centrales: 200 aficionados",
};

const CATEGORIAS = [
  { id: "todos", label: "Todos los escenarios" },
  { id: "estadios", label: "Estadios y pistas" },
  { id: "canchas", label: "Canchas" },
  { id: "gimnasio", label: "Gimnasio" },
  { id: "piscina", label: "Piscina" },
] as const;

function Page() {
  const { data } = useDatos();
  const [categoria, setCategoria] = useState<string>("todos");

  const escenarios = useMemo(() => {
    if (!data) return [];
    // Se construye desde el catálogo aprobado; los registros previos de la BD
    // quedan fuera de la pantalla hasta que se ejecute la migración de limpieza.
    return CATALOGO_ESCENARIOS.flatMap((cat) => {
      const guardado = data.escenarios.find((e) => e.nombre.trim().toLocaleLowerCase() === cat.nombre.toLocaleLowerCase());
      return guardado ? [{ ...guardado, capacidad: cat.capacidad, ubicacion: cat.ubicacion, grupoCatalogo: cat.grupo ?? null }] : [];
    });
  }, [data]);

  const stats = useMemo(() => ({
    total: escenarios.length,
    estadiosYPistas: escenarios.filter((e) => ["Estadio", "Pista Atlética"].includes(e.tipo ?? "")).length,
    canchas: escenarios.filter((e) => e.tipo?.toLocaleLowerCase().includes("cancha") ?? false).length,
    gimnasio: escenarios.filter((e) => e.tipo === "Gimnasio").length,
    piscina: escenarios.filter((e) => e.tipo === "Piscina").length,
  }), [escenarios]);

  const filtrados = useMemo(() => {
    if (categoria === "estadios") return escenarios.filter((e) => ["Estadio", "Pista Atlética"].includes(e.tipo ?? ""));
    if (categoria === "canchas") return escenarios.filter((e) => e.tipo?.toLocaleLowerCase().includes("cancha") ?? false);
    if (categoria === "gimnasio") return escenarios.filter((e) => e.tipo === "Gimnasio");
    if (categoria === "piscina") return escenarios.filter((e) => e.tipo === "Piscina");
    return escenarios;
  }, [escenarios, categoria]);

  const menus = useMemo(() => {
    const agrupados = new Map<string, typeof filtrados>();
    const individuales: typeof filtrados = [];
    for (const escenario of filtrados) {
      if (!escenario.grupoCatalogo) {
        individuales.push(escenario);
        continue;
      }
      agrupados.set(escenario.grupoCatalogo, [...(agrupados.get(escenario.grupoCatalogo) ?? []), escenario]);
    }
    return { agrupados: [...agrupados.entries()], individuales };
  }, [filtrados]);

  if (!data) return <Cargando />;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Escenarios deportivos</h1>
        <p className="mt-1 text-muted-foreground">Consulta el inventario y reserva un espacio en el mismo módulo.</p>
      </header>

      <ReservasEscenarios escenarios={escenarios.map((e) => ({ id: e.id, nombre: e.nombre }))} />

      <section className="space-y-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="Escenarios vigentes" value={stats.total} icon={<Building2 className="h-4 w-4 text-primary" />} />
          <Metric label="Estadios y pistas" value={stats.estadiosYPistas} icon={<Trophy className="h-4 w-4 text-primary" />} />
          <Metric label="Canchas" value={stats.canchas} icon={<Trophy className="h-4 w-4 text-primary" />} />
          <Metric label="Gimnasios" value={stats.gimnasio} icon={<Dumbbell className="h-4 w-4 text-primary" />} />
        </div>

        <div className="flex flex-wrap gap-2" aria-label="Filtrar escenarios">
          {CATEGORIAS.map((cat) => <button key={cat.id} onClick={() => setCategoria(cat.id)} className={`rounded-full px-3 py-1.5 text-sm transition-colors ${categoria === cat.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{cat.label}{cat.id === "todos" ? ` (${stats.total})` : ""}</button>)}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {menus.agrupados.map(([grupo, miembros]) => (
            <details key={grupo} className="group rounded-xl border bg-card shadow-sm open:sm:col-span-2 open:xl:col-span-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl p-5 hover:bg-muted/40">
                <span><span className="block text-lg font-semibold">{grupo}</span><span className="text-sm text-muted-foreground">{miembros.length} escenarios · {miembros[0]?.ubicacion ?? "Ubicación no especificada"} · pulsa para desplegar</span>{INFO_GRUPOS[grupo] && <span className="mt-1 block text-xs text-muted-foreground">{INFO_GRUPOS[grupo]}</span>}</span>
                <ChevronDown className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180" />
              </summary>
              <div className="grid gap-3 border-t p-4 sm:grid-cols-2 lg:grid-cols-3">
                {miembros.map((e) => <EscenarioCard key={e.id} nombre={e.nombre} tipo={e.tipo} ubicacion={e.ubicacion} capacidad={e.capacidad} />)}
              </div>
            </details>
          ))}
          {menus.individuales.map((e) => <EscenarioCard key={e.id} nombre={e.nombre} tipo={e.tipo} ubicacion={e.ubicacion} capacidad={e.capacidad} />)}
          {!menus.agrupados.length && !menus.individuales.length && <p className="col-span-full rounded-xl border p-8 text-center text-muted-foreground">No hay escenarios en esta categoría.</p>}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return <div className="rounded-xl border bg-card p-4 shadow-sm"><div className="flex items-center justify-between text-xs font-medium text-muted-foreground">{label}{icon}</div><div className="mt-2 text-2xl font-bold">{value}</div></div>;
}

function EscenarioCard({ nombre, tipo, ubicacion, capacidad }: { nombre: string; tipo: string | null; ubicacion: string | null; capacidad: number | null }) {
  return <article className="rounded-lg border bg-background p-4"><h3 className="font-medium">{nombre}</h3><p className="mt-1 text-sm text-muted-foreground">{tipo ?? "Escenario"}</p><dl className="mt-3 grid gap-1 text-xs text-muted-foreground"><div><dt className="inline font-medium">Ubicación: </dt><dd className="inline">{ubicacion ?? "No especificada"}</dd></div><div><dt className="inline font-medium">Capacidad: </dt><dd className="inline">{capacidad == null ? "No especificada" : `${capacidad} personas`}</dd></div></dl></article>;
}

