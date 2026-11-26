// Listados del Comité (HU-2.5-01) guardados en este navegador.
// El backend todavía no tiene el modelo ListadoSolicitud ni PresupuestoEjercicio: cuando exista
// /api/listados/ estas dos funciones se cambian por llamadas a la API (como en Almacen.jsx).

const LLAVE = "probosque.listados";

const leerTodos = () => {
  try {
    return JSON.parse(localStorage.getItem(LLAVE)) ?? {};
  } catch {
    return {};
  }
};

// { techo, montos: { [idSolicitud]: monto }, aprobadoEl, filas: [...] } de una convocatoria
export const leerListado = (convocatoriaId) => leerTodos()[convocatoriaId] ?? { techo: "", montos: {} };

export function guardarListado(convocatoriaId, listado) {
  localStorage.setItem(LLAVE, JSON.stringify({ ...leerTodos(), [convocatoriaId]: listado }));
}
