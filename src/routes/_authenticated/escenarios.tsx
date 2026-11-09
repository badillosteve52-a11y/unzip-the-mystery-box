import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Building2, ChevronDown, Dumbbell, Table2, Trophy, Waves } from "lucide-react";
import { Cargando } from "@/components/PageHeader";
import { ReservasEscenarios } from "@/components/ReservasEscenarios";
import { useDatos } from "@/lib/db";
import { CATALOGO_ESCENARIOS } from "@/lib/catalogos";
import { Button } from "@/components/ui/button";
import { FUENTE_CAMPUS, FUENTE_ESCENARIOS, ubicacionEscenario, usoDeportivo } from "@/lib/escenarios-info";
import { routeMeta } from "@/lib/route-meta";

export const Route = createFileRoute("/_authenticated/escenarios")({
  head: () => routeMeta("Escenarios deportivos", "Ubicaciones, uso deportivo, aforo de público y reservas de los escenarios de la ESPOCH en Riobamba."),
  component: Page,
});

const INFO_GRUPOS: Record<string, string> = {
  "Estadios 1 y 2": "La ficha conjunta de estadios publica 700 aficionados, sin desglose por estadio.",
  "Pistas atléticas": "Aforo publicado para la pista atlética: 700 aficionados; la ESPOCH no desglosa el dato por pista.",
  "Canchas de tenis": "Aforo publicado para el conjunto: 300 aficionados",
  "Canchas de ecuavóley": "La ESPOCH publica 150 aficionados para el conjunto de canchas de ecuavóley y vóley playero; no desglosa el aforo por cancha.",
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
    piscina: escenarios.filter((e) => e.tipo === "Piscina").length, coliseo: escenarios.filter((e) => e.tipo === "Coliseo").length, tenisMesa: escenarios.filter((e) => e.tipo === "Sala de Tenis de Mesa").length,
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
    // Un conjunto con una sola cancha no tiene nada que desplegar: se muestra como tarjeta suelta.
    for (const [grupo, miembros] of [...agrupados.entries()]) {
      if (miembros.length < 2) {
        agrupados.delete(grupo);
        individuales.push(...miembros);
      }
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          <Metric label="Escenarios vigentes" value={stats.total} icon={<Building2 className="h-4 w-4 text-primary" />} />
          <Metric label="Estadios y pistas" value={stats.estadiosYPistas} icon={<Trophy className="h-4 w-4 text-primary" />} />
          <Metric label="Canchas" value={stats.canchas} icon={<Trophy className="h-4 w-4 text-primary" />} />
          <Metric label="Gimnasios" value={stats.gimnasio} icon={<Dumbbell className="h-4 w-4 text-primary" />} /> <Metric label="Piscinas" value={stats.piscina} icon={<Waves className="h-4 w-4 text-primary" />} /> <Metric label="Coliseos" value={stats.coliseo} icon={<Building2 className="h-4 w-4 text-primary" />} /> <Metric label="Salas de tenis de mesa" value={stats.tenisMesa} icon={<Table2 className="h-4 w-4 text-primary" />} />
        </div>

        <div className="flex flex-wrap gap-2" aria-label="Filtrar escenarios">
          {CATEGORIAS.map((cat) => <Button key={cat.id} variant={categoria === cat.id ? "default" : "secondary"} aria-pressed={categoria === cat.id} onClick={() => setCategoria(cat.id)}>{cat.label}{cat.id === "todos" ? ` (${stats.total})` : ""}</Button>)}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {menus.agrupados.map(([grupo, miembros]) => (
            <details key={grupo} className="group rounded-xl border bg-card shadow-sm open:sm:col-span-2 open:xl:col-span-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl p-5 hover:bg-muted/40">
                <span><span className="block text-lg font-semibold">{grupo}</span><span className="text-sm text-muted-foreground">{miembros.length} escenarios · {ubicacionEscenario(miembros[0]?.ubicacion ?? null)}</span>{INFO_GRUPOS[grupo] && <span className="mt-1 block text-xs text-muted-foreground">{INFO_GRUPOS[grupo]}</span>}</span>
                <ChevronDown className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180" />
              </summary>
              <div className="grid gap-3 border-t p-4 sm:grid-cols-2 lg:grid-cols-3">
                {miembros.map((e) => <EscenarioCard key={e.id} nombre={e.nombre} tipo={e.tipo} ubicacion={e.ubicacion} capacidad={e.capacidad} capacidadConjunta={Boolean(INFO_GRUPOS[grupo])} />)}
              </div>
            </details>
          ))}
          {menus.individuales.map((e) => <EscenarioCard key={e.id} nombre={e.nombre} tipo={e.tipo} ubicacion={e.ubicacion} capacidad={e.capacidad} />)}
          {!menus.agrupados.length && !menus.individuales.length && <p className="col-span-full rounded-xl border p-8 text-center text-muted-foreground">No hay escenarios en esta categoría.</p>}
        </div>
        <p className="text-xs text-muted-foreground">Referencias: <a className="underline" href={FUENTE_ESCENARIOS} target="_blank" rel="noreferrer">Escenarios deportivos ESPOCH</a> y <a className="underline" href={FUENTE_CAMPUS} target="_blank" rel="noreferrer">Matriz Riobamba</a>. Los jugadores indicados corresponden al uso deportivo, no al aforo de público ni al límite de seguridad.</p>
      </section>
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return <div className="rounded-xl border bg-card p-4 shadow-sm"><div className="flex items-center justify-between text-xs font-medium text-muted-foreground">{label}{icon}</div><div className="mt-2 text-2xl font-bold">{value}</div></div>;
}

function EscenarioCard({ nombre, tipo, ubicacion, capacidad, capacidadConjunta = false }: { nombre: string; tipo: string | null; ubicacion: string | null; capacidad: number | null; capacidadConjunta?: boolean }) {
  return <article className="rounded-lg border bg-background p-4"><h3 className="font-medium">{nombre}</h3><p className="mt-1 text-sm text-muted-foreground">{tipo ?? "Escenario"}</p><dl className="mt-3 grid gap-2 text-xs text-muted-foreground"><div><dt className="inline font-medium">Ubicación: </dt><dd className="inline">{ubicacionEscenario(ubicacion)}</dd></div><div><dt className="inline font-medium">Uso deportivo: </dt><dd className="inline">{usoDeportivo(tipo)}</dd></div>{(capacidadConjunta || capacidad != null) && <div><dt className="inline font-medium">Público: </dt><dd className="inline">{capacidadConjunta ? "Referencia conjunta indicada arriba" : `${capacidad} aficionados en la ficha ESPOCH${tipo === "Gimnasio" ? " de gimnasia; no equivale a usuarios de equipos" : ""}`}</dd></div>}</dl></article>;
}

