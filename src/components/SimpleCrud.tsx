import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "./PageHeader";
import { ImportExport } from "./ImportExport";
import { errMsg, useRefrescar } from "@/lib/db";

export type Campo = {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "bool" | "textarea" | "select";
  required?: boolean;
  importKey?: string;
  options?: readonly string[] | string[];
  badge?: boolean;
};

type Row = { id: string; nombre?: unknown; es_ejemplo?: boolean; [k: string]: unknown };
type EditRow = { id?: string; nombre?: unknown; [k: string]: unknown };type GrupoPeriodo = { id: string; nombre: string; deporte_id: string | null };

function claveGrupo(nombre: string, deporteId: string | null) {
  return JSON.stringify([nombre.trim().toLocaleLowerCase(), deporteId]);
}

async function copiarClubesPeriodo(origenId: string, destinoId: string) {
  const { data: origenes, error: errorOrigen } = await supabase
    .from("clubes")
    .select("id,nombre,deporte_id")
    .eq("periodo_id", origenId);
  if (errorOrigen) throw errorOrigen;
  if (!origenes?.length) return;

  const idsOrigen = origenes.map((grupo) => grupo.id);
  const { data: miembros, error: errorMiembros } = await supabase
    .from("club_miembros")
    .select("club_id,deportista_id")
    .in("club_id", idsOrigen);
  if (errorMiembros) throw errorMiembros;

  const { data: destinos, error: errorDestinos } = await supabase
    .from("clubes")
    .select("id,nombre,deporte_id")
    .eq("periodo_id", destinoId);
  if (errorDestinos) throw errorDestinos;

  const porClave = new Map<string, GrupoPeriodo>();
  (destinos ?? []).forEach((grupo) => porClave.set(claveGrupo(grupo.nombre, grupo.deporte_id), grupo));
  const faltantes = origenes.filter((grupo) => !porClave.has(claveGrupo(grupo.nombre, grupo.deporte_id)));
  if (faltantes.length) {
    const { data: creados, error: errorCrear } = await supabase
      .from("clubes")
      .insert(faltantes.map((grupo) => ({ nombre: grupo.nombre, deporte_id: grupo.deporte_id, periodo_id: destinoId, es_ejemplo: false })))
      .select("id,nombre,deporte_id");
    if (errorCrear) throw errorCrear;
    (creados ?? []).forEach((grupo) => porClave.set(claveGrupo(grupo.nombre, grupo.deporte_id), grupo));
  }

  const grupoDestinoPorOrigen = new Map(origenes.map((grupo) => [grupo.id, porClave.get(claveGrupo(grupo.nombre, grupo.deporte_id))?.id]));
  const membresias = (miembros ?? []).flatMap((miembro) => {
    const clubId = grupoDestinoPorOrigen.get(miembro.club_id);
    return clubId ? [{ club_id: clubId, deportista_id: miembro.deportista_id }] : [];
  });
  if (membresias.length) {
    const { error } = await supabase.from("club_miembros").upsert(membresias, { onConflict: "club_id,deportista_id", ignoreDuplicates: true });
    if (error) throw error;
  }
}

async function copiarSeleccionesPeriodo(origenId: string, destinoId: string) {
  const { data: origenes, error: errorOrigen } = await supabase
    .from("selecciones")
    .select("id,nombre,deporte_id")
    .eq("periodo_id", origenId);
  if (errorOrigen) throw errorOrigen;
  if (!origenes?.length) return;

  const idsOrigen = origenes.map((grupo) => grupo.id);
  const { data: miembros, error: errorMiembros } = await supabase
    .from("seleccion_miembros")
    .select("seleccion_id,deportista_id")
    .in("seleccion_id", idsOrigen);
  if (errorMiembros) throw errorMiembros;

  const { data: destinos, error: errorDestinos } = await supabase
    .from("selecciones")
    .select("id,nombre,deporte_id")
    .eq("periodo_id", destinoId);
  if (errorDestinos) throw errorDestinos;

  const porClave = new Map<string, GrupoPeriodo>();
  (destinos ?? []).forEach((grupo) => porClave.set(claveGrupo(grupo.nombre, grupo.deporte_id), grupo));
  const faltantes = origenes.filter((grupo) => !porClave.has(claveGrupo(grupo.nombre, grupo.deporte_id)));
  if (faltantes.length) {
    const { data: creados, error: errorCrear } = await supabase
      .from("selecciones")
      .insert(faltantes.map((grupo) => ({ nombre: grupo.nombre, deporte_id: grupo.deporte_id, periodo_id: destinoId, es_ejemplo: false })))
      .select("id,nombre,deporte_id");
    if (errorCrear) throw errorCrear;
    (creados ?? []).forEach((grupo) => porClave.set(claveGrupo(grupo.nombre, grupo.deporte_id), grupo));
  }

  const grupoDestinoPorOrigen = new Map(origenes.map((grupo) => [grupo.id, porClave.get(claveGrupo(grupo.nombre, grupo.deporte_id))?.id]));
  const membresias = (miembros ?? []).flatMap((miembro) => {
    const seleccionId = grupoDestinoPorOrigen.get(miembro.seleccion_id);
    return seleccionId ? [{ seleccion_id: seleccionId, deportista_id: miembro.deportista_id }] : [];
  });
  if (membresias.length) {
    const { error } = await supabase.from("seleccion_miembros").upsert(membresias, { onConflict: "seleccion_id,deportista_id", ignoreDuplicates: true });
    if (error) throw error;
  }
}

function esPeriodoPosterior(destino: Record<string, unknown>, origen: Row) {
  const fechaDestino = Date.parse(String(destino["fecha_inicio"] ?? ""));
  const fechaOrigen = Date.parse(String(origen["fecha_inicio"] ?? ""));
  if (Number.isFinite(fechaDestino) && Number.isFinite(fechaOrigen) && fechaDestino !== fechaOrigen) {
    return fechaDestino > fechaOrigen;
  }
  const creadoDestino = Date.parse(String(destino["created_at"] ?? ""));
  const creadoOrigen = Date.parse(String(origen["created_at"] ?? ""));
  if (Number.isFinite(creadoDestino) && Number.isFinite(creadoOrigen)) return creadoDestino > creadoOrigen;
  return !destino["id"];
}



export function SimpleCrud({
  tabla,
  titulo,
  subtitulo,
  singular,
  campos,
  filas,
  extra,
  extraTop,
  grupoDeFila,
}: {
  tabla: "deportes" | "periodos" | "escenarios" | "entrenadores";
  titulo: string;
  subtitulo: string;
  singular: string;
  campos: Campo[];
  filas: Row[];
  extra?: (r: Row) => React.ReactNode;
  extraTop?: React.ReactNode;
  grupoDeFila?: (r: Row) => string | null;
}) {
  const refrescar = useRefrescar();
  const [edit, setEdit] = useState<EditRow | null>(null);
  const [q, setQ] = useState("");

  const vistas = filas.filter((f) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (
      String(f.nombre ?? "").toLowerCase().includes(s) ||
      campos.some((c) => {
        const v = f[c.key];
        return v != null && String(v).toLowerCase().includes(s);
      })
    );
  });

  function limpiar(v: Record<string, unknown>) {
    const o: Record<string, unknown> = {};
    for (const c of campos) {
      let x = v[c.key];
      if (c.type === "number") x = x === "" || x == null ? null : Number(x);
      else if (c.type === "bool") x = !!x;
      else if (x === "") x = null;
      o[c.key] = x;
    }
    return o;
  }

  async function guardar() {
    if (!edit) return;
    let periodoGuardado: Row | null = null;
    try {
      const datos = limpiar(edit);
      let seCopioNomina = false;

      if (tabla === "periodos") {
        const activar = datos["activo"] === true;
        const periodoActual = filas.find((fila) => fila["activo"] === true && fila.id !== edit.id);
        const periodoEditado = filas.find((fila) => fila.id === edit.id);
        const yaEstabaActivo = periodoEditado?.["activo"] === true;
        const guardarInactivo = activar && !yaEstabaActivo;
        const datosGuardar = { ...datos, activo: guardarInactivo ? false : activar };
        const resultado = edit.id
          ? await supabase.from("periodos").update(datosGuardar as never).eq("id", edit.id).select("*").single()
          : await supabase.from("periodos").insert(datosGuardar as never).select("*").single();
        if (resultado.error) throw resultado.error;

        const destino = resultado.data as unknown as Row;
        periodoGuardado = destino;
        if (guardarInactivo && periodoActual && esPeriodoPosterior(destino, periodoActual)) {
          await copiarClubesPeriodo(periodoActual.id, destino.id);
          await copiarSeleccionesPeriodo(periodoActual.id, destino.id);
          seCopioNomina = true;
        }

        if (activar) {
          const { error: errorDesactivar } = await supabase
            .from("periodos")
            .update({ activo: false } as never)
            .neq("id", destino.id);
          if (errorDesactivar) throw errorDesactivar;

          if (!yaEstabaActivo) {
            const { error: errorActivar } = await supabase
              .from("periodos")
              .update({ activo: true } as never)
              .eq("id", destino.id);
            if (errorActivar) {
              if (periodoActual) await supabase.from("periodos").update({ activo: true } as never).eq("id", periodoActual.id);
              throw errorActivar;
            }
          }
        }
      } else {
        const { error } = edit.id
          ? await supabase.from(tabla).update(datos as never).eq("id", edit.id)
          : await supabase.from(tabla).insert(datos as never);
        if (error) throw error;
      }

      toast.success(seCopioNomina ? "Período activado; se copiaron clubes, selecciones e integrantes del período anterior" : "Guardado");
      setEdit(null);
      refrescar();
    } catch (e) {
      if (periodoGuardado && !edit.id) {
        setEdit({ ...edit, id: periodoGuardado.id, created_at: periodoGuardado["created_at"] });
      }
      toast.error(errMsg(e));
    }
  }

  async function borrar(r: Row) {
    if (!confirm(`¿Eliminar "${r.nombre}"?`)) return;
    const { error } = await supabase.from(tabla).delete().eq("id", r.id);
    if (error) toast.error(errMsg(error));
    else refrescar();
  }

  async function importar(rows: Record<string, unknown>[]) {
    const datos = rows
      .map((r) => {
        const o: Record<string, unknown> = {};
        for (const c of campos) o[c.key] = r[c.importKey ?? c.key.replace(/_/g, "")] ?? "";
        return limpiar(o);
      })
      .filter((o) => o["nombre"]);
    if (!datos.length) throw new Error("No se encontró la columna 'Nombre'");
    const { error } = await supabase.from(tabla).insert(datos as never);
    if (error) throw error;
    refrescar();
    return datos.length;
  }

  const fmt = (c: Campo, v: unknown) => (c.type === "bool" ? (v ? "Sí" : "No") : v == null || v === "" ? "—" : String(v));

  const columnas = campos.filter((c) => c.type !== "textarea");
  const renderFila = (r: Row) => (
    <TableRow key={r.id}>
      {columnas.map((c, i) => (
        <TableCell key={c.key} className={i === 0 ? "font-medium" : ""}>
          {c.badge && r[c.key] ? (
            <Badge variant="outline" className="font-normal">{fmt(c, r[c.key])}</Badge>
          ) : fmt(c, r[c.key])}
        </TableCell>
      ))}
      {extra && <TableCell>{extra(r)}</TableCell>}
      <TableCell className="text-right">
        <Button size="icon" variant="ghost" onClick={() => setEdit({ ...r })} aria-label="Editar"><Pencil className="h-4 w-4" /></Button>
        <Button size="icon" variant="ghost" onClick={() => borrar(r)} aria-label="Eliminar"><Trash2 className="h-4 w-4" /></Button>
      </TableCell>
    </TableRow>
  );

  const grupos = new Map<string, Row[]>();
  const filasVisuales: Array<{ grupo: string | null; filas: Row[] }> = [];
  for (const fila of vistas) {
    const grupo = grupoDeFila?.(fila) ?? null;
    if (!grupo) {
      filasVisuales.push({ grupo: null, filas: [fila] });
    } else if (grupos.has(grupo)) {
      grupos.get(grupo)?.push(fila);
    } else {
      const filas = [fila];
      grupos.set(grupo, filas);
      filasVisuales.push({ grupo, filas });
    }
  }


  return (
    <div>
      <PageHeader title={titulo} subtitle={subtitulo}>
        <ImportExport
          nombre={tabla}
          filas={() => filas.map((f) => Object.fromEntries(campos.map((c) => [c.label, f[c.key] ?? ""])))}
          onImport={importar}
          ayuda={`Columnas: ${campos.map((c) => c.label).join(", ")}`}
        />
        <Button onClick={() => setEdit({})}>
          <Plus className="mr-2 h-4 w-4" /> Nuevo {singular}
        </Button>
      </PageHeader>

      {extraTop}

      <Input placeholder="Buscar por nombre, tipo, ubicación…" value={q} onChange={(e) => setQ(e.target.value)} className="mb-4 max-w-sm" />

      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {campos.filter((c) => c.type !== "textarea").map((c) => <TableHead key={c.key}>{c.label}</TableHead>)}
              {extra && <TableHead />}
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filasVisuales.map(({ grupo, filas }) => {
              if (!grupo) return renderFila(filas[0]!);
              return (
                <TableRow key={grupo}>
                  <TableCell colSpan={columnas.length + (extra ? 1 : 0) + 1} className="p-3">
                    <details>
                      <summary className="cursor-pointer font-semibold">
                        {grupo} <span className="text-xs font-normal text-muted-foreground">— {filas.length} espacios</span>
                      </summary>
                      <div className="mt-3 overflow-hidden rounded-md border">
                        <Table><TableBody>{filas.map(renderFila)}</TableBody></Table>
                      </div>
                    </details>
                  </TableCell>
                </TableRow>
              );
            })}
            {!filasVisuales.length && (
              <TableRow><TableCell colSpan={campos.length + 2} className="py-10 text-center text-muted-foreground">Sin registros</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>{edit?.id ? "Editar" : "Nuevo"} {singular}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {campos.map((c) => (
              <div key={c.key} className="space-y-1.5">
                <Label>{c.label}</Label>
                {c.type === "bool" ? (
                  <div><Switch checked={!!edit?.[c.key]} onCheckedChange={(v) => setEdit({ ...edit, [c.key]: v })} /></div>
                ) : c.type === "textarea" ? (
                  <Textarea value={String(edit?.[c.key] ?? "")} onChange={(e) => setEdit({ ...edit, [c.key]: e.target.value })} />
                ) : c.type === "select" && c.options ? (
                  <Select
                    value={String(edit?.[c.key] ?? "")}
                    onValueChange={(v) => setEdit({ ...edit, [c.key]: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`Seleccionar ${c.label.toLowerCase()}…`} />
                    </SelectTrigger>
                    <SelectContent>
                      {c.options.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <>
                    <Input
                      type={c.type ?? "text"}
                      required={c.required}
                      list={c.options ? `list-${c.key}` : undefined}
                      value={String(edit?.[c.key] ?? "")}
                      onChange={(e) => setEdit({ ...edit, [c.key]: e.target.value })}
                    />
                    {c.options && (
                      <datalist id={`list-${c.key}`}>
                        {c.options.map((opt) => (
                          <option key={opt} value={opt} />
                        ))}
                      </datalist>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>Cancelar</Button>
            <Button onClick={guardar} disabled={!edit || campos.some((c) => c.required && !String(edit[c.key] ?? "").trim())}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

