import { routeMeta } from "@/lib/route-meta";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Save, ShieldCheck, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Cargando, PageHeader } from "@/components/PageHeader";
import { errMsg } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/accesos")({
  head: () => routeMeta("Accesos", "Administración de cuentas y permisos de acceso al Centro de Deportes ESPOCH."),
  component: Page,
});

async function cargarCuentas() {
  const { data, error } = await (supabase as any).rpc("listar_cuentas");
  if (error) throw error;
  return (data ?? []) as Cuenta[];
}

async function cargarGruposAcceso() {
  const { data, error } = await (supabase as any).rpc("listar_grupos_acceso");
  if (error) throw error;
  return (data ?? []) as GrupoAcceso[];
}

function fecha(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" });
}

type Cuenta = { user_id: string; correo: string; registrada_en: string; es_coordinador: boolean; rol: "admin" | "gestor_grupos" | "sin_acceso" };
type GrupoAcceso = { tipo: "seleccion" | "club"; grupo_id: string; nombre: string };
type GrupoAsignado = { tipo: "seleccion" | "club"; grupo_id: string };

function Page() {
  const qc = useQueryClient();
  const { user } = Route.useRouteContext();
  const { data: cuentas, isLoading, error } = useQuery({ queryKey: ["cuentas"], queryFn: cargarCuentas });
  const { data: grupos = [] } = useQuery({ queryKey: ["grupos-acceso"], queryFn: cargarGruposAcceso });
  const [copiado, setCopiado] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const enlace = `${window.location.origin}/auth`;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(enlace);
      setCopiado(true);
      toast.success("Enlace copiado");
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error("No se pudo copiar. Copia la dirección a mano.");
    }
  }

  async function cambiarRol(cuenta: Cuenta, rol: string) {
    setOcupado(cuenta.user_id);
    try {
      const { error: rpcError } = await (supabase as any).rpc("asignar_rol_cuenta", { _user_id: cuenta.user_id, _rol: rol });
      if (rpcError) throw rpcError;
      toast.success("Rol actualizado.");
      await qc.invalidateQueries({ queryKey: ["cuentas"] });
      await qc.invalidateQueries({ queryKey: ["grupos-cuenta", cuenta.user_id] });
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setOcupado(null);
    }
  }

  if (isLoading) return <Cargando />;
  if (error) return <div className="rounded-xl border bg-card p-6 text-sm text-destructive">No se pudo leer la lista de cuentas: {errMsg(error)}</div>;

  const lista = cuentas ?? [];
  const cuentasConAcceso = lista.filter((cuenta) => cuenta.rol !== "sin_acceso").length;

  return (
    <div>
      <PageHeader title="Accesos" subtitle="Asigna roles y limita a cada profesor o entrenador a sus grupos." />
      <div className="mb-6 rounded-xl border bg-card p-5">
        <h2 className="font-semibold">Invitar a alguien</h2>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Comparte el enlace de registro: <span className="font-medium text-foreground">{enlace}</span></li>
          <li>Después de que la cuenta se registre, asígnale un rol desde esta pantalla.</li>
          <li>Si es profesor o entrenador, marca solo las selecciones y clubes que debe gestionar.</li>
        </ol>
        <Button variant="outline" className="mt-4" onClick={copiar}>
          {copiado ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />} Copiar enlace
        </Button>
      </div>

      <div className="rounded-xl border bg-card">
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold">Cuentas registradas</h2>
          <p className="text-sm text-muted-foreground">{lista.length} en total · {cuentasConAcceso} con acceso</p>
        </div>
        <ul className="divide-y">
          {lista.map((cuenta) => <li key={cuenta.user_id} className="flex flex-wrap items-start justify-between gap-4 px-5 py-4">
            <div className="min-w-0 pt-2">
              <div className="truncate font-medium">{cuenta.correo}</div>
              <div className="text-xs text-muted-foreground">Registrada el {fecha(cuenta.registrada_en)}</div>
            </div>
            <CuentaPermisos cuenta={cuenta} grupos={grupos} esYo={cuenta.user_id === user.id} ocupado={ocupado === cuenta.user_id} onCambiarRol={(rol) => cambiarRol(cuenta, rol)} />
          </li>)}
        </ul>
      </div>
    </div>
  );
}

function CuentaPermisos({ cuenta, grupos, esYo, ocupado, onCambiarRol }: { cuenta: Cuenta; grupos: GrupoAcceso[]; esYo: boolean; ocupado: boolean; onCambiarRol: (rol: string) => Promise<void> }) {
  const qc = useQueryClient();
  const { data: asignados = [], isLoading } = useQuery({
    queryKey: ["grupos-cuenta", cuenta.user_id],
    enabled: cuenta.rol === "gestor_grupos",
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("listar_grupos_cuenta", { _user_id: cuenta.user_id });
      if (error) throw error;
      return (data ?? []) as GrupoAsignado[];
    },
  });
  const [selecciones, setSelecciones] = useState<string[]>([]);
  const [clubes, setClubes] = useState<string[]>([]);
  const [guardandoGrupos, setGuardandoGrupos] = useState(false);
  useEffect(() => {
    setSelecciones(asignados.filter((asignado) => asignado.tipo === "seleccion").map((asignado) => asignado.grupo_id));
    setClubes(asignados.filter((asignado) => asignado.tipo === "club").map((asignado) => asignado.grupo_id));
  }, [asignados]);

  function alternar(tipo: "seleccion" | "club", id: string) {
    const valores = tipo === "seleccion" ? selecciones : clubes;
    const actualizar = tipo === "seleccion" ? setSelecciones : setClubes;
    actualizar(valores.includes(id) ? valores.filter((valor) => valor !== id) : [...valores, id]);
  }

  async function guardarGrupos() {
    setGuardandoGrupos(true);
    try {
      const { error } = await (supabase as any).rpc("guardar_grupos_cuenta", { _user_id: cuenta.user_id, _selecciones: selecciones, _clubes: clubes });
      if (error) throw error;
      toast.success("Grupos autorizados actualizados.");
      await qc.invalidateQueries({ queryKey: ["grupos-cuenta", cuenta.user_id] });
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setGuardandoGrupos(false);
    }
  }

  return <div className="flex min-w-56 flex-col items-start gap-2">
    <div className="flex items-center gap-2">
      <select aria-label={`Rol de ${cuenta.correo}`} value={cuenta.rol} disabled={esYo || ocupado} onChange={(event) => void onCambiarRol(event.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm">
        <option value="sin_acceso">Sin acceso</option>
        <option value="gestor_grupos">Profesor / entrenador</option>
        <option value="admin">Administrador</option>
      </select>
      {cuenta.rol === "admin" ? <ShieldCheck className="h-4 w-4 text-primary" /> : cuenta.rol === "gestor_grupos" ? <UsersRound className="h-4 w-4 text-primary" /> : <span className="text-xs text-muted-foreground">Invitado</span>}
    </div>
    {cuenta.rol === "gestor_grupos" && <div className="w-full min-w-64 rounded-lg border p-3">
      <p className="mb-2 text-xs text-muted-foreground">Autoriza solo los grupos que debe gestionar:</p>
      {isLoading ? <p className="text-xs text-muted-foreground">Cargando grupos…</p> : <>
        <div className="grid gap-2 sm:grid-cols-2">
          {(["seleccion", "club"] as const).map((tipo) => <fieldset key={tipo} className="space-y-1">
            <legend className="mb-1 text-xs font-semibold">{tipo === "seleccion" ? "Selecciones" : "Clubes"}</legend>
            {grupos.filter((grupo) => grupo.tipo === tipo).map((grupo) => <label key={grupo.grupo_id} className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={(tipo === "seleccion" ? selecciones : clubes).includes(grupo.grupo_id)} onChange={() => alternar(tipo, grupo.grupo_id)} />{grupo.nombre}
            </label>)}
          </fieldset>)}
        </div>
        <Button size="sm" variant="outline" className="mt-3" disabled={guardandoGrupos || ocupado} onClick={() => void guardarGrupos()}><Save className="mr-2 h-4 w-4" />Guardar grupos</Button>
      </>}
    </div>}
  </div>;
}
