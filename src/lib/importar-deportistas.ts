import { supabase } from "@/integrations/supabase/client";
import { normalizarFecha } from "@/lib/edad";
import { normalizarCarrera, normalizarFacultad } from "@/lib/catalogos";

export type FilaExcel = Record<string, unknown>;

export async function importarDeportistas(
  rows: FilaExcel[],
  opciones: { esSeleccion: boolean; grupoId?: string },
) {
  const errores: string[] = [];
  const registros = rows
    .map((r, index) => {
      const fila = index + 2;
      const nombreCompleto = texto(r["nombresyapellidos"] ?? r["apellidosynombres"] ?? r["nombrecompleto"]);
      let nombres = texto(r["nombres"] ?? r["nombre"]);
      let apellidos = texto(r["apellidos"] ?? r["apellido"]);
      if ((!nombres || !apellidos) && nombreCompleto) {
        const partesComa = nombreCompleto.split(",").map((parte) => parte.trim()).filter(Boolean);
        if (partesComa.length >= 2) {
          nombres ||= partesComa[0]!;
          apellidos ||= partesComa.slice(1).join(" ");
        } else {
          const palabras = nombreCompleto.split(/\s+/).filter(Boolean);
          if (palabras.length >= 3) {
            nombres ||= palabras.slice(0, -2).join(" ");
            apellidos ||= palabras.slice(-2).join(" ");
          } else if (palabras.length === 2) {
            nombres ||= palabras[0]!;
            apellidos ||= palabras[1]!;
          }
        }
      }
      const cedulaOriginal = texto(r["cedula"]).replace(/\s+/g, "");
      const cedula = /^\d{1,9}$/.test(cedulaOriginal) ? cedulaOriginal.padStart(10, "0") : cedulaOriginal;
      const fechaOriginal = r["fechanacimiento"] ?? r["fechadenacimiento"] ?? r["fechanac"];
      const fechaNacimiento = normalizarFecha(fechaOriginal);
      if (Object.values(r).every((valor) => texto(valor) === "")) return null;
      if (!/^\d{10}$/.test(cedula)) {
        errores.push("fila " + fila + ": la cédula debe tener 10 dígitos");
        return null;
      }
      if (!nombres || !apellidos) {
        errores.push("fila " + fila + ": faltan cédula, nombres o apellidos");
        return null;
      }
      if (fechaOriginal && !fechaNacimiento) {
        errores.push("fila " + fila + ": la fecha de nacimiento no se reconoce");
        return null;
      }
      const columnasPao: [string, string][] = [
        ["nivelacion", "Nivelación"],
        ...Array.from({ length: 9 }, (_, i): [string, string] => ["pao" + (i + 1), "PAO " + (i + 1)]),
      ];
      const paosMarcados = columnasPao.filter(([clave]) => {
        const valor = texto(r[clave]).toLowerCase();
        return valor !== "" && !["0", "no", "false", "-", "—"].includes(valor);
      });
      if (paosMarcados.length > 1) {
        errores.push("fila " + fila + ": hay más de un PAO marcado");
        return null;
      }
      const facultad = normalizarFacultad(texto(r["facultad"]) || null);
      return {
        _fila: fila,
        cedula,
        nombres,
        apellidos,
        fecha_nacimiento: fechaNacimiento,
        pao: paosMarcados[0]?.[1] ?? (texto(r["pao"]) || null),
        carrera: normalizarCarrera(texto(r["carrera"]) || null, facultad),
        facultad,
        genero: normalizarGenero(r["genero"] ?? r["sexo"]),
        region: normalizarRegion(r["region"] ?? r["zona"]),
        tiene_discapacidad: normalizarSiNo(r["discapacidad"] ?? r["tienediscapacidad"]),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const filasPorCedula = new Map<string, number>();
  for (const registro of registros) {
    const repetidaEn = filasPorCedula.get(registro.cedula);
    if (repetidaEn) errores.push("filas " + repetidaEn + " y " + registro._fila + ": cédula repetida " + registro.cedula);
    else filasPorCedula.set(registro.cedula, registro._fila);
  }
  if (errores.length) {
    throw new Error("Revisa el Excel: " + errores.slice(0, 5).join("; ") + (errores.length > 5 ? "; y " + (errores.length - 5) + " problema(s) más" : ""));
  }
  if (!registros.length) throw new Error("El Excel no contiene filas de deportistas");

  const { data: guardados, error } = await supabase
    .from("deportistas")
    .upsert(registros.map(({ _fila: _f, ...registro }) => registro), { onConflict: "cedula" })
    .select("id, cedula");
  if (error) throw error;
  const idPorCedula = new Map(guardados.map((deportista) => [deportista.cedula, deportista.id]));
  if (opciones.grupoId) {
    if (opciones.esSeleccion) {
      const membresias = registros.map((registro) => ({ seleccion_id: opciones.grupoId!, deportista_id: idPorCedula.get(registro.cedula)! }));
      const { error } = await supabase.from("seleccion_miembros").upsert(membresias, { onConflict: "seleccion_id,deportista_id", ignoreDuplicates: true });
      if (error) throw error;
    } else {
      const membresias = registros.map((registro) => ({ club_id: opciones.grupoId!, deportista_id: idPorCedula.get(registro.cedula)! }));
      const { error } = await supabase.from("club_miembros").upsert(membresias, { onConflict: "club_id,deportista_id", ignoreDuplicates: true });
      if (error) throw error;
    }
  }
  return registros.length;
}

function texto(valor: unknown) {
  return String(valor ?? "").trim();
}
function normalizarSiNo(valor: unknown) {
  const textoNorm = texto(valor).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return textoNorm === "si" || textoNorm === "yes" || textoNorm === "1" || textoNorm === "true" || textoNorm === "x";
}
function normalizarGenero(valor: unknown): string | null {
  const textoNorm = texto(valor).toLowerCase();
  if (!textoNorm) return null;
  if (textoNorm.startsWith("f") || textoNorm === "mujer") return "Femenino";
  if (textoNorm.startsWith("m") || textoNorm === "hombre") return "Masculino";
  return "Otro";
}
function normalizarRegion(valor: unknown): string | null {
  const textoNorm = texto(valor).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (!textoNorm) return null;
  if (textoNorm.startsWith("sie")) return "Sierra";
  if (textoNorm.startsWith("cos")) return "Costa";
  if (textoNorm.startsWith("ama") || textoNorm.startsWith("orie")) return "Amazonía";
  if (textoNorm.startsWith("ins") || textoNorm.includes("galap")) return "Insular";
  return null;
}
