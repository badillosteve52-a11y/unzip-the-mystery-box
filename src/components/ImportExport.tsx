import { useRef } from "react";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { exportar, leerArchivo } from "@/lib/excel";
import { errMsg } from "@/lib/db";

export function ImportExport({
  nombre,
  filas,
  onImport,
  ayuda,
}: {
  nombre: string;
  filas: () => Record<string, unknown>[];
  onImport?: (rows: Record<string, unknown>[]) => Promise<number>;
  ayuda?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      {onImport && (
        <>
          <input
            ref={ref}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              const t = toast.loading("Importando…");
              try {
                const n = await onImport(await leerArchivo(f));
                toast.success(`${n} registros importados`, { id: t });
              } catch (err) {
                toast.error(errMsg(err), { id: t });
              }
            }}
          />
          <Button variant="outline" onClick={() => ref.current?.click()} title={ayuda}>
            <Upload className="mr-2 h-4 w-4" /> Importar
          </Button>
        </>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" /> Exportar
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => exportar(filas(), nombre, "xlsx")}>Excel (.xlsx)</DropdownMenuItem>
          <DropdownMenuItem onClick={() => exportar(filas(), nombre, "csv")}>CSV</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
