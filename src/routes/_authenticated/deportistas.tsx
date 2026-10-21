import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2, UserPlus, Flag, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Cargando, PageHeader } from "@/components/PageHeader";
import { Filtro, unicos } from "@/components/Filtro";
import { ImportExport } from "@/components/ImportExport";
import { errMsg, useDatos, useRefrescar, type Deportista } from "@/lib/db";
import { calcularEdad, normalizarFecha } from "@/lib/edad";
import { filtrarDeportistas } from "@/lib/filtros";
import { FACULTADES_Y_CARRERAS, LISTA_FACULTADES, getCarrerasPorFacultad, normalizarCarrera, normalizarFacultad } from "@/lib/catalogos";

export const Route = createFileRoute("/_authenticated/deportistas")({
  head: () => ({ meta: [{ title: "Deportistas — Centro de Deportes ESPOCH" }] }),
  component: Page,
});

type Edit = Partial<Deportista> & { deportes: Set<string> };

type ParticipacionState = {
  deportistaId: string;
  tipo: "CLUB" | "SELECCION";
  grupoId: string;
};

function Page() {
  const { data } = useDatos();
  const refrescar = useRefrescar();
  const [f, setF] = useState({ periodo: "", deporte: "", facultad: "", carrera: "", q: "" });
  const [edit, setEdit] = useState<Edit | null>(null);
  const [participacion, setParticipacion] = useState<ParticipacionState | null>(null);

  const lista = useMemo(() => (data ? filtrarDeportistas(data, f) : []), [data, f]);

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

  const depsDe = (id: string) =>
    data.dd.filter((x) => x.deportista_id === id).map((x) => data.deportes.find((d) => d.id === x.deporte_id)?.nombre).filter(Boolean) as string[];
  const gruposDe = (id: string) => ({
    sel: data.selMiembros.filter((m) => m.deportista_id === id).length,
    club: data.clubMiembros.filter((m) => m.deportista_id === id).length,
  });

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
        carrera: carNorm,
        facultad: facNorm,
        genero: edit.genero || null,
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
      await supabase.from("deportista_deportes").delete().eq("deportista_id", id!);
      if (edit.deportes.size) {
        const { error } = await supabase.from("deportista_deportes").insert([...edit.deportes].map((d) => ({ deportista_id: id!, deporte_id: d })));
        if (error) throw error;
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

  async function guardarParticipacion() {
    if (!participacion?.deportistaId || !participacion.grupoId) {
      toast.error("Seleccione el deportista y el grupo correspondiente");
      return;
    }
    try {
      if (participacion.tipo === "SELECCION") {
        const yaExiste = data!.selMiembros.some(
          (m) => m.grupo_id === participacion.grupoId && m.deportista_id === participacion.deportistaId
        );
        if (yaExiste) {
          toast.error("El deportista ya está registrado en esta Selección");
          return;
        }
        const { error } = await supabase.from("seleccion_miembros").insert({
          seleccion_id: participacion.grupoId,
          deportista_id: participacion.deportistaId,
        });
        if (error) throw error;
        toast.success("Participación en Selección registrada correctamente");
      } else {
        const yaExiste = data!.clubMiembros.some(
          (m) => m.grupo_id === participacion.grupoId && m.deportista_id === participacion.deportistaId
        );
        if (yaExiste) {
          toast.error("El deportista ya está registrado en este Club");
          return;
        }
        const { error } = await supabase.from("club_miembros").insert({
          club_id: participacion.grupoId,
          deportista_id: participacion.deportistaId,
        });
        if (error) throw error;
        toast.success("Participación en Club registrada correctamente");
      }
      setParticipacion(null);
      refrescar();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function importar(rows: Record<string, any>[]) {
    if (!data) return 0;
    const deportesMap = new Map(data.deportes.map((d) => [d.nombre.toLowerCase(), d.id]));
    const registros = rows
      .map((r: { [k: string]: any } & { cedula?: any; nombres?: any; nombre?: any; apellidos?: any; apellido?: any; fechanacimiento?: any; fechadenacimiento?: any; carrera?: any; facultad?: any; deportes?: any; deporte?: any }) => {
        const facNorm = normalizarFacultad(String(r.facultad ?? "").trim() || null);
        const carNorm = normalizarCarrera(String(r.carrera ?? "").trim() || null, facNorm);
        return {
          cedula: String(r.cedula ?? "").trim(),
          nombres: String(r.nombres ?? r.nombre ?? "").trim(),
          apellidos: String(r.apellidos ?? r.apellido ?? "").trim(),
          fecha_nacimiento: normalizarFecha(r.fechanacimiento ?? r.fechadenacimiento),
          carrera: carNorm,
          facultad: facNorm,
          genero: normGenero(r["genero"] ?? r["sexo"]),
          _deps: String(r.deportes ?? r.deporte ?? "").split(/[,;]/).map((s) => s.trim()).filter(Boolean),
        };
      })
      .filter((r) => r.cedula && r.nombres);
    if (!registros.length) throw new Error("No se encontraron filas con Cédula y Nombres");

    const nuevos = [...new Set(registros.flatMap((r) => r._deps))].filter((n) => !deportesMap.has(n.toLowerCase()));
    if (nuevos.length) {
      const { data: ins, error } = await supabase.from("deportes").insert(nuevos.map((nombre) => ({ nombre }))).select();
      if (error) throw error;
      ins.forEach((d) => deportesMap.set(d.nombre.toLowerCase(), d.id));
    }
    const { data: guardados, error } = await supabase
      .from("deportistas")
      .upsert(registros.map(({ _deps, ...r }) => r), { onConflict: "cedula" })
      .select("id, cedula");
    if (error) throw error;
    const idPorCed = new Map(guardados.map((g) => [g.cedula, g.id]));
    const vinc = registros.flatMap((r) =>
      r._deps.map((n) => ({ deportista_id: idPorCed.get(r.cedula)!, deporte_id: deportesMap.get(n.toLowerCase())! })),
    );
    if (vinc.length) {
      const { error: e2 } = await supabase.from("deportista_deportes").upsert(vinc, { ignoreDuplicates: true });
      if (e2) throw e2;
    }
    refrescar();
    return registros.length;
  }

  const deportistaSeleccionado = data.deportistas.find((d) => d.id === participacion?.deportistaId);

  return (
    <div>
      <PageHeader title="Deportistas" subtitle="Cada estudiante se registra una sola vez y puede estar en varios deportes, selecciones y clubes.">
        <ImportExport
          nombre="deportistas"
          ayuda="Columnas: Cedula, Nombres, Apellidos, Fecha_Nacimiento, Carrera, Facultad, Genero, Deportes (separados por coma)"
          onImport={importar}
          filas={() =>
            lista.map((d) => ({
              Cedula: d.cedula,
              Nombres: d.nombres,
              Apellidos: d.apellidos,
              Fecha_Nacimiento: d.fecha_nacimiento ?? "",
              Edad: calcularEdad(d.fecha_nacimiento) ?? "",
              Carrera: d.carrera ?? "",
              Facultad: d.facultad ?? "",
              Genero: d.genero ?? "",
              Deportes: depsDe(d.id).join(", "),
            }))
          }
        />
        <Button variant="outline" onClick={() => setParticipacion({ deportistaId: data.deportistas[0]?.id ?? "", tipo: "SELECCION", grupoId: "" })}>
          <UserPlus className="mr-2 h-4 w-4" /> Registrar participación
        </Button>
        <Button onClick={() => setEdit({ deportes: new Set() })}>
          <Plus className="mr-2 h-4 w-4" /> Nuevo deportista
        </Button>
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre o cédula…" className="w-72 pl-8" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
        </div>
        <Filtro label="Período" value={f.periodo} onChange={(v) => setF({ ...f, periodo: v })} opciones={data.periodos.map((p) => ({ value: p.id, label: p.nombre }))} />
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
              <TableHead>Deportes</TableHead>
              <TableHead>Sel. / Clubes</TableHead>
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
                  </TableCell>
                  <TableCell>{calcularEdad(d.fecha_nacimiento) ?? "—"}</TableCell>
                  <TableCell>
                    <div className="text-sm">{d.carrera ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{d.facultad}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">{depsDe(d.id).map((n) => <Badge key={n} variant="outline">{n}</Badge>)}</div>
                  </TableCell>
                  <TableCell className="text-sm">{g.sel} / {g.club}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Registrar participación"
                        aria-label="Registrar participación"
                        onClick={() => setParticipacion({ deportistaId: d.id, tipo: "SELECCION", grupoId: "" })}
                      >
                        <UserPlus className="h-4 w-4 text-primary" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Editar deportista"
                        aria-label="Editar"
                        onClick={() => setEdit({ ...d, deportes: new Set(data.dd.filter((x) => x.deportista_id === d.id).map((x) => x.deporte_id)) })}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Eliminar"
                        aria-label="Eliminar"
                        onClick={() => borrar(d)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {!lista.length && <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Sin resultados</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>

      {/* Dialog para Crear/Editar Deportista */}
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{edit?.id ? "Editar deportista" : "Nuevo deportista"}</DialogTitle></DialogHeader>
          {edit && (
            <div className="grid grid-cols-2 gap-3">
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
              <div className="col-span-2 space-y-1.5">
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

              <div className="col-span-2 text-sm text-muted-foreground">
                Edad: <strong className="text-foreground">{calcularEdad(edit.fecha_nacimiento) ?? "—"}</strong> (se calcula automáticamente)
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Deportes</Label>
                <div className="flex flex-wrap gap-3 rounded-md border p-3">
                  {data.deportes.map((d) => (
                    <label key={d.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={edit.deportes.has(d.id)}
                        onCheckedChange={(v) => {
                          const s = new Set(edit.deportes);
                          if (v) s.add(d.id); else s.delete(d.id);
                          setEdit({ ...edit, deportes: s });
                        }}
                      />
                      {d.nombre}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>Cancelar</Button>
            <Button onClick={guardar} disabled={!edit?.cedula || !edit?.nombres || !edit?.apellidos}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para Registrar Participación en Club o Selección */}
      <Dialog open={!!participacion} onOpenChange={(o) => !o && setParticipacion(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar participación deportiva</DialogTitle>
          </DialogHeader>
          {participacion && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Deportista</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm"
                  value={participacion.deportistaId}
                  onChange={(e) => setParticipacion({ ...participacion, deportistaId: e.target.value })}
                >
                  <option value="">— Seleccionar deportista —</option>
                  {data.deportistas.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.apellidos} {d.nombres} ({d.cedula})
                    </option>
                  ))}
                </select>
                {deportistaSeleccionado && (
                  <p className="text-xs text-muted-foreground">
                    Carrera: {deportistaSeleccionado.carrera ?? "—"} | Facultad: {deportistaSeleccionado.facultad ?? "—"}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Tipo de participación</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={participacion.tipo === "SELECCION" ? "default" : "outline"}
                    className="flex items-center gap-2 justify-center"
                    onClick={() => setParticipacion({ ...participacion, tipo: "SELECCION", grupoId: "" })}
                  >
                    <Flag className="h-4 w-4" /> Selección
                  </Button>
                  <Button
                    type="button"
                    variant={participacion.tipo === "CLUB" ? "default" : "outline"}
                    className="flex items-center gap-2 justify-center"
                    onClick={() => setParticipacion({ ...participacion, tipo: "CLUB", grupoId: "" })}
                  >
                    <UsersRound className="h-4 w-4" /> Club
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>
                  {participacion.tipo === "SELECCION" ? "Selección Deportiva" : "Club Deportivo"}
                </Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm"
                  value={participacion.grupoId}
                  onChange={(e) => setParticipacion({ ...participacion, grupoId: e.target.value })}
                >
                  <option value="">
                    {participacion.tipo === "SELECCION" ? "— Seleccionar Selección —" : "— Seleccionar Club —"}
                  </option>
                  {participacion.tipo === "SELECCION"
                    ? data.selecciones.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nombre}
                        </option>
                      ))
                    : data.clubes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                </select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setParticipacion(null)}>Cancelar</Button>
            <Button onClick={guardarParticipacion} disabled={!participacion?.deportistaId || !participacion?.grupoId}>
              Guardar participación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function normGenero(v: unknown): string | null {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return null;
  if (s.startsWith("f") || s === "mujer") return "Femenino";
  if (s.startsWith("m") || s === "hombre") return "Masculino";
  return "Otro";
}
