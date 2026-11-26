import { DELEGACIONES } from "./catalogos";

// Roles del sistema y qué pantallas ve cada uno.
// La barra de navegación y las rutas protegidas salen de aquí: para dar o quitar
// una pantalla a un rol solo se cambia esta tabla.

export const ROLES = {
  SOLICITANTE: "solicitante",
  DIRECCION: "direccion",
  DELEGACION: "delegacion",
  JURIDICO: "juridico",
  COMITE: "comite",
};

export const NOMBRE_ROL = {
  [ROLES.SOLICITANTE]: "Persona solicitante",
  [ROLES.DIRECCION]: "Dirección General",
  [ROLES.DELEGACION]: "Delegación Regional Forestal",
  [ROLES.JURIDICO]: "Unidad Jurídica",
  [ROLES.COMITE]: "Instancia Ejecutora / Comité",
};

// Pantalla a la que llega cada rol al iniciar sesión
export const INICIO_DE_ROL = {
  [ROLES.SOLICITANTE]: "/estatus",
  [ROLES.DIRECCION]: "/publicar",
  [ROLES.DELEGACION]: "/recepcion",
  [ROLES.JURIDICO]: "/dictamenes",
  [ROLES.COMITE]: "/listados",
};

// Secciones de la barra. "roles" vacío = la ve todo el mundo, con o sin sesión.
export const SECCIONES = [
  { a: "/", texto: "Convocatorias", roles: [] },
  { a: "/estatus", texto: "Mis solicitudes", roles: [ROLES.SOLICITANTE] },
  { a: "/publicar", texto: "Publicar", roles: [ROLES.DIRECCION] },
  { a: "/recepcion", texto: "Recepción", roles: [ROLES.DELEGACION] },
  { a: "/dictamenes", texto: "Dictámenes", roles: [ROLES.JURIDICO] },
  { a: "/listados", texto: "Listados", roles: [ROLES.COMITE] },
];

export const seccionesDe = (usuario) =>
  SECCIONES.filter((s) => s.roles.length === 0 || (usuario && s.roles.includes(usuario.rol)));

// ---------- Cuentas de demostración ----------
// El backend todavía no tiene autenticación (decisión del equipo: DRF sin login).
// Mientras tanto el personal de PROBOSQUE entra con estas cuentas fijas; cuando exista
// /api/login/ solo cambia src/estado/Sesion.jsx.

export const CLAVE_DEMO = "probosque2026";

const aCorreo = (texto) => texto.toLowerCase().replace(/\s+/g, ".");

export const CUENTAS_DEMO = [
  { correo: "direccion@probosque.test", nombre: "Dirección General", rol: ROLES.DIRECCION },
  // Una cuenta por delegación: cada una solo ve los expedientes de sus municipios
  ...DELEGACIONES.map((delegacion) => ({
    correo: `delegacion.${aCorreo(delegacion)}@probosque.test`,
    nombre: `Ventanilla ${delegacion}`,
    rol: ROLES.DELEGACION,
    delegacion,
  })),
  { correo: "juridico@probosque.test", nombre: "Unidad Jurídica", rol: ROLES.JURIDICO },
  { correo: "comite@probosque.test", nombre: "Comité de Admisión", rol: ROLES.COMITE },
];

// "Delegación Regional Forestal · Toluca"
export const descripcionDeUsuario = (usuario) =>
  usuario.delegacion ? `${NOMBRE_ROL[usuario.rol]} · ${usuario.delegacion}` : NOMBRE_ROL[usuario.rol];
