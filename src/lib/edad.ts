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
    return `${v.getFullYear()}-${z(v.getMonth() + 1)}-${z(v.getDate())}`;
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2]!.padStart(2, "0")}-${m[3]!.padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) return `${m[3]}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
  return null;
}
