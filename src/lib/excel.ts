import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import logoEspoch from "@/assets/espoch-logo.png";

export function exportar(filas: Record<string, unknown>[], nombre: string, formato: "xlsx" | "csv") {
  const ws = XLSX.utils.json_to_sheet(filas);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Datos");
  XLSX.writeFile(wb, `${nombre}.${formato}`, { bookType: formato });
}

function cargarLogoPdf() {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const imagen = new Image();
    imagen.onload = () => resolve(imagen);
    imagen.onerror = reject;
    imagen.src = logoEspoch;
  });
}

export async function exportarPDF(filas: Record<string, unknown>[], nombre: string) {
  if (!filas.length) return;
  const columnas = Object.keys(filas[0]!);
  const cuerpo = filas.map((f) => columnas.map((c) => (f[c] == null ? "" : String(f[c]))));
  const doc = new jsPDF({ orientation: columnas.length > 6 ? "landscape" : "portrait" });
  const logo = await cargarLogoPdf().catch(() => null);
  const titulo = nombre.replace(/[-_]/g, " ").replace(/\s+/g, " ").trim();
  autoTable(doc, {
    head: [columnas],
    body: cuerpo,
    startY: 48,
    margin: { top: 48, right: 14, bottom: 20, left: 14 },
    styles: { fontSize: 8, cellPadding: 1.7, textColor: [45, 55, 50], lineColor: [220, 226, 222], lineWidth: 0.15 },
    headStyles: { fillColor: [27, 94, 32], textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [244, 248, 245] },
    willDrawPage: ({ doc: pagina }) => {
      const ancho = pagina.internal.pageSize.getWidth();
      if (logo) pagina.addImage(logo, "PNG", 14, 7, 18, 20);
      pagina.setTextColor(31, 75, 49);
      pagina.setFont("helvetica", "bold");
      pagina.setFontSize(10);
      pagina.text("ESCUELA SUPERIOR POLITÉCNICA DE CHIMBORAZO", 38, 14);
      pagina.setFont("helvetica", "normal");
      pagina.setFontSize(9);
      pagina.text("CENTRO DE EDUCACIÓN FÍSICA", 38, 20);
      pagina.setDrawColor(27, 94, 32);
      pagina.setLineWidth(0.6);
      pagina.line(14, 29, ancho - 14, 29);
      pagina.setTextColor(35, 45, 40);
      pagina.setFont("helvetica", "bold");
      pagina.setFontSize(12);
      pagina.text(titulo, ancho / 2, 38, { align: "center", maxWidth: ancho - 28 });
      pagina.setFont("helvetica", "normal");
      pagina.setFontSize(8);
      pagina.setTextColor(105, 115, 108);
      pagina.text(`Generado: ${new Date().toLocaleDateString("es-EC")}`, ancho - 14, 44, { align: "right" });
    },
  });
  const totalPaginas = doc.getNumberOfPages();
  for (let pagina = 1; pagina <= totalPaginas; pagina += 1) {
    doc.setPage(pagina);
    const ancho = doc.internal.pageSize.getWidth();
    const alto = doc.internal.pageSize.getHeight();
    doc.setDrawColor(215, 222, 217);
    doc.setLineWidth(0.3);
    doc.line(14, alto - 15, ancho - 14, alto - 15);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(105, 115, 108);
    doc.text("Centro de Educación Física · ESPOCH", 14, alto - 9);
    doc.text(`Página ${pagina} de ${totalPaginas}`, ancho - 14, alto - 9, { align: "right" });
  }
  // Forzar descarga: tipo genérico evita que el navegador abra el visor/impresión
  const blob = new Blob([doc.output("arraybuffer")], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nombre}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
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
      o[k.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "")] = v;
    }
    return o;
  });
}
