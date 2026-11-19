import { describe, expect, it } from "vitest";
import {
  idsSeleccionesLegadasPreferidas,
  rutaCertificadoCompartido,
} from "./certificados-selecciones";

describe("certificados de selección", () => {
  it("usa una sola ruta para el certificado de un deportista", () => {
    expect(rutaCertificadoCompartido("deportista-1")).toBe("deportista-1.pdf");
  });

  it("prioriza las copias de selecciones asignadas a entrenadores entre períodos", () => {
    const selecciones = [
      { id: "seleccion-admin", nombre: "Atletismo", deporte_id: "deporte-1" },
      { id: "seleccion-entrenador", nombre: "atletismo", deporte_id: "deporte-1" },
      { id: "otra-seleccion", nombre: "Ajedrez", deporte_id: "deporte-2" },
    ];
    const miembros = [
      { grupo_id: "seleccion-admin", deportista_id: "deportista-1" },
      { grupo_id: "seleccion-entrenador", deportista_id: "deportista-1" },
      { grupo_id: "otra-seleccion", deportista_id: "deportista-1" },
    ];
    const seleccionesConAccesoEntrenador = ["seleccion-entrenador"];

    expect(
      idsSeleccionesLegadasPreferidas(
        "seleccion-admin",
        "deportista-1",
        selecciones,
        miembros,
        seleccionesConAccesoEntrenador,
      ),
    ).toEqual(["seleccion-entrenador", "seleccion-admin"]);
  });
});
