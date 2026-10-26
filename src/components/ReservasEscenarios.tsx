import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CATALOGO_ESCENARIOS } from "@/lib/catalogos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Reserva = {
  id: string;
  escenario_id: string;
  escenario_nombre: string;
  solicitante: string;
  telefono: string;
  carrera: string;
  correo: string | null;
  motivo: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: string;
};

type Escenario = { id: string; nombre: string };
const reservasDb = supabase as unknown as { from: (table: string) => any };

function fechaLocal() {
  const ahora = new Date();
  return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}`;
}

function escaparHtml(texto: string) {
  return texto.replace(/[&<>"']/g, (caracter) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[caracter] ?? caracter);
}

export function ReservasEscenarios({ escenarios }: { escenarios: Escenario[] }) {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [escenarioId, setEscenarioId] = useState("");
  const [fecha, setFecha] = useState(fechaLocal);
  const [horaInicio, setHoraInicio] = useState("08:00");
  const [horaFin, setHoraFin] = useState("09:00");
  const [solicitante, setSolicitante] = useState("");
  const [telefono, setTelefono] = useState("");
  const [carrera, setCarrera] = useState("");
  const [correo, setCorreo] = useState("");
  const [motivo, setMotivo] = useState("");

  const cargarReservas = useCallback(async () => {
    setCargando(true);
    const { data, error } = await reservasDb.from("reservas_escenarios")
      .select("id, escenario_id, escenario_nombre, solicitante, telefono, carrera, correo, motivo, fecha, hora_inicio, hora_fin, estado")
      .order("fecha", { ascending: true }).order("hora_inicio", { ascending: true });
    if (error) {
      setErrorCarga(error.message);
      toast.error(`No se pudieron cargar las reservas: ${error.message}`);
    } else {
      setErrorCarga(null);
      setReservas((data ?? []) as Reserva[]);
    }
    setCargando(false);
  }, []);

  useEffect(() => { void cargarReservas(); }, [cargarReservas]);

  const escenariosOrdenados = useMemo(() => [...escenarios].sort((a, b) => a.nombre.localeCompare(b.nombre)), [escenarios]);

  async function reservar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!escenarioId || !solicitante.trim() || !telefono.trim() || !carrera.trim() || !motivo.trim()) {
      toast.error("Completa el escenario, nombre, teléfono, carrera y motivo.");
      return;
    }
    if (new Date(`${fecha}T${horaInicio}:00`) < new Date()) {
      toast.error("Selecciona una fecha y hora a partir de este momento.");
      return;
    }
    if (horaInicio >= horaFin) {
      toast.error("La hora de fin debe ser posterior a la hora de inicio.");
      return;
    }
    const escenario = escenarios.find((item) => item.id === escenarioId);
    if (!escenario) return;
    setGuardando(true);
    const { error } = await reservasDb.from("reservas_escenarios").insert({
      escenario_id: escenario.id,
      escenario_nombre: escenario.nombre,
      solicitante: solicitante.trim(),
      telefono: telefono.trim(),
      carrera: carrera.trim(),
      correo: correo.trim() || null,
      motivo: motivo.trim(),
      fecha,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      estado: "confirmada",
    });
    setGuardando(false);
    if (error) {
      toast.error(error.code === "23P01" ? "Ese escenario ya está reservado en ese horario." : `No se pudo guardar la reserva: ${error.message}`);
      return;
    }
    toast.success("Reserva registrada.");
    setSolicitante(""); setTelefono(""); setCarrera(""); setCorreo(""); setMotivo("");
    await cargarReservas();
  }

  async function cancelar(reserva: Reserva) {
    if (!confirm(`¿Cancelar la reserva de ${reserva.escenario_nombre} del ${reserva.fecha}?`)) return;
    const { error } = await reservasDb.from("reservas_escenarios").delete().eq("id", reserva.id);
    if (error) toast.error(`No se pudo cancelar: ${error.message}`);
    else { toast.success("Reserva cancelada."); await cargarReservas(); }
  }

  function exportarPdf() {
    const ventana = window.open("", "_blank");
    if (!ventana) { toast.error("Permite las ventanas emergentes para exportar las reservas."); return; }
    const filas = reservas.map((r) => `<tr><td>${escaparHtml(r.fecha)}</td><td>${escaparHtml(r.hora_inicio.slice(0, 5))}–${escaparHtml(r.hora_fin.slice(0, 5))}</td><td>${escaparHtml(r.escenario_nombre)}</td><td>${escaparHtml(r.solicitante)}</td><td>${escaparHtml(r.telefono)}</td><td>${escaparHtml(r.carrera)}</td><td>${escaparHtml(r.correo ?? "—")}</td><td>${escaparHtml(r.motivo)}</td><td>${escaparHtml(r.estado)}</td></tr>`).join("");
    ventana.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Reservas de escenarios deportivos</title><style>body{font:12px Arial,sans-serif;color:#172033;margin:28px}h1{font-size:20px}p{color:#4b5563}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #cbd5e1;padding:7px;text-align:left;vertical-align:top}th{background:#eef2f7} @media print{body{margin:12mm}}</style></head><body><h1>Reservas de escenarios deportivos</h1><p>Generado el ${escaparHtml(fechaLocal())} · ${reservas.length} reservas</p><table><thead><tr><th>Fecha</th><th>Horario</th><th>Escenario</th><th>Nombre</th><th>Teléfono</th><th>Carrera</th><th>Correo</th><th>Motivo</th><th>Estado</th></tr></thead><tbody>${filas || '<tr><td colspan="9">No hay reservas registradas.</td></tr>'}</tbody></table><script>window.onload=()=>window.print()</script></body></html>`);
    ventana.document.close();
  }

  return (
    <section className="mt-8 space-y-5 rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-xl font-semibold">Reservas de escenarios</h2><p className="text-sm text-muted-foreground">Registra y consulta las reservas desde hoy; los horarios ocupados no se pueden duplicar.</p></div>
        <Button type="button" variant="outline" onClick={exportarPdf}><Download className="mr-2 h-4 w-4" />Exportar reservas a PDF</Button>
      </div>

      <form onSubmit={reservar} className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5 lg:col-span-2"><Label htmlFor="reserva-escenario">Escenario</Label><select id="reserva-escenario" required value={escenarioId} onChange={(e) => setEscenarioId(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Selecciona un escenario</option>{escenariosOrdenados.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}</select></div>
        <div className="space-y-1.5"><Label htmlFor="reserva-fecha">Fecha</Label><Input id="reserva-fecha" type="date" min={fechaLocal()} required value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-2"><div className="space-y-1.5"><Label htmlFor="reserva-inicio">Desde</Label><Input id="reserva-inicio" type="time" required value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} /></div><div className="space-y-1.5"><Label htmlFor="reserva-fin">Hasta</Label><Input id="reserva-fin" type="time" required value={horaFin} onChange={(e) => setHoraFin(e.target.value)} /></div></div>
        <div className="space-y-1.5"><Label htmlFor="reserva-solicitante">Nombre completo</Label><Input id="reserva-solicitante" required value={solicitante} onChange={(e) => setSolicitante(e.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="reserva-telefono">Número de teléfono</Label><Input id="reserva-telefono" type="tel" required value={telefono} onChange={(e) => setTelefono(e.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="reserva-carrera">Carrera</Label><Input id="reserva-carrera" required value={carrera} onChange={(e) => setCarrera(e.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="reserva-correo">Correo (opcional)</Label><Input id="reserva-correo" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} /></div>
        <div className="space-y-1.5 lg:col-span-2"><Label htmlFor="reserva-motivo">Actividad o motivo</Label><Input id="reserva-motivo" required value={motivo} onChange={(e) => setMotivo(e.target.value)} /></div>
        <div className="flex items-end"><Button type="submit" disabled={guardando || !escenarios.length}><Plus className="mr-2 h-4 w-4" />{guardando ? "Guardando…" : "Registrar reserva"}</Button></div>
      </form>

      {errorCarga && <p role="alert" className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">La tabla de reservas aún no está disponible en la base de datos. Hay que aplicar la migración de reservas de Supabase para activar el guardado.</p>}

      <div className="overflow-x-auto rounded-lg border">
        <Table><TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Horario</TableHead><TableHead>Escenario</TableHead><TableHead>Nombre</TableHead><TableHead>Teléfono</TableHead><TableHead>Carrera</TableHead><TableHead>Correo</TableHead><TableHead>Actividad</TableHead><TableHead>Estado</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>{reservas.map((r) => <TableRow key={r.id}><TableCell>{r.fecha}</TableCell><TableCell>{r.hora_inicio.slice(0, 5)}–{r.hora_fin.slice(0, 5)}</TableCell><TableCell>{r.escenario_nombre}</TableCell><TableCell>{r.solicitante}</TableCell><TableCell>{r.telefono}</TableCell><TableCell>{r.carrera}</TableCell><TableCell>{r.correo ?? "—"}</TableCell><TableCell>{r.motivo}</TableCell><TableCell>{r.estado}</TableCell><TableCell><Button type="button" variant="ghost" size="icon" aria-label="Cancelar reserva" onClick={() => void cancelar(r)}><Trash2 className="h-4 w-4" /></Button></TableCell></TableRow>)}
            {!reservas.length && <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">{cargando ? "Cargando reservas…" : "Aún no hay reservas."}</TableCell></TableRow>}</TableBody>
        </Table>
      </div>
    </section>
  );
}

