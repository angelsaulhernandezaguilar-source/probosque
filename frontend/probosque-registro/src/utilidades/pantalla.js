// Ayudas de pantalla compartidas por las vistas.

// Mismo corte que PanelSolicitudes.css: debajo de 820 px la lista y el detalle van uno abajo del otro.
const PANTALLA_ANGOSTA = "(max-width: 820px)";

// En el celular el detalle de una solicitud aparece abajo de la lista y la persona no lo ve.
// Esta función baja la página hasta ese detalle, solo en pantallas angostas.
export function mostrarEnCelular(ref) {
  if (!window.matchMedia(PANTALLA_ANGOSTA).matches) return;
  // Se espera un cuadro para que React ya haya dibujado la solicitud elegida
  requestAnimationFrame(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
}
