export type PeriodoConFecha = {
  id: string;
  nombre?: unknown;
  fecha_inicio?: unknown;
  created_at?: unknown;
};

function fechaPeriodo(periodo: PeriodoConFecha) {
  const fecha = Date.parse(String(periodo.fecha_inicio ?? ""));
  if (Number.isFinite(fecha)) return fecha;

  const nombre = String(periodo.nombre ?? "").toLocaleLowerCase();
  const anio = nombre.match(/\b(19|20)\d{2}\b/);
  if (anio) {
    const meses = [
      "enero",
      "febrero",
      "marzo",
      "abril",
      "mayo",
      "junio",
      "julio",
      "agosto",
      "septiembre",
      "octubre",
      "noviembre",
      "diciembre",
    ];
    const mes = meses.findIndex((nombreMes) => nombre.includes(nombreMes));
    if (mes >= 0) return Date.UTC(Number(anio[0]), mes, 1);
    const periodoNumerado = nombre.match(/(?:19|20)\d{2}\s*[-/]\s*([12])\b/);
    if (periodoNumerado) return Date.UTC(Number(anio[0]), periodoNumerado[1] === "1" ? 2 : 8, 1);
    return Date.UTC(Number(anio[0]), 0, 1);
  }

  const creado = Date.parse(String(periodo.created_at ?? ""));
  return Number.isFinite(creado) ? creado : Number.NEGATIVE_INFINITY;
}

export function seleccionarPeriodoOrigen<T extends PeriodoConFecha>(
  periodos: T[],
  destino: T,
  periodosConMiembros: Set<string>,
  periodosConGrupos: Set<string>,
) {
  const fechaDestino = fechaPeriodo(destino);
  const anteriores = periodos
    .filter((periodo) => periodo.id !== destino.id && fechaPeriodo(periodo) < fechaDestino)
    .sort((a, b) => fechaPeriodo(b) - fechaPeriodo(a));

  return (
    anteriores.find((periodo) => periodosConMiembros.has(periodo.id)) ??
    anteriores.find((periodo) => periodosConGrupos.has(periodo.id)) ??
    null
  );
}
