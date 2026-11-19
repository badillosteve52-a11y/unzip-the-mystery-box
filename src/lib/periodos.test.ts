import { describe, expect, it } from "vitest";
import { seleccionarPeriodoOrigen } from "./periodos";

const periodos = [
  { id: "2025-2", nombre: "2025-2", fecha_inicio: "2025-09-01" },
  { id: "2026-1", nombre: "2026-1", fecha_inicio: "2026-03-01" },
  { id: "2026-2", nombre: "2026-2", fecha_inicio: "2026-09-01" },
];
const periodoMedio = periodos[1]!;
const periodoFinal = periodos[2]!;

describe("seleccionarPeriodoOrigen", () => {
  it("chooses the nearest earlier period with members", () => {
    expect(
      seleccionarPeriodoOrigen(
        periodos,
        periodoFinal,
        new Set(["2025-2", "2026-1"]),
        new Set(["2025-2", "2026-1"]),
      )?.id,
    ).toBe("2026-1");
  });

  it("falls back to earlier groups, never to a future period", () => {
    expect(
      seleccionarPeriodoOrigen(periodos, periodoMedio, new Set(), new Set(["2026-2"])),
    ).toBeNull();

    expect(
      seleccionarPeriodoOrigen(periodos, periodoFinal, new Set(), new Set(["2026-1"]))?.id,
    ).toBe("2026-1");
  });
});
