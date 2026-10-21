import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export function exportar(filas: Record<string, unknown>[], nombre: string, formato: "xlsx" | "csv") {
  const ws = XLSX.utils.json_to_sheet(filas);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Datos");
  XLSX.writeFile(wb, `${nombre}.${formato}`, { bookType: formato });
}

export function exportarPDF(filas: Record<string, unknown>[], nombre: string) {
  if (!filas.length) return;
  const columnas = Object.keys(filas[0]!);
  const cuerpo = filas.map((f) => columnas.map((c) => (f[c] == null ? "" : String(f[c]))));
  const doc = new jsPDF({ orientation: columnas.length > 6 ? "landscape" : "portrait" });
  doc.setFontSize(13);
  doc.text(nombre.replace(/-/g, " "), 14, 15);
  autoTable(doc, {
    head: [columnas],
    body: cuerpo,
    startY: 20,
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: [27, 94, 32] },
  });
  doc.save(`${nombre}.pdf`);
}

export async function leerArchivo(file: File): Promise<Record<string, unknown>[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]!]!;
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
  // normaliza encabezados: minúsculas, sin tildes ni espacios
  return rows.map((r) => {
    const o: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(r)) {
      o[k.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z]/g, "")] = v;
    }
    return o;
  });
}
