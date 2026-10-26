import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Building2, Dumbbell, Trophy } from "lucide-react";
import { SimpleCrud } from "@/components/SimpleCrud";
import { Cargando } from "@/components/PageHeader";
import { useDatos } from "@/lib/db";
import { TIPOS_ESCENARIOS, UBICACIONES_ESCENARIOS } from "@/lib/catalogos";

export const Route = createFileRoute("/_authenticated/escenarios")({
  head: () => ({ meta: [{ title: "Escenarios deportivos — Centro de Deportes ESPOCH" }] }),
  component: Page,
});

const CATEGORIAS = [
  { id: "todos", label: "Todos los espacios" },
  { id: "estadios", label: "Estadios y pistas" },
  { id: "canchas", label: "Canchas" },
  { id: "gimnasio", label: "Gimnasio" },
] as const;

function Page() {
  const { data } = useDatos();
  const [categoria, setCategoria] = useState<string>("todos");
  const escenarios = data?.escenarios ?? [];

  const stats = useMemo(() => ({
    total: escenarios.length,
    aforoTotal: escenarios.reduce((acc, e) => acc + (Number(e.capacidad) || 0), 0),
    estadiosYPistas: escenarios.filter((e) => ["Estadio", "Pista Atlética"].includes(e.tipo ?? "")).length,
    canchas: escenarios.filter((e) => (e.tipo?.toLowerCase().includes("cancha") ?? false)).length,
    gimnasio: escenarios.filter((e) => e.tipo === "Gimnasio").length,
  }), [escenarios]);

  const filtrados = useMemo(() => {
    if (categoria === "estadios") return escenarios.filter((e) => ["Estadio", "Pista Atlética"].includes(e.tipo ?? ""));
    if (categoria === "canchas") return escenarios.filter((e) => e.tipo?.toLowerCase().includes("cancha") ?? false);
    if (categoria === "gimnasio") return escenarios.filter((e) => e.tipo === "Gimnasio");
    return escenarios;
  }, [escenarios, categoria]);

  if (!data) return <Cargando />;

  const extraTop = (
    <div className="mb-6 space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            Total de escenarios <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold">{stats.total}</div>
          <p className="mt-1 text-[11px] text-muted-foreground">Centro de Deportes</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            Estadios y pistas <Trophy className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold">{stats.estadiosYPistas}</div>
          <p className="mt-1 text-[11px] text-muted-foreground">Incluye atletismo y running</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            Canchas <Trophy className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold">{stats.canchas}</div>
          <p className="mt-1 text-[11px] text-muted-foreground">Con submenús para grupos</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            Gimnasio <Dumbbell className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold">{stats.gimnasio}</div>
          <p className="mt-1 text-[11px] text-muted-foreground">Instalación institucional</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="mr-1 text-xs font-semibold text-muted-foreground">Categoría:</span>
        {CATEGORIAS.map((cat) => {
          const activo = categoria === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setCategoria(cat.id)}
              className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activo
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {cat.label}
              {cat.id === "todos" && ` (${stats.total})`}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <SimpleCrud
      tabla="escenarios"
      titulo="Escenarios deportivos"
      subtitulo="Inventario del Centro de Deportes ESPOCH, organizado por instalaciones y submenús."
      singular="escenario"
      extraTop={extraTop}
      grupoDeFila={(r) => {
        const detalles = r.detalles;
        if (detalles && typeof detalles === "object" && "grupo" in detalles) {
          const grupo = (detalles as { grupo?: unknown }).grupo;
          return typeof grupo === "string" ? grupo : null;
        }
        return null;
      }}
      campos={[
        { key: "nombre", label: "Nombre", required: true },
        { key: "tipo", label: "Tipo", type: "select", options: TIPOS_ESCENARIOS, badge: true },
        { key: "capacidad", label: "Capacidad", type: "number" },
        { key: "ubicacion", label: "Ubicación", options: UBICACIONES_ESCENARIOS },
        { key: "observaciones", label: "Observaciones / Detalles", type: "textarea" },
      ]}
      filas={filtrados}
    />
  );
}

