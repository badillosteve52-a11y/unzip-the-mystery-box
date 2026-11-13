import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Clock3, Download, Dumbbell, FilterX, MapPin, Plus, UserRound, UsersRound, XCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CATALOGO_ESCENARIOS } from "@/lib/catalogos";
import { exportarPDF } from "@/lib/excel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

function fechaBonita(fecha: string) {
  return new Date(`${fecha}T12:00:00`).toLocaleDateString("es-EC", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function colorEstado(estado: string) {
  if (["aprobada", "confirmada", "atendida"].includes(estado)) return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (["rechazada", "cancelada", "no_asistio"].includes(estado)) return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300";
  return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
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
  const [tipoSolicitante, setTipoSolicitante] = useState<"interno" | "externo" | "">("");
  const [filtroFecha, setFiltroFecha] = useState("");
  const [filtroEscenario, setFiltroEscenario] = useState("");
  const [filtroDependencia, setFiltroDependencia] = useState("");
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
  const reservasFiltradas = useMemo(() => reservas.filter((reserva) => (!filtroFecha || reserva.fecha === filtroFecha) && (!filtroEscenario || reserva.escenario_id === filtroEscenario) && (!filtroDependencia || (reserva.tipo_usuario !== "Persona externa" && (reserva.institucion ?? "") === filtroDependencia))), [reservas, filtroFecha, filtroEscenario, filtroDependencia]);
  const dependenciasReservas = useMemo(() => [...new Set(reservas.filter((reserva) => reserva.tipo_usuario !== "Persona externa").map((reserva) => reserva.institucion).filter((valor): valor is string => Boolean(valor)))].sort((a, b) => a.localeCompare(b)), [reservas]);
  const reservasHoy = reservas.filter((reserva) => reserva.fecha === fechaLocal()).length;
  const pendientes = reservas.filter((reserva) => reserva.estado === "pendiente").length;
  const filtrosActivos = Boolean(filtroFecha || filtroEscenario || filtroDependencia);

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
    setSolicitante(""); setTelefono(""); setTipoSolicitante(""); setTipoUsuario(""); setTipoExterno(""); setIdentificacion(""); setInstitucion(""); setCargo(""); setCorreo(""); setMotivo("");
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
    <section className="mt-8 overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="relative overflow-hidden border-b bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-5 py-6 sm:px-7 sm:py-7">
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-primary p-3 text-primary-foreground shadow-md"><CalendarDays className="h-6 w-6" /></div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-bold tracking-tight sm:text-2xl">Reservas de escenarios</h2><Badge variant="outline" className="border-primary/30 bg-background/70 text-primary">{reservasFiltradas.length} {reservasFiltradas.length === 1 ? "reserva" : "reservas"}</Badge></div>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Organiza el uso de los espacios deportivos y consulta la disponibilidad en un solo lugar.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <div className="rounded-xl border bg-background/75 px-3 py-2"><span className="block text-xs text-muted-foreground">Hoy</span><span className="text-lg font-semibold tabular-nums">{reservasHoy}</span></div>
            <div className="rounded-xl border bg-background/75 px-3 py-2"><span className="block text-xs text-muted-foreground">Pendientes</span><span className="text-lg font-semibold tabular-nums">{pendientes}</span></div>
            <Button type="button" variant="outline" className="col-span-2 bg-background/80 sm:col-span-1" onClick={exportarPdf} disabled={!reservas.length}><Download className="mr-2 h-4 w-4" />Exportar PDF</Button>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-4 sm:p-6">
        {errorCarga && <p role="alert" className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">La base de datos aún no tiene las columnas nuevas de reservas. Hay que aplicar la migración de Supabase para activar esta sección.</p>}

        <form onSubmit={reservar} className="overflow-hidden rounded-2xl border bg-background">
          <div className="flex flex-col gap-3 border-b bg-muted/30 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex items-center gap-3"><div className="rounded-xl bg-primary/10 p-2 text-primary"><Plus className="h-5 w-5" /></div><div><h3 className="font-semibold">Nueva reserva</h3><p className="text-xs text-muted-foreground">Completa los datos para solicitar un espacio.</p></div></div>
            <Badge variant="secondary" className="w-fit">Solicitud de uso deportivo</Badge>
          </div>
          <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-4">
            <div className="space-y-1.5 sm:col-span-2 xl:col-span-4"><Label htmlFor="reserva-tipo-solicitante">¿Quién solicita la reserva?</Label><select id="reserva-tipo-solicitante" required value={tipoSolicitante} onChange={(e) => { const tipo = e.target.value as typeof tipoSolicitante; setTipoSolicitante(tipo); setTipoUsuario(tipo === "externo" ? "Persona externa" : ""); setTipoExterno(""); setInstitucion(""); }} className="h-11 w-full rounded-lg border bg-background px-3 text-sm shadow-sm"><option value="">Selecciona persona interna o externa</option><option value="interno">Persona interna</option><option value="externo">Persona externa</option></select></div>
            {tipoSolicitante && <>
              <div className="space-y-1.5 sm:col-span-2 xl:col-span-2"><Label htmlFor="reserva-escenario">Escenario</Label><select id="reserva-escenario" required value={escenarioId} onChange={(e) => setEscenarioId(e.target.value)} className="h-11 w-full rounded-lg border bg-background px-3 text-sm shadow-sm"><option value="">Selecciona un escenario</option>{escenariosOrdenados.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}</select></div>
              <div className="space-y-1.5"><Label htmlFor="reserva-fecha">Fecha</Label><Input id="reserva-fecha" type="date" min={fechaLocal()} required value={fecha} onChange={(e) => setFecha(e.target.value)} className="h-11 rounded-lg" /></div>
              <div className="grid grid-cols-2 gap-2"><div className="space-y-1.5"><Label htmlFor="reserva-inicio">Desde</Label><Input id="reserva-inicio" type="time" required value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} className="h-11 rounded-lg" /></div><div className="space-y-1.5"><Label htmlFor="reserva-fin">Hasta</Label><Input id="reserva-fin" type="time" required value={horaFin} onChange={(e) => setHoraFin(e.target.value)} className="h-11 rounded-lg" /></div></div>
              <div className="space-y-1.5"><Label htmlFor="reserva-solicitante">Nombre completo</Label><Input id="reserva-solicitante" required value={solicitante} onChange={(e) => setSolicitante(e.target.value)} className="h-11 rounded-lg" /></div>
              <div className="space-y-1.5"><Label htmlFor="reserva-telefono">Número de teléfono</Label><Input id="reserva-telefono" type="tel" required value={telefono} onChange={(e) => setTelefono(e.target.value)} className="h-11 rounded-lg" /></div>
              {tipoSolicitante === "interno" && <div className="space-y-1.5"><Label htmlFor="reserva-tipo-usuario">Tipo de usuario interno</Label><select id="reserva-tipo-usuario" required value={tipoUsuario} onChange={(e) => setTipoUsuario(e.target.value as typeof tipoUsuario)} className="h-11 w-full rounded-lg border bg-background px-3 text-sm shadow-sm"><option value="">Selecciona el tipo</option>{TIPOS_USUARIO.filter((tipo) => tipo !== "Persona externa").map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}</select></div>}
              {tipoSolicitante === "externo" && <div className="space-y-1.5"><Label htmlFor="reserva-tipo-externo">Tipo de persona externa</Label><select id="reserva-tipo-externo" required value={tipoExterno} onChange={(e) => setTipoExterno(e.target.value as typeof tipoExterno)} className="h-11 w-full rounded-lg border bg-background px-3 text-sm shadow-sm"><option value="">Selecciona el tipo</option>{TIPOS_EXTERNOS.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}</select></div>}
              <div className="space-y-1.5"><Label htmlFor="reserva-identificacion">Cédula o identificación</Label><Input id="reserva-identificacion" required value={identificacion} onChange={(e) => setIdentificacion(e.target.value)} className="h-11 rounded-lg" /></div>
              {tipoUsuario !== "Persona externa" && tipoUsuario && <div className="space-y-1.5"><Label htmlFor="reserva-institucion">Facultad / Dependencia</Label><Input id="reserva-institucion" required value={institucion} onChange={(e) => setInstitucion(e.target.value)} placeholder="Facultad o dependencia" className="h-11 rounded-lg" /></div>}
              {tipoUsuario === "Persona externa" && tipoExterno !== "Persona natural" && <div className="space-y-1.5"><Label htmlFor="reserva-institucion">Institución / Empresa / Organización</Label><Input id="reserva-institucion" required value={institucion} onChange={(e) => setInstitucion(e.target.value)} className="h-11 rounded-lg" /></div>}
              <div className="space-y-1.5"><Label htmlFor="reserva-cargo">Cargo o función <span className="font-normal text-muted-foreground">(opcional)</span></Label><Input id="reserva-cargo" value={cargo} onChange={(e) => setCargo(e.target.value)} className="h-11 rounded-lg" /></div>
              <div className="space-y-1.5"><Label htmlFor="reserva-correo">Correo <span className="font-normal text-muted-foreground">(opcional)</span></Label><Input id="reserva-correo" type="text" inputMode="email" autoComplete="email" value={correo} onChange={(e) => setCorreo(e.target.value.trim())} className="h-11 rounded-lg" /></div>
              <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="reserva-motivo">Actividad o motivo</Label><Input id="reserva-motivo" required value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Describe brevemente el uso del espacio" className="h-11 rounded-lg" /></div>
              <div className="flex items-end sm:col-span-2 xl:col-span-4"><Button type="submit" className="h-11 w-full rounded-lg sm:w-auto" disabled={guardando || !escenarios.length}><Plus className="mr-2 h-4 w-4" />{guardando ? "Guardando…" : "Registrar reserva"}</Button></div>
            </>}
          </div>
        </form>

        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div><h3 className="text-lg font-semibold">Agenda de reservas</h3><p className="text-sm text-muted-foreground">Filtra y administra las solicitudes registradas.</p></div>
            {filtrosActivos && <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={() => { setFiltroFecha(""); setFiltroEscenario(""); setFiltroDependencia(""); }}><FilterX className="mr-2 h-4 w-4" />Limpiar filtros</Button>}
          </div>
          <div className="grid gap-3 rounded-2xl border bg-muted/20 p-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-1.5"><Label htmlFor="filtro-fecha-reservas">Día</Label><Input id="filtro-fecha-reservas" type="date" value={filtroFecha} onChange={(e) => setFiltroFecha(e.target.value)} className="h-11 rounded-lg bg-background" /></div>
            <div className="space-y-1.5"><Label htmlFor="filtro-escenario-reservas">Cancha o escenario</Label><select id="filtro-escenario-reservas" value={filtroEscenario} onChange={(e) => setFiltroEscenario(e.target.value)} className="h-11 w-full rounded-lg border bg-background px-3 text-sm"><option value="">Todos los escenarios</option>{escenariosOrdenados.map((escenario) => <option key={escenario.id} value={escenario.id}>{escenario.nombre}</option>)}</select></div>
            <div className="space-y-1.5 sm:col-span-2 xl:col-span-1"><Label htmlFor="filtro-dependencia-reservas">Facultad / dependencia</Label><select id="filtro-dependencia-reservas" value={filtroDependencia} onChange={(e) => setFiltroDependencia(e.target.value)} className="h-11 w-full rounded-lg border bg-background px-3 text-sm"><option value="">Todas las dependencias</option>{dependenciasReservas.map((dependencia) => <option key={dependencia} value={dependencia}>{dependencia}</option>)}</select></div>
          </div>

          {reservasFiltradas.length ? <div className="grid gap-3 xl:grid-cols-2">
            {reservasFiltradas.map((r) => <article key={r.id} className="group rounded-2xl border bg-background p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">
              <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-3"><div className="rounded-xl bg-primary/10 p-2.5 text-primary"><Dumbbell className="h-5 w-5" /></div><div className="min-w-0"><h4 className="break-words font-semibold leading-snug">{r.escenario_nombre}</h4><p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground"><span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{fechaBonita(r.fecha)}</span><span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{r.hora_inicio.slice(0, 5)}–{r.hora_fin.slice(0, 5)}</span></p></div></div>
                <Badge variant="outline" className={`w-fit shrink-0 capitalize ${colorEstado(r.estado)}`}>{ESTADOS_RESERVA.find((estado) => estado.value === r.estado)?.label ?? r.estado.replaceAll("_", " ")}</Badge>
              </div>
              <div className="grid gap-3 py-4 sm:grid-cols-2">
                <div className="flex min-w-0 gap-2.5"><UserRound className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><div className="min-w-0"><p className="text-xs text-muted-foreground">Solicitante</p><p className="break-words text-sm font-medium">{r.solicitante}</p><p className="break-words text-xs text-muted-foreground">{r.tipo_usuario}{r.tipo_externo ? ` · ${r.tipo_externo}` : ""} · {r.identificacion}</p></div></div>
                <div className="flex min-w-0 gap-2.5"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><div className="min-w-0"><p className="text-xs text-muted-foreground">Dependencia / entidad</p><p className="break-words text-sm">{r.institucion ?? "—"}{r.cargo ? ` · ${r.cargo}` : ""}</p></div></div>
                <div className="flex min-w-0 gap-2.5"><UsersRound className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><div className="min-w-0"><p className="text-xs text-muted-foreground">Contacto</p><p className="break-words text-sm">{r.telefono}</p><p className="break-all text-xs text-muted-foreground">{r.correo ?? "Sin correo"}</p></div></div>
                <div className="min-w-0 rounded-xl bg-muted/40 px-3 py-2"><p className="text-xs text-muted-foreground">Actividad</p><p className="break-words text-sm">{r.motivo}</p></div>
              </div>
              <div className="flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex items-center gap-2 text-xs text-muted-foreground"><span>Estado</span><select aria-label={`Estado de reserva de ${r.solicitante}`} value={r.estado} onChange={(e) => void actualizarEstado(r, e.target.value)} className="h-10 min-w-36 rounded-lg border bg-background px-2 text-sm text-foreground">{ESTADOS_RESERVA.map((estado) => <option key={estado.value} value={estado.value}>{estado.label}</option>)}</select></label>
                <Button type="button" variant="ghost" size="sm" className="justify-start text-muted-foreground hover:bg-destructive/10 hover:text-destructive sm:justify-center" aria-label={`Cancelar reserva de ${r.solicitante}`} onClick={() => void cancelar(r)}><Trash2 className="mr-2 h-4 w-4" />Cancelar reserva</Button>
              </div>
            </article>)}
          </div> : <div className="rounded-2xl border border-dashed bg-muted/10 px-5 py-12 text-center">
            {reservas.length ? <XCircle className="mx-auto h-8 w-8 text-muted-foreground/60" /> : <CheckCircle2 className="mx-auto h-8 w-8 text-muted-foreground/60" />}
            <p className="mt-3 font-medium">{cargando ? "Cargando reservas…" : reservas.length ? "No hay reservas con estos filtros" : "Aún no hay reservas"}</p>
            <p className="mt-1 text-sm text-muted-foreground">{reservas.length ? "Prueba otros criterios o limpia los filtros." : "Las nuevas solicitudes aparecerán aquí."}</p>
            {filtrosActivos && <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => { setFiltroFecha(""); setFiltroEscenario(""); setFiltroDependencia(""); }}>Ver todas las reservas</Button>}
          </div>}
        </div>
      </div>
    </section>
  );
}
