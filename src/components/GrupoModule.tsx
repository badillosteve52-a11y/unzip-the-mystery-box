import { useMemo, useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { Download, FileUp, Pencil, Plus, Trash2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "./PageHeader";
import { Filtro } from "./Filtro";
import { ImportExport } from "./ImportExport";
import { errMsg, useRefrescar, type DatosCompletos, type Grupo } from "@/lib/db";
import { calcularEdad } from "@/lib/edad"; import { importarDeportistas } from "@/lib/importar-deportistas";
import { LISTA_FACULTADES, getCarrerasPorFacultad, normalizarCarrera, normalizarFacultad } from "@/lib/catalogos";

type Tipo = "selecciones" | "clubes";
const authRoute = getRouteApi("/_authenticated");

export function GrupoModule({ tipo, data }: { tipo: Tipo; data: DatosCompletos }) {
  const { role } = authRoute.useRouteContext();
  const esAdmin = role === "admin";
  const esSel = tipo === "selecciones";
  const singular = esSel ? "selección" : "club";
  const grupos = esSel ? data.selecciones : data.clubes;
  const miembros = esSel ? data.selMiembros : data.clubMiembros;
  const refrescar = useRefrescar();

  const activo = data.periodos.find((p) => p.activo)?.id ?? "";
  const [periodo, setPeriodo] = useState("");
  const [deporte, setDeporte] = useState("");
  const [edit, setEdit] = useState<(Partial<Grupo> & { ids: Set<string> }) | null>(null);
  const [nuevoEstudiante, setNuevoEstudiante] = useState<{ grupoId: string; cedula: string; nombres: string; apellidos: string; fecha_nacimiento: string; genero: string; region: string; facultad: string; carrera: string; pao: string } | null>(null);
  const [guardandoEstudiante, setGuardandoEstudiante] = useState(false);
  const [q, setQ] = useState("");
  const [entrenador, setEntrenador] = useState<{ id?: string; grupoId: string; nombre: string; apellido: string; cedula: string; cargo: string } | null>(null);
  const [guardandoEntrenador, setGuardandoEntrenador] = useState(false);
  const [subiendoCertificado, setSubiendoCertificado] = useState<string | null>(null);
  const [descargandoGrupo, setDescargandoGrupo] = useState<string | null>(null);

  async function subirCertificado(seleccionId: string, deportistaId: string, file: File | undefined) {
    if (!file) return;
    if (file.type !== "application/pdf" || !file.name.toLowerCase().endsWith(".pdf")) { toast.error("El certificado debe estar en formato PDF"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("El PDF no puede superar 10 MB"); return; }
    setSubiendoCertificado(deportistaId);
    const { error } = await supabase.storage.from("certificados-matricula").upload(`${seleccionId}/${deportistaId}.pdf`, file, { upsert: true, contentType: "application/pdf" });
    setSubiendoCertificado(null);
    if (error) toast.error(errMsg(error)); else toast.success("Certificado de matrícula guardado");
  }

  async function descargarCertificados(seleccionId: string, seleccionNombre: string) {
    setDescargandoGrupo(seleccionId);
    const { data: files, error } = await supabase.storage.from("certificados-matricula").list(seleccionId);
    if (error) { setDescargandoGrupo(null); toast.error(errMsg(error)); return; }
    const pdfs = (files ?? []).filter((file) => file.name.toLowerCase().endsWith(".pdf"));
    if (!pdfs.length) { setDescargandoGrupo(null); toast.info("Esta selección todavía no tiene certificados cargados"); return; }
    let fallidos = 0;
    for (const file of pdfs) {
      const { data: blob, error: downloadError } = await supabase.storage.from("certificados-matricula").download(`${seleccionId}/${file.name}`);
      if (downloadError || !blob) { fallidos += 1; continue; }
      const deportista = porId.get(file.name.replace(/\.pdf$/i, ""));
      const nombre = `${deportista?.apellidos ?? "deportista"}_${deportista?.nombres ?? ""}`.trim().replace(/[^\p{L}\p{N}_-]+/gu, "_");
      const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `${seleccionNombre}_${nombre}.pdf`; link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000); await new Promise((resolve) => setTimeout(resolve, 250));
    }
    setDescargandoGrupo(null);
    toast.success(fallidos ? `Descargados ${pdfs.length - fallidos}; fallaron ${fallidos}` : `Descargados ${pdfs.length} certificados`);
  }


  async function guardarEntrenador() {
    if (!entrenador || guardandoEntrenador) return;
    setGuardandoEntrenador(true);
    const { id, grupoId, ...campos } = entrenador;
    const datos = { ...campos, club_id: esSel ? null : grupoId, seleccion_id: esSel ? grupoId : null };
    const { error } = id
      ? await supabase.from("entrenadores").update(datos).eq("id", id)
      : await supabase.from("entrenadores").insert(datos);
    setGuardandoEntrenador(false);
    if (error) { toast.error(errMsg(error)); return; }
    setEntrenador(null);
    await refrescar();
    toast.success("Entrenador guardado");
  }

    async function importarEnGrupo(grupoId: string, rows: Record<string, unknown>[]) {
    const cantidad = await importarDeportistas(rows, { esSeleccion: esSel, grupoId, deportes: data.deportes });
    await refrescar();
    return cantidad;
  }

const nombreDep = (id: string | null) => data.deportes.find((d) => d.id === id)?.nombre ?? "—";
  const nombrePer = (id: string | null) => data.periodos.find((d) => d.id === id)?.nombre ?? "—";
  const porId = useMemo(() => new Map(data.deportistas.map((d) => [d.id, d])), [data.deportistas]);

  const vistos = grupos.filter(
    (g) => (!periodo || g.periodo_id === periodo || !g.periodo_id) && (!deporte || g.deporte_id === deporte)
  );

  async function guardar() {
    if (!edit?.nombre) return;
    try {
      const datos = { nombre: edit.nombre, deporte_id: edit.deporte_id || null, periodo_id: edit.periodo_id || null };
      let id = edit.id;
      if (id) {
        const { error } = await supabase.from(tipo).update(datos).eq("id", id);
        if (error) throw error;
      } else {
        const { data: nuevo, error } = await supabase.from(tipo).insert(datos).select("id").single();
        if (error) throw error;
        id = nuevo.id;
      }
      const ids = [...edit.ids];
      if (esSel) {
        await supabase.from("seleccion_miembros").delete().eq("seleccion_id", id!);
        if (ids.length) {
          const { error } = await supabase.from("seleccion_miembros").insert(ids.map((d) => ({ seleccion_id: id!, deportista_id: d })));
          if (error) throw error;
        }
      } else {
        await supabase.from("club_miembros").delete().eq("club_id", id!);
        if (ids.length) {
          const { error } = await supabase.from("club_miembros").insert(ids.map((d) => ({ club_id: id!, deportista_id: d })));
          if (error) throw error;
        }
      }
      toast.success("Guardado");
      setEdit(null);
      refrescar();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  async function guardarEstudiante() {
    if (!nuevoEstudiante || guardandoEstudiante) return;
    setGuardandoEstudiante(true);
    try {
      const deportistaId = crypto.randomUUID();
      const { error: errorDeportista } = await supabase.from("deportistas").insert({
        id: deportistaId,
        cedula: nuevoEstudiante.cedula.trim(),
        nombres: nuevoEstudiante.nombres.trim(),
        apellidos: nuevoEstudiante.apellidos.trim(),
        fecha_nacimiento: nuevoEstudiante.fecha_nacimiento || null,
        genero: nuevoEstudiante.genero || null,
        region: nuevoEstudiante.region || null,
        facultad: normalizarFacultad(nuevoEstudiante.facultad || null),
        carrera: normalizarCarrera(nuevoEstudiante.carrera || null, normalizarFacultad(nuevoEstudiante.facultad || null)),
        pao: nuevoEstudiante.pao || null,
        tiene_discapacidad: false,
      });
      if (errorDeportista) throw errorDeportista;
      const { error: errorMembresia } = await supabase.from("club_miembros").insert({
        club_id: nuevoEstudiante.grupoId,
        deportista_id: deportistaId,
      });
      if (errorMembresia) throw errorMembresia;
      setNuevoEstudiante(null);
      await refrescar();
      toast.success("Estudiante registrado en el club");
    } catch (error) {
      const mensaje = errMsg(error);
      toast.error(mensaje.includes("duplicate") ? "Ya existe un deportista con esa cédula. Usa «Vincular estudiante» para agregarlo al club." : mensaje);
    } finally {
      setGuardandoEstudiante(false);
    }
  }

  async function borrar(g: Grupo) {
    if (!confirm(`¿Eliminar "${g.nombre}"? Los deportistas no se borran.`)) return;
    const { error } = await supabase.from(tipo).delete().eq("id", g.id);
    if (error) toast.error(errMsg(error));
    else refrescar();
  }

  const candidatos = data.deportistas.filter((d) => {
    const t = q.toLowerCase();
    return !t || `${d.nombres} ${d.apellidos} ${d.cedula}`.toLowerCase().includes(t);
  });

  return (
    <div>
      <PageHeader
        title={esSel ? "Selecciones deportivas" : "Clubes deportivos"}
        subtitle={esSel ? "Equipos que representan a la ESPOCH, por período académico." : "Clubes formativos y recreativos, por período académico."}
      >
        <ImportExport
          nombre={`${tipo}-integrantes`}
          filas={() =>
            vistos.flatMap((g) =>
              miembros.filter((m) => m.grupo_id === g.id).map((m) => {
                const d = porId.get(m.deportista_id);
                return {
                  [esSel ? "Selección" : "Club"]: g.nombre,
                  Deporte: nombreDep(g.deporte_id),
                  Período: nombrePer(g.periodo_id),
                  Cédula: d?.cedula,
                  Apellidos: d?.apellidos,
                  Nombres: d?.nombres,
                  Carrera: d?.carrera,
                  Facultad: d?.facultad,
                  Edad: calcularEdad(d?.fecha_nacimiento),
                                    PAO: d?.pao,
                };
              }),
            )
          }
        />
        {esAdmin && <Button onClick={() => setEdit({ periodo_id: activo || null, ids: new Set() })}>
          <Plus className="mr-2 h-4 w-4" /> {esSel ? "Nueva selección" : "Nuevo club"}
        </Button>}
      </PageHeader>

      <div className="mb-5 flex flex-wrap gap-3">
        <Filtro label="Período" value={periodo} onChange={setPeriodo} opciones={data.periodos.map((p) => ({ value: p.id, label: p.nombre }))} />
        <Filtro label="Deporte" value={deporte} onChange={setDeporte} opciones={data.deportes.map((p) => ({ value: p.id, label: p.nombre }))} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {vistos.map((g) => {
          const ms = miembros.filter((m) => m.grupo_id === g.id);
          return (
            <div key={g.id} className="rounded-xl border bg-card p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold leading-snug">{g.nombre}</h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge>{nombreDep(g.deporte_id)}</Badge>
                    <Badge variant="outline">{nombrePer(g.periodo_id)}</Badge>
                  </div>
                </div>
                <div className="flex">
                  {esAdmin && <Button size="icon" variant="ghost" aria-label="Editar club" onClick={() => setEdit({ ...g, ids: new Set(ms.map((m) => m.deportista_id)) })}>
                    <Pencil className="h-4 w-4" />
                  </Button>}
                  {esAdmin && <Button size="icon" variant="ghost" aria-label="Eliminar" onClick={() => borrar(g)}><Trash2 className="h-4 w-4" /></Button>}
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" /> {ms.length} integrantes
              </div>
              {!esSel && !esAdmin && <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setNuevoEstudiante({ grupoId: g.id, cedula: "", nombres: "", apellidos: "", fecha_nacimiento: "", genero: "", region: "", facultad: "", carrera: "", pao: "" })}>
                  <UserPlus className="mr-2 h-4 w-4" /> Registrar estudiante
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setQ(""); setEdit({ ...g, ids: new Set(ms.map((m) => m.deportista_id)) }); }}>
                  <Users className="mr-2 h-4 w-4" /> Vincular existente
                </Button>
              </div>}
              {!esSel && esAdmin && <Button className="mt-3" size="sm" variant="outline" onClick={() => setEdit({ ...g, ids: new Set(ms.map((m) => m.deportista_id)) })}>
                <Users className="mr-2 h-4 w-4" /> Gestionar integrantes
              </Button>}
              {!esSel && esAdmin && <div className="mt-3"><ImportExport nombre={`${g.nombre}-integrantes`} filas={() => []} onImport={(rows) => importarEnGrupo(g.id, rows)} ocultarExportar textoImportar="Importar Excel a este club" ayuda="Columnas aceptadas: Nombres y apellidos (nombres primero), fecha nacimiento, edad, cédula, género, región, facultad y Nivelación/PAO 1–9. Marca un solo PAO actual; se guarda en la ficha. La edad se calcula desde la fecha." /></div>}
<ul className="mt-2 max-h-56 space-y-1 overflow-y-auto text-sm">
                {ms.map((m) => {
                  const d = porId.get(m.deportista_id);
                  return <li key={m.deportista_id} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate">{d?.apellidos} {d?.nombres}</span>
                    {esSel && <label className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted" title="Subir certificado de matrícula en PDF">
                      <FileUp className="h-3.5 w-3.5" /><span>{subiendoCertificado === m.deportista_id ? "Subiendo…" : "PDF"}</span>
                      <input type="file" accept="application/pdf,.pdf" className="sr-only" disabled={subiendoCertificado === m.deportista_id} onChange={(event) => { void subirCertificado(g.id, m.deportista_id, event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} />
                    </label>}
                  </li>;
                })}
              </ul>
              {esSel && esAdmin && <Button className="mt-3 w-full" size="sm" variant="outline" onClick={() => void descargarCertificados(g.id, g.nombre)} disabled={descargandoGrupo === g.id}>
                <Download className="mr-2 h-4 w-4" />{descargandoGrupo === g.id ? "Descargando…" : "Descargar certificados PDF"}
              </Button>}
              <div className="mt-4 space-y-2 border-t pt-3">
                {data.entrenadores.filter((e) => esSel ? e.seleccion_id === g.id : e.club_id === g.id).map((e) => (
                  <div key={e.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 break-words"><span className="font-medium">{e.nombre} {e.apellido}</span><span className="block text-xs text-muted-foreground">{e.cargo} · {e.cedula}</span></span>
                    {esAdmin && <Button size="icon" variant="ghost" aria-label={`Editar entrenador ${e.nombre} ${e.apellido}`} onClick={() => setEntrenador({ ...e, grupoId: g.id })}><Pencil className="h-4 w-4" /></Button>}
                  </div>
                ))}
                {esAdmin && <Button variant="outline" size="sm" onClick={() => setEntrenador({ grupoId: g.id, nombre: "", apellido: "", cedula: "", cargo: "" })}><Plus className="mr-2 h-4 w-4" />Agregar entrenador</Button>}
              </div>
            </div>
          );
        })}
        {!vistos.length && <p className="col-span-full py-10 text-center text-muted-foreground">No hay {tipo} para estos filtros.</p>}
      </div>

      <Dialog open={!!entrenador} onOpenChange={(o) => !o && setEntrenador(null)}>
        <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>{entrenador?.id ? "Editar entrenador" : "Agregar entrenador"}</DialogTitle><p className="text-sm text-muted-foreground">{grupos.find((g) => g.id === entrenador?.grupoId)?.nombre}</p></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void guardarEntrenador(); }}>
            {(["nombre", "apellido", "cedula", "cargo"] as const).map((campo) => <div key={campo} className="space-y-1.5"><Label htmlFor={`entrenador-${campo}`}>{campo === "cedula" ? "Cédula" : campo.charAt(0).toUpperCase() + campo.slice(1)}</Label><Input id={`entrenador-${campo}`} required value={entrenador?.[campo] ?? ""} onChange={(e) => entrenador && setEntrenador({ ...entrenador, [campo]: e.target.value })} /></div>)}
            <DialogFooter><Button type="button" variant="outline" onClick={() => setEntrenador(null)}>Cancelar</Button><Button type="submit" disabled={guardandoEntrenador}>{guardandoEntrenador ? "Guardando…" : "Guardar"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!nuevoEstudiante} onOpenChange={(open) => !open && setNuevoEstudiante(null)}>
        <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar estudiante en el club</DialogTitle>
            <p className="text-sm text-muted-foreground">{grupos.find((g) => g.id === nuevoEstudiante?.grupoId)?.nombre}</p>
          </DialogHeader>
          <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void guardarEstudiante(); }}>
            <div className="space-y-1.5"><Label htmlFor="nuevo-club-cedula">Cédula</Label><Input id="nuevo-club-cedula" required inputMode="numeric" value={nuevoEstudiante?.cedula ?? ""} onChange={(event) => nuevoEstudiante && setNuevoEstudiante({ ...nuevoEstudiante, cedula: event.target.value })} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="nuevo-club-nombres">Nombres</Label><Input id="nuevo-club-nombres" required value={nuevoEstudiante?.nombres ?? ""} onChange={(event) => nuevoEstudiante && setNuevoEstudiante({ ...nuevoEstudiante, nombres: event.target.value })} /></div>
              <div className="space-y-1.5"><Label htmlFor="nuevo-club-apellidos">Apellidos</Label><Input id="nuevo-club-apellidos" required value={nuevoEstudiante?.apellidos ?? ""} onChange={(event) => nuevoEstudiante && setNuevoEstudiante({ ...nuevoEstudiante, apellidos: event.target.value })} /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="nuevo-club-nacimiento">Fecha de nacimiento</Label><Input id="nuevo-club-nacimiento" type="date" value={nuevoEstudiante?.fecha_nacimiento ?? ""} onChange={(event) => nuevoEstudiante && setNuevoEstudiante({ ...nuevoEstudiante, fecha_nacimiento: event.target.value })} /></div>
              <div className="space-y-1.5"><Label htmlFor="nuevo-club-genero">Género</Label><select id="nuevo-club-genero" className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm" value={nuevoEstudiante?.genero ?? ""} onChange={(event) => nuevoEstudiante && setNuevoEstudiante({ ...nuevoEstudiante, genero: event.target.value })}><option value="">— Seleccionar —</option><option value="Masculino">Masculino</option><option value="Femenino">Femenino</option><option value="Otro">Otro</option></select></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="nuevo-club-region">Región</Label><select id="nuevo-club-region" className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm" value={nuevoEstudiante?.region ?? ""} onChange={(event) => nuevoEstudiante && setNuevoEstudiante({ ...nuevoEstudiante, region: event.target.value })}><option value="">— Seleccionar —</option>{["Sierra", "Costa", "Amazonía", "Insular"].map((region) => <option key={region} value={region}>{region}</option>)}</select></div>
              <div className="space-y-1.5"><Label htmlFor="nuevo-club-pao">Nivel / PAO actual</Label><select id="nuevo-club-pao" className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm" value={nuevoEstudiante?.pao ?? ""} onChange={(event) => nuevoEstudiante && setNuevoEstudiante({ ...nuevoEstudiante, pao: event.target.value })}><option value="">— Seleccionar —</option>{["Nivelación", ...Array.from({ length: 9 }, (_, index) => `PAO ${index + 1}`)].map((pao) => <option key={pao} value={pao}>{pao}</option>)}</select></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="nuevo-club-facultad">Facultad</Label><select id="nuevo-club-facultad" className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm" value={nuevoEstudiante?.facultad ?? ""} onChange={(event) => nuevoEstudiante && setNuevoEstudiante({ ...nuevoEstudiante, facultad: event.target.value, carrera: "" })}><option value="">— Seleccionar —</option>{LISTA_FACULTADES.map((facultad) => <option key={facultad} value={facultad}>{facultad}</option>)}</select></div>
              <div className="space-y-1.5"><Label htmlFor="nuevo-club-carrera">Carrera</Label><select id="nuevo-club-carrera" className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm disabled:opacity-50" disabled={!nuevoEstudiante?.facultad} value={nuevoEstudiante?.carrera ?? ""} onChange={(event) => nuevoEstudiante && setNuevoEstudiante({ ...nuevoEstudiante, carrera: event.target.value })}><option value="">— Seleccionar —</option>{(nuevoEstudiante?.facultad ? getCarrerasPorFacultad(nuevoEstudiante.facultad) : []).map((carrera) => <option key={carrera} value={carrera}>{carrera}</option>)}</select></div>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setNuevoEstudiante(null)}>Cancelar</Button><Button type="submit" disabled={guardandoEstudiante}>{guardandoEstudiante ? "Guardando…" : "Registrar en el club"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>{edit?.id ? "Editar" : "Nueva"} {singular}</DialogTitle></DialogHeader>
          {edit && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Nombre</Label>
                <Input value={edit.nombre ?? ""} onChange={(e) => setEdit({ ...edit, nombre: e.target.value })} />
              </div>
              <div className="flex flex-wrap gap-3">
                <Filtro label="Deporte" todos="— Sin deporte —" value={edit.deporte_id ?? ""} onChange={(v) => setEdit({ ...edit, deporte_id: v })} opciones={data.deportes.map((p) => ({ value: p.id, label: p.nombre }))} />
                <Filtro label="Período" todos="— Sin período —" value={edit.periodo_id ?? ""} onChange={(v) => setEdit({ ...edit, periodo_id: v })} opciones={data.periodos.map((p) => ({ value: p.id, label: p.nombre }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Integrantes ({edit.ids.size})</Label>
                <Input placeholder="Buscar por nombre o cédula…" value={q} onChange={(e) => setQ(e.target.value)} />
                <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-2">
                  {candidatos.map((d) => (
                    <label key={d.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted">
                      <Checkbox
                        checked={edit.ids.has(d.id)}
                        onCheckedChange={(v) => {
                          const s = new Set(edit.ids);
                          if (v) s.add(d.id); else s.delete(d.id);
                          setEdit({ ...edit, ids: s });
                        }}
                      />
                      <span className="flex-1">{d.apellidos} {d.nombres}</span>
                      <span className="text-xs text-muted-foreground">{d.cedula}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>Cancelar</Button>
            <Button onClick={guardar} disabled={!edit?.nombre}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
