import { describe, expect, it } from "vitest";
import { calcularEdad, normalizarFecha } from "./edad";

describe("calcularEdad", () => {
  it("cuenta años cumplidos", () => {
    expect(calcularEdad("2003-04-12", new Date(2026, 9, 5))).toBe(23);
  });
  it("no suma el año si aún no cumple", () => {
    expect(calcularEdad("2003-12-20", new Date(2026, 9, 5))).toBe(22);
  });
  it("sin fecha no hay edad", () => {
    expect(calcularEdad(null)).toBeNull();
  });
});

describe("normalizarFecha", () => {
  it("acepta dd/mm/aaaa", () => {
    expect(normalizarFecha("05/03/2002")).toBe("2002-03-05");
  });
});
