import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { CATALOGO_CLUBES, CATALOGO_DEPORTES, CATALOGO_ESCENARIOS, CATALOGO_SELECCIONES, normalizarCarrera, normalizarFacultad } from "./catalogos";

export type Deportista = Tables<"deportistas">;
export type Deporte = Tables<"deportes">;
export type Periodo = Tables<"periodos">;
export type Escenario = Tables<"escenarios">;
export type Grupo = Tables<"selecciones">;

async function all<T>(q: PromiseLike<{ data: T[] | null; error: unknown }>) {
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

async function asegurarPeriodoActual(existentes: Tables<"periodos">[]) {
  // Limpiar cualquier período con formato "PAO ..." generado automáticamente por error
  const creadosPorError = existentes.filter(
    (p) =>
      p.nombre.startsWith("PAO 2025-2") ||
      p.nombre.startsWith("PAO 2026-1") ||
      p.nombre.startsWith("PAO 2026-2")
  );
  if (creadosPorError.length > 0) {
    for (const err of creadosPorError) {
      supabase.from("periodos").delete().eq("id", err.id).then(() => {});
    }
    return existentes.filter((p) => !creadosPorError.some((c) => c.id === p.id));
  }
  return existentes;
}


async function asegurarDeportes(existentes: Tables<"deportes">[]) {
  const nombresExistentes = new Set(existentes.map((d) => d.nombre.trim().toLowerCase()));
  const faltantes = CATALOGO_DEPORTES.filter((n) => !nombresExistentes.has(n.trim().toLowerCase()));

  if (!faltantes.length) return existentes;

  const aInsertar = faltantes.map((nombre) => ({ nombre, es_ejemplo: false }));
  const { data: nuevos, error } = await supabase.from("deportes").insert(aInsertar).select("*");
  if (error) {
    console.error("Error al completar catálogo de deportes:", error);
    return existentes;
  }
  return [...existentes, ...(nuevos ?? [])].sort((a, b) => a.nombre.localeCompare(b.nombre));
}

async function asegurarSelecciones(existentes: Tables<"selecciones">[], deportes: Tables<"deportes">[], periodoActualId: string | null) {
  const nombresExistentes = new Set(existentes.map((s) => s.nombre.trim().toLowerCase()));
  const faltantes = CATALOGO_SELECCIONES.filter((n) => !nombresExistentes.has(n.trim().toLowerCase()));

  if (!faltantes.length) return existentes;

  const deportesMap = new Map(deportes.map((d) => [d.nombre.trim().toLowerCase(), d.id]));

  const aInsertar = faltantes.map((nombre) => {
    let deporte_id: string | null = null;
    const nLower = nombre.toLowerCase();
    for (const [dNombre, dId] of deportesMap.entries()) {
      if (nLower.includes(dNombre)) {
        deporte_id = dId;
        break;
      }
    }
    return { nombre, deporte_id, periodo_id: periodoActualId, es_ejemplo: false };
  });

  const { data: nuevos, error } = await supabase.from("selecciones").insert(aInsertar).select("*");
  if (error) {
    console.error("Error al completar catálogo de selecciones:", error);
    return existentes;
  }
  return [...existentes, ...(nuevos ?? [])].sort((a, b) => a.nombre.localeCompare(b.nombre));
}

async function asegurarClubes(existentes: Tables<"clubes">[], deportes: Tables<"deportes">[], periodoActualId: string | null) {
  // Eliminar clubes fuera del catálogo acordado (con sus integrantes)
  const nombresCatalogo = new Set(CATALOGO_CLUBES.map((n) => n.trim().toLowerCase()));
  const sobrantes = existentes.filter((c) => !nombresCatalogo.has(c.nombre.trim().toLowerCase()));
  let vigentes = existentes;
  if (sobrantes.length) {
    const ids = sobrantes.map((c) => c.id);
    await supabase.from("club_miembros").delete().in("club_id", ids);
    const { error } = await supabase.from("clubes").delete().in("id", ids);
    if (error) console.error("Error al eliminar clubes fuera del catálogo:", error);
    else vigentes = existentes.filter((c) => nombresCatalogo.has(c.nombre.trim().toLowerCase()));
  }

  const nombresExistentes = new Set(vigentes.map((c) => c.nombre.trim().toLowerCase()));
  const faltantes = CATALOGO_CLUBES.filter((n) => !nombresExistentes.has(n.trim().toLowerCase()));

  if (!faltantes.length) return vigentes;

  const deportesMap = new Map(deportes.map((d) => [d.nombre.trim().toLowerCase(), d.id]));

  const aInsertar = faltantes.map((nombre) => {
    let deporte_id: string | null = null;
    const nLower = nombre.toLowerCase();
    for (const [dNombre, dId] of deportesMap.entries()) {
      if (nLower.includes(dNombre)) {
        deporte_id = dId;
        break;
      }
    }
    return { nombre, deporte_id, periodo_id: periodoActualId, es_ejemplo: false };
  });

  const { data: nuevos, error } = await supabase.from("clubes").insert(aInsertar).select("*");
  if (error) {
    console.error("Error al completar catálogo de clubes:", error);
    return vigentes;
  }
  return [...vigentes, ...(nuevos ?? [])].sort((a, b) => a.nombre.localeCompare(b.nombre));
}

async function asegurarEscenarios(existentes: Tables<"escenarios">[]) {
  let actualizados = [...existentes];

  // Si hay registros de ejemplo antiguos con valores preliminares, actualizarlos a datos reales
  for (const cat of CATALOGO_ESCENARIOS) {
    const coincidencia = existentes.find(
      (e) =>
        e.nombre.trim().toLowerCase() === cat.nombre.trim().toLowerCase() ||
        (cat.nombre === "Coliseo Institucional Politécnico" && (e.nombre === "Coliseo ESPOCH" || e.nombre.toLowerCase().includes("coliseo espoch"))) ||
        (cat.nombre === "Estadio Politécnico 1" && (e.nombre === "Estadio Politécnico" || e.nombre.toLowerCase().includes("estadio politécnico"))) ||
        (cat.nombre === "Piscina Semiolímpica Politécnica" && (e.nombre === "Piscina Semiolímpica" || e.nombre.toLowerCase().includes("piscina semiolímpica"))) ||
        (cat.nombre === "Cancha Sintética 1 (Fútbol)" && (e.nombre === "Cancha sintética 1" || e.nombre.toLowerCase().includes("cancha sintética 1")))
    );
    if (coincidencia && coincidencia.es_ejemplo) {
      const { data: act, error } = await supabase
        .from("escenarios")
        .update({
          nombre: cat.nombre,
          capacidad: cat.capacidad,
          tipo: cat.tipo,
          ubicacion: cat.ubicacion,
          observaciones: cat.observaciones,
          es_ejemplo: false,
        })
        .eq("id", coincidencia.id)
        .select("*")
        .single();
      if (!error && act) {
        actualizados = actualizados.map((e) => (e.id === act.id ? act : e));
      }
    }
  }

  const nombresActualizados = new Set(actualizados.map((e) => e.nombre.trim().toLowerCase()));
  const faltantes = CATALOGO_ESCENARIOS.filter(
    (e) => !nombresActualizados.has(e.nombre.trim().toLowerCase())
  );

  if (!faltantes.length) {
    return actualizados.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  const aInsertar = faltantes.map((e) => ({
    nombre: e.nombre,
    capacidad: e.capacidad,
    tipo: e.tipo,
    ubicacion: e.ubicacion,
    observaciones: e.observaciones,
    detalles: {},
    es_ejemplo: false,
  }));

  const { data: nuevos, error } = await supabase.from("escenarios").insert(aInsertar).select("*");
  if (error) {
    console.error("Error al completar catálogo de escenarios:", error);
    return actualizados;
  }
  return [...actualizados, ...(nuevos ?? [])].sort((a, b) => a.nombre.localeCompare(b.nombre));
}

export type DatosCompletos = Awaited<ReturnType<typeof cargarTodo>>;

async function cargarTodo() {
  const [deportistas, deportesRaw, periodosRaw, escenariosRaw, dd, seleccionesRaw, selMiembros, clubesRaw, clubMiembros] =
    await Promise.all([
      all(supabase.from("deportistas").select("*").order("apellidos")),
      all(supabase.from("deportes").select("*").order("nombre")),
      all(supabase.from("periodos").select("*").order("nombre", { ascending: false })),
      all(supabase.from("escenarios").select("*").order("nombre")),
      all(supabase.from("deportista_deportes").select("*")),
      all(supabase.from("selecciones").select("*").order("nombre")),
      all(supabase.from("seleccion_miembros").select("*")),
      all(supabase.from("clubes").select("*").order("nombre")),
      all(supabase.from("club_miembros").select("*")),
    ]);

  const periodos = await asegurarPeriodoActual(periodosRaw);
  const periodoActualId = periodos.find((p) => p.activo)?.id ?? null;
  const deportes = await asegurarDeportes(deportesRaw);
  const selecciones = await asegurarSelecciones(seleccionesRaw, deportes, periodoActualId);
  const clubes = await asegurarClubes(clubesRaw, deportes, periodoActualId);
  const escenarios = await asegurarEscenarios(escenariosRaw);

  // Normalizar facultad Y carrera de todos los deportistas al cargar.
  // Esto corrige datos de ejemplo incorrectos ("Ingeniería en Sistemas",
  // "Ingeniería Civil", "Nutrición", "Contabilidad"…) y también unifica
  // los nombres de facultad abreviados al formato oficial en mayúsculas.
  // Los cambios se persisten en Supabase en segundo plano.
  const deportistasNormalizados = deportistas.map((d, i) => {
    // Estudiantes de ejemplo sin región: se les asigna una para mostrar el panel por zona
    if (d.es_ejemplo && !d.region) {
      const region = ["Sierra", "Sierra", "Costa", "Sierra", "Amazonía", "Costa", "Sierra", "Insular"][i % 8];
      d = { ...d, region };
      supabase.from("deportistas").update({ region }).eq("id", d.id).then(() => {});
    }
    const facNorm = normalizarFacultad(d.facultad);
    const carreraNorm = normalizarCarrera(d.carrera, facNorm);
    const cambioFac = facNorm !== d.facultad;
    const cambioCarrera = carreraNorm !== d.carrera;
    if (cambioFac || cambioCarrera) {
      const patch: { facultad?: string | null; carrera?: string | null } = {};
      if (cambioFac) patch.facultad = facNorm;
      if (cambioCarrera) patch.carrera = carreraNorm;
      supabase.from("deportistas").update(patch).eq("id", d.id).then(() => {});
    }
    return { ...d, facultad: facNorm, carrera: carreraNorm };
  });

  return {
    deportistas: deportistasNormalizados,
    deportes,
    periodos,
    escenarios,
    dd,
    selecciones,
    selMiembros: selMiembros.map((m) => ({ grupo_id: m.seleccion_id, deportista_id: m.deportista_id })),
    clubes,
    clubMiembros: clubMiembros.map((m) => ({ grupo_id: m.club_id, deportista_id: m.deportista_id })),
  };
}

export function useDatos() {
  return useQuery({ queryKey: ["datos"], queryFn: cargarTodo });
}

export function useRefrescar() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["datos"] });
}

export async function borrarDatosEjemplo() {
  for (const t of ["selecciones", "clubes", "deportistas", "escenarios", "deportes", "periodos"] as const) {
    const { error } = await supabase.from(t).delete().eq("es_ejemplo", true);
    if (error) throw error;
  }
}

export function errMsg(e: unknown) {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: string }).message);
  return "Ocurrió un error";
}
