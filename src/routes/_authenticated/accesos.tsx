import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Cargando, PageHeader } from "@/components/PageHeader";
import { errMsg } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/accesos")({
  head: () => ({ meta: [{ title: "Accesos — Centro de Deportes ESPOCH" }] }),
  component: Page,
});

async function cargarCuentas() {
  const { data, error } = await supabase.rpc("listar_cuentas");
  if (error) throw error;
  return data ?? [];
}

function fecha(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" });
}

type Cuenta = Awaited<ReturnType<typeof cargarCuentas>>[number];

function Page() {
  const qc = useQueryClient();
  const { user } = Route.useRouteContext();
  const { data: cuentas, isLoading, error } = useQuery({ queryKey: ["cuentas"], queryFn: cargarCuentas });
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

  async function cambiar(c: Cuenta) {
    const nuevo = !c.es_coordinador;
    setOcupado(c.user_id);
    try {
      const { error: e } = await supabase.rpc("definir_coordinador", { _user_id: c.user_id, _es_coordinador: nuevo });
      if (e) throw e;
      toast.success(nuevo ? `${c.correo} ya puede entrar` : `Se le quitó el acceso a ${c.correo}`);
      await qc.invalidateQueries({ queryKey: ["cuentas"] });
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setOcupado(null);
    }
  }

  if (isLoading) return <Cargando />;
  if (error) return <div className="rounded-xl border bg-card p-6 text-sm text-destructive">No se pudo leer la lista de cuentas: {errMsg(error)}</div>;

  const lista = cuentas ?? [];
  const coordinadores = lista.filter((c) => c.es_coordinador).length;

  return (
    <div>
      <PageHeader title="Accesos" subtitle="Cuentas registradas en el sistema y quién puede entrar." />

      <div className="mb-6 rounded-xl border bg-card p-5">
        <h2 className="font-semibold">Invitar a alguien</h2>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>
            Comparte el enlace de registro: <span className="font-medium text-foreground">{enlace}</span>
          </li>
          <li>Si no hay coordinador, la primera cuenta nueva que confirme su correo recibirá coordinación automáticamente.</li>
          <li>Las demás cuentas deben recibir acceso desde esta pantalla.</li>
        </ol>
        <Button variant="outline" className="mt-4" onClick={copiar}>
          {copiado ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />} Copiar enlace
        </Button>
      </div>

      <div className="rounded-xl border bg-card">
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold">Cuentas registradas</h2>
          <p className="text-sm text-muted-foreground">
            {lista.length} en total · {coordinadores} con acceso
          </p>
        </div>
        <ul className="divide-y">
          {lista.map((c) => {
            const esYo = c.user_id === user.id;
            return (
              <li key={c.user_id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <div className="truncate font-medium">{c.correo}</div>
                  <div className="text-xs text-muted-foreground">
                    Registrada el {fecha(c.registrada_en)}

                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {c.es_coordinador ? <Badge>Con acceso</Badge> : <Badge variant="outline">Sin acceso</Badge>}
                  <Button
                    size="sm"
                    variant={c.es_coordinador ? "outline" : "default"}
                    disabled={ocupado === c.user_id}
                    onClick={() => cambiar(c)}
                  >
                    {c.es_coordinador ? (
                      <>
                        <ShieldOff className="mr-2 h-4 w-4" /> {esYo ? "Ceder coordinación" : "Quitar acceso"}
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="mr-2 h-4 w-4" /> Dar acceso
                      </>
                    )}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
