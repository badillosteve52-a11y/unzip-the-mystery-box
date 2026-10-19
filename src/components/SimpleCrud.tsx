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
type EditRow = { id?: string; nombre?: unknown; [k: string]: unknown };

export function SimpleCrud({
  tabla,
  titulo,
  subtitulo,
  singular,
  campos,
  filas,
  extra,
  extraTop,
}: {
  tabla: "deportes" | "periodos" | "escenarios";
  titulo: string;
  subtitulo: string;
  singular: string;
  campos: Campo[];
  filas: Row[];
  extra?: (r: Row) => React.ReactNode;
  extraTop?: React.ReactNode;
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
    try {
      const datos = limpiar(edit);
      if (tabla === "periodos" && datos["activo"]) {
        // Garantizar que solo un período permanezca activo
        await supabase
          .from("periodos")
          .update({ activo: false } as never)
          .neq("id", (edit.id as string) ?? "00000000-0000-0000-0000-000000000000");
      }
      const { error } = edit.id
        ? await supabase.from(tabla).update(datos as never).eq("id", edit.id as string)
        : await supabase.from(tabla).insert(datos as never);
      if (error) throw error;
      toast.success("Guardado");
      setEdit(null);
      refrescar();
    } catch (e) {
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
            {vistas.map((r) => (
              <TableRow key={r.id}>
                {campos.filter((c) => c.type !== "textarea").map((c, i) => (
                  <TableCell key={c.key} className={i === 0 ? "font-medium" : ""}>
                    {c.badge && r[c.key] ? (
                      <Badge variant="outline" className="font-normal">
                        {fmt(c, r[c.key])}
                      </Badge>
                    ) : (
                      fmt(c, r[c.key])
                    )}
                  </TableCell>
                ))}
                {extra && <TableCell>{extra(r)}</TableCell>}
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => setEdit({ ...r })} aria-label="Editar"><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => borrar(r)} aria-label="Eliminar"><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {!vistas.length && (
              <TableRow><TableCell colSpan={campos.length + 2} className="py-10 text-center text-muted-foreground">Sin registros</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
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
            <Button onClick={guardar} disabled={!edit?.nombre}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
