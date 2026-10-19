import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import hero from "@/assets/hero-deportes.jpg";
import logoBlanco from "@/assets/espoch-logo-blanco.png";
import logoOscuro from "@/assets/espoch-logo.png";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Ingresar — Centro de Deportes ESPOCH" },
      { name: "description", content: "Acceso del coordinador al sistema del Centro de Deportes ESPOCH." },
      { property: "og:title", content: "Ingresar — Centro de Deportes ESPOCH" },
      { property: "og:description", content: "Acceso del coordinador al sistema del Centro de Deportes ESPOCH." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [modo, setModo] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [cargando, setCargando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    try {
      if (modo === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
        nav({ to: "/panel" });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: pass,
          options: { emailRedirectTo: window.location.origin + "/panel" },
        });
        if (error) throw error;
        if (data.session) nav({ to: "/panel" });
        else toast.success("Revisa tu correo para confirmar la cuenta.");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-sidebar lg:block">
        <img src={hero} alt="" width={1600} height={1024} className="h-full w-full object-cover opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-t from-sidebar via-sidebar/30 to-transparent" />
        <div className="absolute bottom-10 left-10 right-10 text-sidebar-foreground">
          <img src={logoBlanco} alt="Logo ESPOCH" className="mb-4 h-12 w-auto" />
          <p className="font-display text-2xl font-bold">Centro de Deportes ESPOCH</p>
          <p className="mt-1 opacity-80">Gestión de deportistas, selecciones y clubes.</p>
        </div>
      </div>
      <div className="flex items-center justify-center px-4 py-12">
      <form onSubmit={enviar} className="w-full max-w-sm space-y-5 rounded-xl border bg-card p-8 shadow-sm">
        <img src={logoOscuro} alt="Logo ESPOCH" className="mx-auto h-14 w-auto" />
        <div>
          <h1 className="text-2xl font-bold">{modo === "in" ? "Ingresar" : "Crear cuenta de coordinador"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {modo === "in"
              ? "Acceso exclusivo para el coordinador."
              : "La primera cuenta creada será la del coordinador. Las siguientes no tendrán acceso."}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Correo</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pass">Contraseña</Label>
          <Input id="pass" type="password" required minLength={6} value={pass} onChange={(e) => setPass(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={cargando}>
          {modo === "in" ? "Ingresar" : "Crear cuenta"}
        </Button>
        <button type="button" className="w-full text-sm text-muted-foreground underline" onClick={() => setModo(modo === "in" ? "up" : "in")}>
          {modo === "in" ? "¿Primera vez? Crear cuenta" : "Ya tengo cuenta"}
        </button>
      </form>
      </div>
    </div>
  );
}
