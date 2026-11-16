import { useEffect, useMemo, useRef, useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Cargando, PageHeader } from "@/components/PageHeader";
import { Filtro, unicos } from "@/components/Filtro";import { ImportExport } from "@/components/ImportExport";
import { errMsg, useDatos, useRefrescar, type Deportista } from "@/lib/db";
import { calcularEdad } from "@/lib/edad";
import { importarDeportistas } from "@/lib/importar-deportistas";
import { filtrarDeportistas } from "@/lib/filtros";
import { asegurarCopiaNominaPeriodo } from "./SimpleCrud";
import { LISTA_FACULTADES, getCarrerasPorFacultad, normalizarCarrera, normalizarFacultad } from "@/lib/catalogos";

export const REGIONES = ["Sierra", "Costa", "Amazonía", "Insular"] as const;
const authRoute = getRouteApi("/_authenticated");

type Edit = Partial<Deportista>;

export function DeportistasLista({ tipo }: { tipo: "SELECCION" | "CLUB" }) {
  const { role } = authRoute.useRouteContext();
  const esSel = tipo === "SELECCION";
  const { data } = useDatos();
  const refrescar = useRefrescar();
  const [f, setF] = useState({ periodo: "", deporte: "", facultad: "", carrera: "", region: "", q: "" });
  const [copiandoPeriodo, setCopiandoPeriodo] = useState(false);
  const [edit, setEdit] = useState<Edit | null>(null);
  const periodosRevisados = useRef(new Set<string>());
  const periodoInicializado = useRef(false);

  useEffect(() => {
    if (!data || periodoInicializado.current) return;
    const activo = data.periodos.find((periodo) => periodo.activo);
    if (!activo) return;
    periodoInicializado.current = true;
    setF((actual) => ({ ...actual, periodo: activo.id }));
  }, [data]);

  useEffect(() => {
    if (!data || role !== "admin") return;
    const periodoActivo = data.periodos.find((periodo) => periodo.activo);
    if (!periodoActivo || periodosRevisados.current.has(periodoActivo.id)) return;

    periodosRevisados.current.add(periodoActivo.id);
    void asegurarCopiaNominaPeriodo(data.periodos, periodoActivo.id)
      .then(async (origenes) => {
        if (!origenes.length) return;
        await refrescar();
        toast.success(`Se heredaron los datos de los períodos anteriores: ${origenes.join(", ")}`);
      })
      .catch((error) => {
        periodosRevisados.current.delete(periodoActivo.id);
        toast.error(`No se pudo cargar la nómina del período activo: ${errMsg(error)}`);
      });
  }, [data, role, refrescar]);

  const lista = useMemo(() => {
    if (!data) return [];
    const idsEnPeriodo = (grupos: typeof data.selecciones) => new Set(
      grupos.filter((grupo) => !f.periodo || grupo.periodo_id === f.periodo).map((grupo) => grupo.id),
    );
    const seleccionesPeriodo = idsEnPeriodo(data.selecciones);
    const clubesPeriodo = idsEnPeriodo(data.clubes);
    const relacionesSeleccion = data.selMiembros.filter((m) => seleccionesPeriodo.has(m.grupo_id));
    const relacionesClub = data.clubMiembros.filter((m) => clubesPeriodo.has(m.grupo_id));
    const propios = new Set((esSel ? relacionesSeleccion : relacionesClub).map((m) => m.deportista_id));
    const conGrupo = new Set([...relacionesSeleccion, ...relacionesClub].map((m) => m.deportista_id));
    // Se muestran los del módulo y los que aún no tienen ningún grupo en este período.
    return filtrarDeportistas(data, f).filter((d) => propios.has(d.id) || !conGrupo.has(d.id));
  }, [data, f, esSel]);

  // Facultades para el formulario: solo nombres oficiales del catálogo
  const opcionesFacultadForm = useMemo(() => {
    return LISTA_FACULTADES.slice().sort();
  }, []);

  const opcionesCarreraForm = useMemo(() => {
    if (!edit?.facultad) return [];
    const oficiales = getCarrerasPorFacultad(edit.facultad);
    const setCars = new Set(oficiales);
    if (edit.carrera) setCars.add(edit.carrera);
    return Array.from(setCars).sort();
  }, [edit?.facultad, edit?.carrera]);

  // Filtros de Carrera reactivos según Facultad seleccionada en el filtro
  const opcionesCarreraFiltro = useMemo(() => {
    if (!data) return [];
    if (f.facultad) {
      const oficiales = getCarrerasPorFacultad(f.facultad);
      const setCars = new Set(oficiales);
      data.deportistas
        .filter((d) => d.facultad === f.facultad && d.carrera)
        .forEach((d) => setCars.add(d.carrera!));
      return Array.from(setCars).sort().map((c) => ({ value: c, label: c }));
    }
    return unicos(data.deportistas.map((d) => d.carrera));
  }, [data, f.facultad]);

  if (!data) return <Cargando />;

  const idsSeleccionesPeriodo = new Set(data.selecciones.filter((grupo) => !f.periodo || grupo.periodo_id === f.periodo).map((grupo) => grupo.id));
  const idsClubesPeriodo = new Set(data.clubes.filter((grupo) => !f.periodo || grupo.periodo_id === f.periodo).map((grupo) => grupo.id));
  const depsDe = (id: string) => {
    const ids = new Set([
      ...data.clubMiembros.filter((m) => m.deportista_id === id && idsClubesPeriodo.has(m.grupo_id)).map((m) => data.clubes.find((g) => g.id === m.grupo_id)?.deporte_id),
      ...data.selMiembros.filter((m) => m.deportista_id === id && idsSeleccionesPeriodo.has(m.grupo_id)).map((m) => data.selecciones.find((g) => g.id === m.grupo_id)?.deporte_id),
    ].filter((deporteId): deporteId is string => !!deporteId));
    return [...ids].map((deporteId) => data.deportes.find((d) => d.id === deporteId)?.nombre).filter(Boolean) as string[];
  };
  const gruposDe = (id: string) => ({
    sel: data.selMiembros.filter((m) => m.deportista_id === id && idsSeleccionesPeriodo.has(m.grupo_id)).length,
    club: data.clubMiembros.filter((m) => m.deportista_id === id && idsClubesPeriodo.has(m.grupo_id)).length,
  });

  async function cambiarPeriodo(periodoId: string) {
    setF((actual) => ({ ...actual, periodo: periodoId }));
    if (role !== "admin" || !periodoId || copiandoPeriodo) return;
    setCopiandoPeriodo(true);
    try {
      const origenes = await asegurarCopiaNominaPeriodo(data.periodos, periodoId);
      if (!origenes.length) return;
      await refrescar();
      toast.success(`Se heredaron los datos de los períodos anteriores: ${origenes.join(", ")}`);
    } catch (error) {
      toast.error(`No se pudo copiar la nómina del período anterior: ${errMsg(error)}`);
    } finally {
      setCopiandoPeriodo(false);
    }
  }

  async function guardar() {
    if (!edit) return;
    try {
      const facNorm = normalizarFacultad(edit.facultad?.trim() || null);
      const carNorm = normalizarCarrera(edit.carrera?.trim() || null, facNorm);
      const datos = {
        cedula: (edit.cedula ?? "").trim(),
        nombres: (edit.nombres ?? "").trim(),
        apellidos: (edit.apellidos ?? "").trim(),
        fecha_nacimiento: edit.fecha_nacimiento || null,
                pao: edit.pao || null,
        carrera: carNorm,
        facultad: facNorm,
        genero: edit.genero || null,
        region: edit.region || null,
        tiene_discapacidad: !!edit.tiene_discapacidad,
      };
      let id = edit.id;
      if (id) {
        const { error } = await supabase.from("deportistas").update(datos).eq("id", id);
        if (error) throw error;
      } else {
        const { data: n, error } = await supabase.from("deportistas").insert(datos).select("id").single();
        if (error) throw error;
        id = n.id;
      }
      toast.success("Deportista guardado");
      setEdit(null);
      refrescar();
    } catch (e) {
      const m = errMsg(e);
      toast.error(m.includes("duplicate") ? "Ya existe un deportista con esa cédula" : m);
    }
  }

  async function borrar(d: Deportista) {
    if (!confirm(`¿Eliminar a ${d.nombres} ${d.apellidos}? También saldrá de sus selecciones y clubes.`)) return;
    const { error } = await supabase.from("deportistas").delete().eq("id", d.id);
    if (error) toast.error(errMsg(error));
    else refrescar();
  }

  return (
    <div>
      <PageHeader
        title={esSel ? "Deportistas de selecciones" : "Deportistas de clubes"}
        subtitle={esSel ? "Estudiantes que integran las selecciones deportivas." : "Estudiantes que integran los clubes deportivos."}
      >
        {role === "admin" && <ImportExport
          nombre={esSel ? "deportistas-selecciones" : "deportistas-clubes"}
          ayuda="Excel de clubes: Nombres y apellidos (nombres primero), fecha nacimiento, cédula, género, región, facultad y una marca en Nivelación/PAO 1–9. La edad se calcula desde la fecha."
          onImport={(rows) => data ? importarDeportistas(rows, { esSeleccion: esSel }).then((cantidad) => { refrescar(); return cantidad; }) : Promise.resolve(0)}
          filas={() =>
            lista.map((d) => ({
              Cedula: d.cedula,
              Nombres: d.nombres,
              Apellidos: d.apellidos,
              Fecha_Nacimiento: d.fecha_nacimiento ?? "",
              Edad: calcularEdad(d.fecha_nacimiento) ?? "",
                            PAO: d.pao ?? "",
              Carrera: d.carrera ?? "",
              Facultad: d.facultad ?? "",
              Genero: d.genero ?? "",
              Region: d.region ?? "",
              ...(!esSel ? { Discapacidad: d.tiene_discapacidad ? "Sí" : "No" } : {}),
              Deportes: depsDe(d.id).join(", "),
            }))
          }
        />}
        <Button onClick={() => setEdit({})}>
          <Plus className="mr-2 h-4 w-4" /> Nuevo deportista
        </Button>
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre o cédula…" className="w-72 pl-8" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
        </div>
        <Filtro label="Período" value={f.periodo} onChange={(v) => void cambiarPeriodo(v)} opciones={data.periodos.map((p) => ({ value: p.id, label: p.nombre }))} />
        {copiandoPeriodo && <span role="status" className="self-end pb-2 text-sm text-muted-foreground">Copiando nómina del período anterior…</span>}
        <Filtro label="Deporte" value={f.deporte} onChange={(v) => setF({ ...f, deporte: v })} opciones={data.deportes.map((p) => ({ value: p.id, label: p.nombre }))} />
        <Filtro
          label="Facultad"
          value={f.facultad}
          onChange={(v) => setF({ ...f, facultad: v, carrera: "" })}
          opciones={LISTA_FACULTADES.map((fac) => ({ value: fac, label: fac }))}
        />
        <Filtro
          label="Carrera"
          value={f.carrera}
          onChange={(v) => setF({ ...f, carrera: v })}
          opciones={opcionesCarreraFiltro}
        />
        <Filtro label="Región" value={f.region} onChange={(v) => setF({ ...f, region: v })} opciones={REGIONES.map((r) => ({ value: r, label: r }))} />
      </div>
      <p className="mb-2 text-sm text-muted-foreground">{lista.length} deportistas</p>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cédula</TableHead>
              <TableHead>Apellidos y nombres</TableHead>
              <TableHead>Edad</TableHead>
              <TableHead>Carrera / Facultad</TableHead>
              <TableHead>Región</TableHead>
              <TableHead>Deportes</TableHead>
              <TableHead>{esSel ? "Selecciones" : "Clubes"}</TableHead>
              <TableHead className="w-32 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista.map((d) => {
              const g = gruposDe(d.id);
              return (
                <TableRow key={d.id}>
                  <TableCell className="font-mono text-xs">{d.cedula}</TableCell>
                  <TableCell className="font-medium">
                    {d.apellidos} {d.nombres}
                    {d.es_ejemplo && <Badge variant="secondary" className="ml-2">ejemplo</Badge>}
                    {!esSel && d.tiene_discapacidad && <Badge variant="outline" className="ml-2">discapacidad</Badge>}
                  </TableCell>
                  <TableCell>{calcularEdad(d.fecha_nacimiento) ?? "—"}</TableCell>
                  <TableCell>
                    <div className="text-sm">{d.carrera ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{d.facultad}</div>
                  </TableCell>
                  <TableCell className="text-sm">{d.region ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">{depsDe(d.id).map((n) => <Badge key={n} variant="outline">{n}</Badge>)}</div>
                  </TableCell>
                  <TableCell className="text-sm">{esSel ? g.sel : g.club}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Editar deportista"
                        aria-label="Editar"
                        onClick={() => setEdit({ ...d })}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {role === "admin" && <Button
                        size="icon"
                        variant="ghost"
                        title="Eliminar"
                        aria-label="Eliminar"
                        onClick={() => borrar(d)}
                      ><Trash2 className="h-4 w-4" /></Button>}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {!lista.length && <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">Sin resultados</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>

      {/* Dialog para Crear/Editar Deportista */}
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto p-4 sm:p-6">
          <DialogHeader><DialogTitle>{edit?.id ? "Editar deportista" : "Nuevo deportista"}</DialogTitle></DialogHeader>
          {edit && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Cédula</Label>
                <Input value={edit.cedula ?? ""} onChange={(e) => setEdit({ ...edit, cedula: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Fecha de nacimiento</Label>
                <Input type="date" value={edit.fecha_nacimiento ?? ""} onChange={(e) => setEdit({ ...edit, fecha_nacimiento: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Nombres</Label>
                <Input value={edit.nombres ?? ""} onChange={(e) => setEdit({ ...edit, nombres: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Apellidos</Label>
                <Input value={edit.apellidos ?? ""} onChange={(e) => setEdit({ ...edit, apellidos: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Región de procedencia</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm"
                  value={edit.region ?? ""}
                  onChange={(e) => setEdit({ ...edit, region: e.target.value || null })}
                >
                  <option value="">— Seleccionar —</option>
                  {REGIONES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Género</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm"
                  value={edit.genero ?? ""}
                  onChange={(e) => setEdit({ ...edit, genero: e.target.value || null })}
                >
                  <option value="">— Seleccionar —</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              {!esSel && (
                <div className="space-y-1.5">
                <Label>¿Tiene discapacidad?</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm"
                  value={edit.tiene_discapacidad ? "si" : "no"}
                  onChange={(e) => setEdit({ ...edit, tiene_discapacidad: e.target.value === "si" })}
                >
                  <option value="no">No</option>
                  <option value="si">Sí</option>
                </select>
                </div>
              )}


              {/* Selector de Facultad */}
              <div className="space-y-1.5">
                <Label>Facultad</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={edit.facultad ?? ""}
                  onChange={(e) => {
                    const nuevaFac = e.target.value;
                    const carrerasValidas = getCarrerasPorFacultad(nuevaFac);
                    const mantieneCarrera = edit.carrera && carrerasValidas.includes(edit.carrera);
                    setEdit({
                      ...edit,
                      facultad: nuevaFac || null,
                      carrera: mantieneCarrera ? (edit.carrera ?? null) : null,
                    });
                  }}
                >
                  <option value="">— Seleccionar Facultad —</option>
                  {opcionesFacultadForm.map((fac) => (
                    <option key={fac} value={fac}>{fac}</option>
                  ))}
                </select>
              </div>

              {/* Selector de Carrera (dependiente de Facultad) */}
              <div className="space-y-1.5">
                <Label>Carrera</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={edit.carrera ?? ""}
                  disabled={!edit.facultad}
                  onChange={(e) => setEdit({ ...edit, carrera: e.target.value || null })}
                >
                  <option value="">
                    {!edit.facultad ? "— Primero selecciona una Facultad —" : "— Seleccionar Carrera —"}
                  </option>
                  {opcionesCarreraForm.map((car) => (
                    <option key={car} value={car}>{car}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>Nivel / PAO actual</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm"
                  value={edit.pao ?? ""}
                  onChange={(e) => setEdit({ ...edit, pao: e.target.value || null })}
                >
                  <option value="">— Seleccionar —</option>
                  {["Nivelación", ...Array.from({ length: 9 }, (_, index) => `PAO ${index + 1}`)].map((pao) => <option key={pao} value={pao}>{pao}</option>)}
                </select>
              </div>

              <div className="text-sm text-muted-foreground sm:col-span-2">
                Edad: <strong className="text-foreground">{calcularEdad(edit.fecha_nacimiento) ?? "—"}</strong> (se calcula automáticamente)
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>Cancelar</Button>
            <Button onClick={guardar} disabled={!edit?.cedula || !edit?.nombres || !edit?.apellidos}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
