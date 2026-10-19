import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
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
import { calcularEdad } from "@/lib/edad";

type Tipo = "selecciones" | "clubes";

export function GrupoModule({ tipo, data }: { tipo: Tipo; data: DatosCompletos }) {
  const esSel = tipo === "selecciones";
  const singular = esSel ? "selección" : "club";
  const grupos = esSel ? data.selecciones : data.clubes;
  const miembros = esSel ? data.selMiembros : data.clubMiembros;
  const refrescar = useRefrescar();

  const activo = data.periodos.find((p) => p.activo)?.id ?? "";
  const [periodo, setPeriodo] = useState("");
  const [deporte, setDeporte] = useState("");
  const [edit, setEdit] = useState<(Partial<Grupo> & { ids: Set<string> }) | null>(null);
  const [q, setQ] = useState("");

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
                };
              }),
            )
          }
        />
        <Button onClick={() => setEdit({ periodo_id: activo || null, ids: new Set() })}>
          <Plus className="mr-2 h-4 w-4" /> {esSel ? "Nueva selección" : "Nuevo club"}
        </Button>
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
                  <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => setEdit({ ...g, ids: new Set(ms.map((m) => m.deportista_id)) })}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" aria-label="Eliminar" onClick={() => borrar(g)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" /> {ms.length} integrantes
              </div>
              <ul className="mt-2 space-y-0.5 text-sm">
                {ms.slice(0, 5).map((m) => {
                  const d = porId.get(m.deportista_id);
                  return <li key={m.deportista_id} className="truncate">{d?.apellidos} {d?.nombres}</li>;
                })}
                {ms.length > 5 && <li className="text-muted-foreground">y {ms.length - 5} más…</li>}
              </ul>
            </div>
          );
        })}
        {!vistos.length && <p className="col-span-full py-10 text-center text-muted-foreground">No hay {tipo} para estos filtros.</p>}
      </div>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-lg">
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
