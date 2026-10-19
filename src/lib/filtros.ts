import type { DatosCompletos } from "./db";

export type Filtros = { periodo: string; deporte: string; facultad: string; carrera: string; q?: string };

export function filtrarDeportistas(data: DatosCompletos, f: Filtros) {
  let enPeriodo: Set<string> | null = null;
  if (f.periodo) {
    const sel = new Set(data.selecciones.filter((g) => g.periodo_id === f.periodo).map((g) => g.id));
    const clu = new Set(data.clubes.filter((g) => g.periodo_id === f.periodo).map((g) => g.id));
    enPeriodo = new Set([
      ...data.selMiembros.filter((m) => sel.has(m.grupo_id)).map((m) => m.deportista_id),
      ...data.clubMiembros.filter((m) => clu.has(m.grupo_id)).map((m) => m.deportista_id),
    ]);
  }
  const conDeporte = f.deporte ? new Set(data.dd.filter((x) => x.deporte_id === f.deporte).map((x) => x.deportista_id)) : null;
  const t = (f.q ?? "").toLowerCase().trim();
  return data.deportistas.filter(
    (d) =>
      (!enPeriodo || enPeriodo.has(d.id)) &&
      (!conDeporte || conDeporte.has(d.id)) &&
      (!f.facultad || d.facultad === f.facultad) &&
      (!f.carrera || d.carrera === f.carrera) &&
      (!t || `${d.nombres} ${d.apellidos} ${d.apellidos} ${d.nombres} ${d.cedula}`.toLowerCase().includes(t)),
  );
}
