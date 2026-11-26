// HU-2.5-01 · Consolidación y aprobación de listados.
// La Instancia Ejecutora arma el listado preliminar con las solicitudes dictaminadas y el Comité
// lo aprueba según la suficiencia presupuestal. Aquí solo están las cuentas; la pantalla es vistas/Listados.jsx.

export const RESULTADO = {
  APROBADA: "APROBADA", // alcanza el presupuesto
  ESPERA: "ESPERA", // cumple, pero ya no hay suficiencia presupuestal (lista de espera)
  SIN_MONTO: "SIN_MONTO", // falta capturar el monto del apoyo: todavía no se puede asignar
};

export const ETIQUETA_RESULTADO = {
  [RESULTADO.APROBADA]: "Aprobada",
  [RESULTADO.ESPERA]: "En espera",
  [RESULTADO.SIN_MONTO]: "Falta el monto",
};

const centavos = (monto) => Math.round(Number(monto) * 100);

// Las solicitudes se atienden conforme se fueron recibiendo (RO: "la dictaminación se realizará
// conforme se vayan recibiendo"): primero la fecha de registro y, si empatan, el id.
export function ordenCronologico(solicitudes) {
  return [...solicitudes].sort(
    (a, b) => String(a.registradaEl).localeCompare(String(b.registradaEl)) || a.id - b.id
  );
}

// Recorre la lista en orden y va restando del techo presupuestal.
//   solicitudes: [{ id, monto }] ya ordenadas. monto en pesos; 0 = apoyo en especie (solo planta).
//   techo: presupuesto autorizado en pesos.
// Cada solicitud que cabe en lo que queda se aprueba y descuenta su monto; la que no cabe pasa a
// lista de espera y se sigue con la siguiente, para no dejar presupuesto sin usar.
// Devuelve { filas: [{ ...solicitud, resultado, restante }], comprometido, disponible }.
export function asignarPresupuesto(solicitudes, techo) {
  let restante = Math.max(0, centavos(techo) || 0);
  const total = restante;
  const filas = solicitudes.map((solicitud) => {
    const sinMonto = solicitud.monto === "" || solicitud.monto === null || solicitud.monto === undefined;
    const monto = centavos(solicitud.monto);
    let resultado;
    if (sinMonto || Number.isNaN(monto) || monto < 0) resultado = RESULTADO.SIN_MONTO;
    else if (monto <= restante) {
      resultado = RESULTADO.APROBADA;
      restante -= monto;
    } else resultado = RESULTADO.ESPERA;
    return { ...solicitud, resultado, restante: restante / 100 };
  });
  return { filas, comprometido: (total - restante) / 100, disponible: restante / 100 };
}

// Folio de proyecto de las solicitudes aprobadas: PS-2026-P001, PS-2026-P002...
export const folioProyecto = (siglas, ejercicio, consecutivo) =>
  `${siglas}-${ejercicio}-P${String(consecutivo).padStart(3, "0")}`;
