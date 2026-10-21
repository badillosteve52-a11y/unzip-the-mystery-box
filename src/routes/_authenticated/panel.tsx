import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Building2, Dumbbell, Flag, SearchX, Trash2, Users, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Cargando, PageHeader } from "@/components/PageHeader";
import { Filtro, unicos } from "@/components/Filtro";
import { borrarDatosEjemplo, errMsg, useDatos, useRefrescar } from "@/lib/db";
import { filtrarDeportistas } from "@/lib/filtros";
import { LISTA_FACULTADES, getCarrerasPorFacultad } from "@/lib/catalogos";

export const Route = createFileRoute("/_authenticated/panel")({
  head: () => ({ meta: [{ title: "Panel — Centro de Deportes ESPOCH" }] }),
  component: Panel,
});

const COLORES = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function normGeneroPanel(v: string | null | undefined): string | null {
  const s = (v ?? "").trim().toLowerCase();
  if (!s) return null;
  if (s.startsWith("f") || s === "mujer") return "Femenino";
  if (s.startsWith("m") || s === "hombre") return "Masculino";
  return "Otro";
}

function contar(xs: (string | null | undefined)[]) {
  const m = new Map<string, number>();
  xs.forEach((x) => m.set(x || "Sin dato", (m.get(x || "Sin dato") ?? 0) + 1));
  return [...m.entries()].map(([nombre, total]) => ({ nombre, total })).sort((a, b) => b.total - a.total);
}

function Panel() {
  const { data } = useDatos();
  const refrescar = useRefrescar();
  const [f, setF] = useState({ periodo: "", deporte: "", facultad: "", carrera: "" });

  const opcionesFacultad = useMemo(() => {
    return LISTA_FACULTADES.map((fac) => ({ value: fac, label: fac }));
  }, []);

  const opcionesCarrera = useMemo(() => {
    if (!data) return [];
    if (f.facultad) {
      const oficiales = getCarrerasPorFacultad(f.facultad);
      const setCars = new Set(oficiales);
      data.deportistas
        .filter((d) => d.facultad === f.facultad && d.carrera)
        .forEach((d) => setCars.add(d.carrera!));
      return Array.from(setCars).sort().map((c) => ({ value: c, label: c }));
    }
    return unicos(data.deportistas.map((d) => d.carrera));
  }, [data, f.facultad]);

  const r = useMemo(() => {
    if (!data) return null;
    const ds = filtrarDeportistas(data, f);
    const ids = new Set(ds.map((d) => d.id));
    const okG = (g: { periodo_id: string | null; deporte_id: string | null }) =>
      (!f.periodo || g.periodo_id === f.periodo) && (!f.deporte || g.deporte_id === f.deporte);
    const sel = data.selecciones.filter(okG);
    const clu = data.clubes.filter(okG);
    const nombreDep = new Map(data.deportes.map((d) => [d.id, d.nombre]));
    const porDeporte = contar(data.dd.filter((x) => ids.has(x.deportista_id) && (!f.deporte || x.deporte_id === f.deporte)).map((x) => nombreDep.get(x.deporte_id)));
    const comparativa = data.deportes
      .filter((d) => !f.deporte || d.id === f.deporte)
      .map((d) => {
        const cuenta = (gs: typeof sel, ms: typeof data.selMiembros) => {
          const g = new Set(gs.filter((x) => x.deporte_id === d.id).map((x) => x.id));
          return ms.filter((m) => g.has(m.grupo_id) && ids.has(m.deportista_id)).length;
        };
        return { nombre: d.nombre, Clubes: cuenta(clu, data.clubMiembros), Selecciones: cuenta(sel, data.selMiembros) };
      })
      .filter((x) => x.Selecciones + x.Clubes > 0);
    return {
      ds,
      sel,
      clu,
      porDeporte,
      porFacultad: contar(ds.map((d) => d.facultad)),
      porGenero: contar(ds.map((d) => normGeneroPanel(d.genero)).filter((g): g is string => !!g)),
      comparativa,
      hayEjemplo: [data.deportistas, data.deportes, data.periodos, data.escenarios, data.selecciones, data.clubes].some((t) => t.some((x) => x.es_ejemplo)),
    };
  }, [data, f]);

  if (!data || !r) return <Cargando />;

  async function borrarEjemplo() {
    if (!confirm("¿Borrar todos los datos de ejemplo? Tus datos reales no se tocan.")) return;
    try {
      await borrarDatosEjemplo();
      toast.success("Datos de ejemplo eliminados");
      refrescar();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  const metricas = [
    { label: "Deportistas", valor: r.ds.length, icon: Users },
    { label: "Selecciones", valor: r.sel.length, icon: Flag },
    { label: "Clubes", valor: r.clu.length, icon: UsersRound },
    { label: "Deportes", valor: data.deportes.length, icon: Dumbbell },
    { label: "Escenarios", valor: data.escenarios.length, icon: Building2 },
  ];

  const cmpClubes = r.comparativa
    .filter((x) => x.Clubes > 0)
    .map((x) => ({ nombre: x.nombre, total: x.Clubes }))
    .sort((a, b) => b.total - a.total);
  const cmpSelecciones = r.comparativa
    .filter((x) => x.Selecciones > 0)
    .map((x) => ({ nombre: x.nombre, total: x.Selecciones }))
    .sort((a, b) => b.total - a.total);


  return (
    <div>
      <PageHeader title="Panel general" subtitle="Resumen del Centro de Deportes según los filtros elegidos.">
        {r.hayEjemplo && (
          <Button variant="outline" onClick={borrarEjemplo}>
            <Trash2 className="mr-2 h-4 w-4" /> Borrar datos de ejemplo
          </Button>
        )}
      </PageHeader>

      <div className="mb-6 flex flex-wrap gap-3">
        <Filtro label="Período" value={f.periodo} onChange={(v) => setF({ ...f, periodo: v })} opciones={data.periodos.map((p) => ({ value: p.id, label: p.nombre }))} />
        <Filtro label="Deporte" value={f.deporte} onChange={(v) => setF({ ...f, deporte: v })} opciones={data.deportes.map((p) => ({ value: p.id, label: p.nombre }))} />
        <Filtro label="Facultad" value={f.facultad} onChange={(v) => setF({ ...f, facultad: v, carrera: "" })} opciones={opcionesFacultad} />
        <Filtro label="Carrera" value={f.carrera} onChange={(v) => setF({ ...f, carrera: v })} opciones={opcionesCarrera} />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        {metricas.map((m) => (
          <div key={m.label} className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              {m.label} <m.icon className="h-4 w-4 text-primary" />
            </div>
            <div className="font-display mt-2 text-3xl font-bold">{m.valor}</div>
          </div>
        ))}
      </div>

      {!r.ds.length && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-dashed bg-muted/40 p-4 text-sm">
          <SearchX className="h-5 w-5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1">No se encontraron deportistas con estos filtros.</span>
          <Button size="sm" variant="outline" onClick={() => setF({ periodo: "", deporte: "", facultad: "", carrera: "" })}>Quitar filtros</Button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Grafico titulo="Deportistas por deporte" vacio={!r.porDeporte.length}>
          <BarChart data={r.porDeporte}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="nombre" fontSize={11} interval={0} angle={-25} textAnchor="end" height={50} />
            <YAxis allowDecimals={false} fontSize={12} width={30} />
            <Tooltip />
            <Bar dataKey="total" name="Deportistas" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </Grafico>
        <div className="rounded-xl border bg-card p-4">
          <h3 className="mb-3 font-semibold">Deportistas por facultad</h3>
          {r.porFacultad.length ? (
            <ul className="space-y-3">
              {r.porFacultad.map((x, i) => (
                <li key={x.nombre}>
                  <div className="mb-1 flex items-start justify-between gap-3 text-sm">
                    <span className="min-w-0">{x.nombre}</span>
                    <span className="shrink-0 font-semibold">{x.total}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full" style={{ width: `${(x.total / (r.porFacultad[0]?.total ?? 1)) * 100}%`, background: COLORES[i % COLORES.length] }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <SinDatos />
          )}
        </div>
        <Grafico titulo="Deportistas por género" vacio={!r.porGenero.length}>
          <PieChart>
            <Pie data={r.porGenero} dataKey="total" nameKey="nombre" innerRadius={50} outerRadius={90} label>
              {r.porGenero.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
            </Pie>
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </Grafico>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <GraficoIntegrantes titulo="Integrantes en clubes" datos={cmpClubes} color="var(--chart-3)" />
        <GraficoIntegrantes titulo="Integrantes en selecciones" datos={cmpSelecciones} color="var(--chart-1)" />
      </div>
    </div>
  );

}

function SinDatos() {
  return (
    <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
      <SearchX className="h-8 w-8" />
      No hay datos con los filtros elegidos.
    </div>
  );
}

function Grafico({ titulo, children, vacio, alto = 288 }: { titulo: string; children: React.ReactElement; vacio?: boolean; alto?: number }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <h3 className="mb-3 font-semibold">{titulo}</h3>
      <div style={{ height: alto }}>
        {vacio ? <SinDatos /> : <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>}
      </div>
    </div>
  );
}

function GraficoIntegrantes({ titulo, datos, color }: { titulo: string; datos: { nombre: string; total: number }[]; color: string }) {
  const alto = Math.max(260, datos.length * 38 + 30);
  return (
    <Grafico titulo={titulo} vacio={!datos.length} alto={alto}>
      <BarChart data={datos} layout="vertical" margin={{ top: 6, right: 24, left: 4, bottom: 6 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis type="number" allowDecimals={false} fontSize={12} />
        <YAxis type="category" dataKey="nombre" fontSize={11} width={120} />
        <Tooltip />
        <Bar dataKey="total" name="Integrantes" fill={color} radius={[0, 4, 4, 0]} />
      </BarChart>
    </Grafico>
  );
}

