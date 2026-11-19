import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { errMsg } from "@/lib/db";

export function CambiarContrasenaDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [contrasena, setContrasena] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [guardando, setGuardando] = useState(false);

  function cambiarEstado(open: boolean) {
    onOpenChange(open);
    if (!open) {
      setContrasena("");
      setConfirmacion("");
    }
  }

  async function guardar(event: React.FormEvent) {
    event.preventDefault();
    if (guardando) return;
    if (contrasena !== confirmacion) {
      toast.error("Las contraseñas no coinciden.");
      return;
    }

    setGuardando(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: contrasena });
      if (error) throw error;
      toast.success("Contraseña actualizada.");
      cambiarEstado(false);
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={cambiarEstado}>
      <DialogContent>
        <form onSubmit={guardar} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Cambiar contraseña</DialogTitle>
            <DialogDescription>
              Elige una contraseña nueva de al menos 6 caracteres.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="contrasena-nueva">Nueva contraseña</Label>
            <Input
              id="contrasena-nueva"
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
              value={contrasena}
              onChange={(event) => setContrasena(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmar-contrasena">Confirmar contraseña</Label>
            <Input
              id="confirmar-contrasena"
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
              value={confirmacion}
              onChange={(event) => setConfirmacion(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => cambiarEstado(false)}
              disabled={guardando}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando}>
              {guardando ? "Guardando…" : "Guardar contraseña"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
