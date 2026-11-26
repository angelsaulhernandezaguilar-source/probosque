import { describe, expect, it } from "vitest";
import { asignarPresupuesto, folioProyecto, ordenCronologico, RESULTADO } from "./listados";

describe("asignarPresupuesto", () => {
  it("aprueba en orden y va restando del techo presupuestal", () => {
    const { filas, comprometido, disponible } = asignarPresupuesto(
      [{ id: 1, monto: 40000 }, { id: 2, monto: 50000 }, { id: 3, monto: 30000 }],
      100000
    );
    expect(filas.map((f) => f.resultado)).toEqual([RESULTADO.APROBADA, RESULTADO.APROBADA, RESULTADO.ESPERA]);
    expect(filas.map((f) => f.restante)).toEqual([60000, 10000, 10000]);
    expect(comprometido).toBe(90000);
    expect(disponible).toBe(10000);
  });

  it("manda a lista de espera a la que no cabe y sigue con las que sí caben", () => {
    const { filas } = asignarPresupuesto(
      [{ id: 1, monto: 80000 }, { id: 2, monto: 50000 }, { id: 3, monto: 20000 }],
      100000
    );
    expect(filas.map((f) => f.resultado)).toEqual([RESULTADO.APROBADA, RESULTADO.ESPERA, RESULTADO.APROBADA]);
  });

  it("aprueba los apoyos en especie (monto 0) sin gastar presupuesto y marca las que no tienen monto", () => {
    const { filas, comprometido } = asignarPresupuesto(
      [{ id: 1, monto: 0 }, { id: 2, monto: "" }, { id: 3, monto: 10.1 }, { id: 4, monto: 10.2 }],
      20.3
    );
    expect(filas.map((f) => f.resultado)).toEqual([
      RESULTADO.APROBADA, RESULTADO.SIN_MONTO, RESULTADO.APROBADA, RESULTADO.APROBADA,
    ]);
    expect(comprometido).toBe(20.3); // sin errores de redondeo de decimales
  });

  it("sin techo presupuestal todo lo que cuesta queda en espera", () => {
    const { filas } = asignarPresupuesto([{ id: 1, monto: 5000 }], "");
    expect(filas[0].resultado).toBe(RESULTADO.ESPERA);
  });
});

describe("ordenCronologico y folioProyecto", () => {
  it("ordena por fecha de registro y luego por id", () => {
    const orden = ordenCronologico([
      { id: 3, registradaEl: "2026-11-02" },
      { id: 2, registradaEl: "2026-11-01" },
      { id: 1, registradaEl: "2026-11-02" },
    ]);
    expect(orden.map((s) => s.id)).toEqual([2, 1, 3]);
  });

  it("arma el folio de proyecto con consecutivo de tres dígitos", () => {
    expect(folioProyecto("PS", 2026, 7)).toBe("PS-2026-P007");
  });
});
