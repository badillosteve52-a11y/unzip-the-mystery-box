import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CATALOGO_ESCENARIOS } from "@/lib/catalogos";
import { exportarPDF } from "@/lib/excel";
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
  tipo_usuario: string; tipo_externo: string | null; identificacion: string; institucion: string | null; cargo: string | null;
  correo: string | null;
  motivo: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: string;
};

type Escenario = { id: string; nombre: string }; const TIPOS_USUARIO = ["Estudiante", "Docente", "Administrativo", "Trabajador", "Persona externa"] as const; const TIPOS_EXTERNOS = ["Persona natural", "Empresa", "Institución", "Organización"] as const; const ESTADOS_RESERVA = [{value:"pendiente",label:"Pendiente"},{value:"aprobada",label:"Aprobada"},{value:"rechazada",label:"Rechazada"},{value:"confirmada",label:"Confirmada"},{value:"atendida",label:"Atendida"},{value:"no_asistio",label:"No asistió"},{value:"cancelada",label:"Cancelada"}];
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
  const [tipoUsuario, setTipoUsuario] = useState<(typeof TIPOS_USUARIO)[number] | "">(""); const [tipoExterno, setTipoExterno] = useState<(typeof TIPOS_EXTERNOS)[number] | "">(""); const [identificacion, setIdentificacion] = useState(""); const [institucion, setInstitucion] = useState(""); const [cargo, setCargo] = useState("");
  const [correo, setCorreo] = useState("");
  const [motivo, setMotivo] = useState("");

  const cargarReservas = useCallback(async () => {
    setCargando(true);
    const { data, error } = await reservasDb.from("reservas_escenarios")
      .select("id, escenario_id, escenario_nombre, solicitante, telefono, tipo_usuario, tipo_externo, identificacion, institucion, cargo, correo, motivo, fecha, hora_inicio, hora_fin, estado")
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
    if (!escenarioId || !solicitante.trim() || !telefono.trim() || !tipoUsuario || !identificacion.trim() || !motivo.trim()) {
      toast.error("Completa los datos del solicitante, identificación y actividad.");
      return;
    }
    if (tipoUsuario === "Persona externa" && !tipoExterno) { toast.error("Selecciona el tipo de usuario externo."); return; } if (tipoUsuario === "Persona externa" && tipoExterno !== "Persona natural" && !institucion.trim()) { toast.error("Indica la empresa, institución u organización."); return; } if (tipoUsuario !== "Persona externa" && tipoUsuario && !institucion.trim()) { toast.error("Indica la facultad o dependencia del usuario interno."); return; } if (correo.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
      toast.error("Ingresa un correo válido o deja el campo vacío.");
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
      tipo_usuario: tipoUsuario, tipo_externo: tipoUsuario === "Persona externa" ? tipoExterno : null, identificacion: identificacion.trim(), institucion: institucion.trim() || null, cargo: cargo.trim() || null,
      correo: correo.trim() || null,
      motivo: motivo.trim(),
      fecha,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      estado: "pendiente",
    });
    setGuardando(false);
    if (error) {
      toast.error(error.code === "23P01" ? "Ese escenario ya está reservado en ese horario." : `No se pudo guardar la reserva: ${error.message}`);
      return;
    }
    toast.success("Reserva registrada.");
    setSolicitante(""); setTelefono(""); setTipoUsuario(""); setTipoExterno(""); setIdentificacion(""); setInstitucion(""); setCargo(""); setCorreo(""); setMotivo("");
    await cargarReservas();
  }

  async function cancelar(reserva: Reserva) {
    if (!confirm(`¿Cancelar la reserva de ${reserva.escenario_nombre} del ${reserva.fecha}?`)) return;
    const { error } = await reservasDb.from("reservas_escenarios").delete().eq("id", reserva.id);
    if (error) toast.error(`No se pudo cancelar: ${error.message}`);
    else { toast.success("Reserva cancelada."); await cargarReservas(); }
  }

  async function actualizarEstado(reserva: Reserva, estado: string) { const { error } = await reservasDb.from("reservas_escenarios").update({ estado }).eq("id", reserva.id); if (error) toast.error(`No se pudo actualizar el estado: ${error.message}`); else { toast.success("Estado actualizado."); await cargarReservas(); } } function exportarPdf() {
    exportarPDF(reservas.map((r) => ({
      Fecha: r.fecha,
      Horario: `${r.hora_inicio.slice(0, 5)}–${r.hora_fin.slice(0, 5)}`,
      Escenario: r.escenario_nombre,
      Nombre: r.solicitante,
      "Teléfono": r.telefono,
      "Tipo de usuario": r.tipo_usuario, "Tipo externo": r.tipo_externo ?? "—", Identificación: r.identificacion, "Institución / Empresa": r.institucion ?? "—", "Cargo o función": r.cargo ?? "—",
      Correo: r.correo ?? "—",
      Motivo: r.motivo,
      Estado: ESTADOS_RESERVA.find((estado) => estado.value === r.estado)?.label ?? r.estado,
    })), "reservas-escenarios");
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
        <div className="space-y-1.5"><Label htmlFor="reserva-tipo-usuario">Tipo de usuario</Label><select id="reserva-tipo-usuario" required value={tipoUsuario} onChange={(e) => { setTipoUsuario(e.target.value as typeof tipoUsuario); setTipoExterno(""); setInstitucion(""); }} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Selecciona el tipo</option>{TIPOS_USUARIO.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}</select></div>{tipoUsuario === "Persona externa" && <div className="space-y-1.5"><Label htmlFor="reserva-tipo-externo">Tipo de usuario externo</Label><select id="reserva-tipo-externo" required value={tipoExterno} onChange={(e) => setTipoExterno(e.target.value as typeof tipoExterno)} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Selecciona una opción</option>{TIPOS_EXTERNOS.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}</select></div>}<div className="space-y-1.5"><Label htmlFor="reserva-identificacion">Número de cédula o identificación</Label><Input id="reserva-identificacion" required value={identificacion} onChange={(e) => setIdentificacion(e.target.value)} /></div>{tipoUsuario !== "Persona externa" && tipoUsuario && <div className="space-y-1.5"><Label htmlFor="reserva-institucion">Facultad / Dependencia</Label><Input id="reserva-institucion" required value={institucion} onChange={(e) => setInstitucion(e.target.value)} placeholder="Facultad o dependencia" /></div>}{tipoUsuario === "Persona externa" && tipoExterno !== "Persona natural" && <div className="space-y-1.5"><Label htmlFor="reserva-institucion">Institución / Empresa / Organización</Label><Input id="reserva-institucion" required value={institucion} onChange={(e) => setInstitucion(e.target.value)} /></div>}<div className="space-y-1.5"><Label htmlFor="reserva-cargo">Cargo o función (opcional)</Label><Input id="reserva-cargo" value={cargo} onChange={(e) => setCargo(e.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="reserva-correo">Correo (opcional)</Label><Input id="reserva-correo" type="text" inputMode="email" autoComplete="email" value={correo} onChange={(e) => setCorreo(e.target.value.trim())} /></div>
        <div className="space-y-1.5 lg:col-span-2"><Label htmlFor="reserva-motivo">Actividad o motivo</Label><Input id="reserva-motivo" required value={motivo} onChange={(e) => setMotivo(e.target.value)} /></div>
        <div className="flex items-end"><Button type="submit" disabled={guardando || !escenarios.length}><Plus className="mr-2 h-4 w-4" />{guardando ? "Guardando…" : "Registrar reserva"}</Button></div>
      </form>

      {errorCarga && <p role="alert" className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">La tabla de reservas aún no está disponible en la base de datos. Hay que aplicar la migración de reservas de Supabase para activar el guardado.</p>}

      <div className="overflow-x-auto rounded-lg border">
        <Table><TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Horario</TableHead><TableHead>Escenario</TableHead><TableHead>Nombre</TableHead><TableHead>Teléfono</TableHead><TableHead>Tipo / identificación / facultad o entidad</TableHead><TableHead>Correo</TableHead><TableHead>Actividad</TableHead><TableHead>Estado</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>{reservas.map((r) => <TableRow key={r.id}><TableCell>{r.fecha}</TableCell><TableCell>{r.hora_inicio.slice(0, 5)}–{r.hora_fin.slice(0, 5)}</TableCell><TableCell>{r.escenario_nombre}</TableCell><TableCell>{r.solicitante}</TableCell><TableCell>{r.telefono}</TableCell><TableCell><div>{r.tipo_usuario}{r.tipo_externo ? ` · ${r.tipo_externo}` : ""}</div><div className="text-xs">{r.identificacion}</div><div className="text-xs">{r.institucion ?? "—"}{r.cargo ? ` · ${r.cargo}` : ""}</div></TableCell><TableCell>{r.correo ?? "—"}</TableCell><TableCell>{r.motivo}</TableCell><TableCell><select aria-label={`Estado de reserva de ${r.solicitante}`} value={r.estado} onChange={(e) => void actualizarEstado(r, e.target.value)} className="h-9 min-w-32 rounded-md border bg-background px-2 text-sm">{ESTADOS_RESERVA.map((estado) => <option key={estado.value} value={estado.value}>{estado.label}</option>)}</select></TableCell><TableCell><Button type="button" variant="ghost" size="icon" aria-label="Cancelar reserva" onClick={() => void cancelar(r)}><Trash2 className="h-4 w-4" /></Button></TableCell></TableRow>)}
            {!reservas.length && <TableRow><TableCell colSpan={10} className="py-8 text-center text-muted-foreground">{cargando ? "Cargando reservas…" : "Aún no hay reservas."}</TableCell></TableRow>}</TableBody>
        </Table>
      </div>
    </section>
  );
}

