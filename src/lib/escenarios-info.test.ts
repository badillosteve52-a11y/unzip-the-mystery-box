import { describe, expect, it } from "vitest";
import { CATALOGO_ESCENARIOS } from "./catalogos";
import { jugadoresPorPartido } from "./escenarios-info";

describe("escenarios deportivos", () => {
  it("incluye sala de tenis de mesa y sala de ajedrez", () => {
    expect(CATALOGO_ESCENARIOS.filter((e) => e.nombre === "Sala de tenis de mesa")).toHaveLength(1);
    expect(CATALOGO_ESCENARIOS.filter((e) => e.nombre === "Sala de ajedrez")).toHaveLength(1);
  });
  it("incluye las dos canchas de fútbol tenis confirmadas por el usuario", () => {
    const canchas = CATALOGO_ESCENARIOS.filter((e) => e.tipo === "Cancha de Fútbol Tenis");
    expect(canchas.map((e) => e.nombre)).toEqual(["Cancha de fútbol tenis 1", "Cancha de fútbol tenis 2"]);
    expect(canchas.every((e) => e.grupo === "Canchas de fútbol tenis")).toBe(true);
  });
  it("el uso de tenis distingue individuales y dobles del aforo de público", () => {
    expect(jugadoresPorPartido("Cancha de Tenis")).toMatchObject({ min: 2, max: 4 });
    expect(CATALOGO_ESCENARIOS.find((e) => e.nombre === "Cancha de tenis 1")?.capacidad).toBeNull();
  });
});