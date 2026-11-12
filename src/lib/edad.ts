export function calcularEdad(fechaNacimiento: string | null | undefined, hoy: Date = new Date()): number | null {
  if (!fechaNacimiento) return null;
  const [y, m, d] = fechaNacimiento.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  let edad = hoy.getFullYear() - y;
  const mes = hoy.getMonth() + 1;
  if (mes < m || (mes === m && hoy.getDate() < d)) edad--;
  return edad;
}

export function normalizarFecha(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (v instanceof Date && !isNaN(v.getTime())) {
    const z = (n: number) => String(n).padStart(2, "0");
    return String(v.getFullYear()) + "-" + z(v.getMonth() + 1) + "-" + z(v.getDate());
  }
  const serial = typeof v === "number" ? v : /^\d{5}(?:\.\d+)?$/.test(String(v).trim()) ? Number(v) : NaN;
  if (Number.isFinite(serial) && serial >= 1 && serial <= 100000) {
    const date = new Date(Date.UTC(1899, 11, 30) + Math.floor(serial) * 86400000);
    const z = (n: number) => String(n).padStart(2, "0");
    return String(date.getUTCFullYear()) + "-" + z(date.getUTCMonth() + 1) + "-" + z(date.getUTCDate());
  }
  const s = String(v).trim();
  const aFechaValida = (anio: number, mes: number, dia: number) => {
    const fecha = new Date(Date.UTC(anio, mes - 1, dia));
    if (fecha.getUTCFullYear() !== anio || fecha.getUTCMonth() !== mes - 1 || fecha.getUTCDate() !== dia) return null;
    const z = (n: number) => String(n).padStart(2, "0");
    return String(anio).padStart(4, "0") + "-" + z(mes) + "-" + z(dia);
  };
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return aFechaValida(Number(m[1]), Number(m[2]), Number(m[3]));
  m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) return aFechaValida(Number(m[3]), Number(m[2]), Number(m[1]));
  return null;
}
