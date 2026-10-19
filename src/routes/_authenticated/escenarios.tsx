import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Building2, Dumbbell, GraduationCap, Trophy, Waves } from "lucide-react";
import { SimpleCrud } from "@/components/SimpleCrud";
import { Cargando } from "@/components/PageHeader";
import { useDatos } from "@/lib/db";
import { TIPOS_ESCENARIOS, UBICACIONES_ESCENARIOS } from "@/lib/catalogos";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/escenarios")({
  head: () => ({ meta: [{ title: "Escenarios deportivos — Centro de Deportes ESPOCH" }] }),
  component: Page,
});

const CATEGORIAS = [
  { id: "todos", label: "Todos los espacios" },
  { id: "estadios", label: "Estadios y Pistas" },
  { id: "coliseo_salas", label: "Coliseo y Salas" },
  { id: "canchas", label: "Canchas y Complejo" },
  { id: "piscina_gimnasio", label: "Piscina y Gimnasio" },
  { id: "facultades", label: "Canchas de Facultades" },
] as const;

function Page() {
  const { data } = useDatos();
  const [categoria, setCategoria] = useState<string>("todos");

  const escenarios = data?.escenarios ?? [];

  const stats = useMemo(() => {
    const total = escenarios.length;
    const aforoTotal = escenarios.reduce((acc, e) => acc + (Number(e.capacidad) || 0), 0);
    const estadiosYPistas = escenarios.filter((e) =>
      ["Estadio", "Pista Atlética", "Pista / Circuito"].includes(e.tipo ?? "")
    ).length;
    const canchas = escenarios.filter((e) =>
      (e.tipo?.toLowerCase().includes("cancha") ?? false) && !e.ubicacion?.toLowerCase().includes("facultad")
    ).length;
    const facultades = escenarios.filter(
      (e) => e.ubicacion?.toLowerCase().includes("facultad") || e.tipo === "Cancha Múltiple"
    ).length;
    const cerrados = escenarios.filter((e) =>
      ["Coliseo", "Piscina", "Gimnasio", "Sala Especializada"].includes(e.tipo ?? "")
    ).length;

    return { total, aforoTotal, estadiosYPistas, canchas, facultades, cerrados };
  }, [escenarios]);

  const filtrados = useMemo(() => {
    if (categoria === "todos") return escenarios;
    if (categoria === "estadios") {
      return escenarios.filter((e) =>
        ["Estadio", "Pista Atlética", "Pista / Circuito"].includes(e.tipo ?? "")
      );
    }
    if (categoria === "coliseo_salas") {
      return escenarios.filter((e) =>
        ["Coliseo", "Sala Especializada"].includes(e.tipo ?? "")
      );
    }
    if (categoria === "canchas") {
      return escenarios.filter((e) =>
        [
          "Cancha Sintética",
          "Cancha de Baloncesto",
          "Cancha de Ecuavóley",
          "Cancha de Tenis",
          "Cancha de Arena",
          "Cancha Deportiva",
        ].includes(e.tipo ?? "") && !e.ubicacion?.toLowerCase().includes("facultad")
      );
    }
    if (categoria === "piscina_gimnasio") {
      return escenarios.filter((e) => ["Piscina", "Gimnasio"].includes(e.tipo ?? ""));
    }
    if (categoria === "facultades") {
      return escenarios.filter(
        (e) => e.ubicacion?.toLowerCase().includes("facultad") || e.tipo === "Cancha Múltiple"
      );
    }
    return escenarios;
  }, [escenarios, categoria]);

  if (!data) return <Cargando />;

  const extraTop = (
    <div className="mb-6 space-y-4">
      {/* Tarjetas de métricas del Centro de Deportes */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            Total Escenarios <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div className="font-display mt-2 text-2xl font-bold">{stats.total}</div>
          <p className="mt-1 text-[11px] text-muted-foreground">Campus y Facultades</p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            Aforo Total Estimado <Trophy className="h-4 w-4 text-primary" />
          </div>
          <div className="font-display mt-2 text-2xl font-bold">
            {stats.aforoTotal.toLocaleString()}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Capacidad espectadores</p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            Estadios y Pistas <Trophy className="h-4 w-4 text-primary" />
          </div>
          <div className="font-display mt-2 text-2xl font-bold">{stats.estadiosYPistas}</div>
          <p className="mt-1 text-[11px] text-muted-foreground">Fútbol y Atletismo</p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            Piscina, Coliseo y Salas <Waves className="h-4 w-4 text-primary" />
          </div>
          <div className="font-display mt-2 text-2xl font-bold">{stats.cerrados}</div>
          <p className="mt-1 text-[11px] text-muted-foreground">Espacios cubiertos</p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            Canchas de Facultades <GraduationCap className="h-4 w-4 text-primary" />
          </div>
          <div className="font-display mt-2 text-2xl font-bold">{stats.facultades}</div>
          <p className="mt-1 text-[11px] text-muted-foreground">Canchas intercarreras</p>
        </div>
      </div>

      {/* Botones de categoría rápida */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="mr-1 text-xs font-semibold text-muted-foreground">Categoría:</span>
        {CATEGORIAS.map((cat) => {
          const activo = categoria === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setCategoria(cat.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
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
      subtitulo="Inventario y catálogo completo de la infraestructura deportiva de la ESPOCH (Centro de Deportes y facultades)."
      singular="escenario"
      extraTop={extraTop}
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

