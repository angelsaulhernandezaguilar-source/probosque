// Catálogos tomados del análisis de las Reglas de Operación 2026.

export const PROGRAMAS = [
  { id: "plantaciones", siglas: "PS", nombre: "Plantaciones Sustentables" },
  { id: "restauracion", siglas: "RHF", nombre: "Restauración Hidrológico-Forestal" },
  { id: "servicios-ambientales", siglas: "PSAH", nombre: "Pago por Servicios Ambientales Hidrológicos" },
  { id: "manejo-forestal", siglas: "MFS", nombre: "Manejo Forestal Sustentable" },
  { id: "capturando-carbono", siglas: "CC", nombre: "Capturando Carbono" },
  { id: "guardabosques", siglas: "PEG", nombre: "Guardabosques" }, // misma clave que en Django (registro_programa)
];

export const DELEGACIONES = [
  "Toluca",
  "Naucalpan",
  "Texcoco",
  "Tejupilco",
  "Atlacomulco",
  "Coatepec Harinas",
  "Valle de Bravo",
  "Amecameca",
  "Jilotepec",
];

export const TIPO_PERSONA = [
  "Propietario",
  "Nucleo agrario",
  "Poseedor",
  "Sociedad",
];
// Conceptos de apoyo de Plantaciones Sustentables 2026
export const CONCEPTOS = [
  {
    id: "plantacion",
    nombre: "I. Plantación maderable / no maderable",
    montoPorHa: 10000,
    minHa: 1,
    maxHa: 150,
    nota: "$10,000/ha en dos ministraciones (70% y 30%).",
  },
  {
    id: "mantenimiento",
    nombre: "II. Mantenimiento de plantaciones",
    montoPorHa: 5000,
    minHa: 0.5,
    maxHa: 150,
    nota: "$5,000/ha (sobrevivencia mínima del 50%).",
  },
  {
    id: "navideno",
    nombre: "III. Mantenimiento navideño",
    montoPorHa: 0,
    minHa: 0.5,
    maxHa: null,
    nota: "Sin recurso económico: hasta 1,250 piezas de planta.",
  },
];

// Estados por los que pasa una solicitud en el alcance de este prototipo
export const ESTADOS = {
  RECIBIDA: "RECIBIDA",
  SUBSANACION: "SUBSANACION",
  EN_DICTAMEN: "EN_DICTAMEN",
  JURIDICO_FAVORABLE: "JURIDICO_FAVORABLE",
  NO_FACTIBLE: "NO_FACTIBLE",
};

export const ETIQUETA_ESTADO = {
  RECIBIDA: "Recibida en la delegación (en cotejo de documentos)",
  SUBSANACION: "Documentación incompleta: en plazo para subsanar",
  EN_DICTAMEN: "Documentación completa: en dictamen jurídico",
  JURIDICO_FAVORABLE: "Dictamen jurídico favorable",
  NO_FACTIBLE: "Dictamen jurídico desfavorable: no factible",
};

// Texto corto para las píldoras de las bandejas (Recepción, Dictámenes, Mis solicitudes)
export const ESTADO_CORTO = {
  RECIBIDA: "Por cotejar",
  SUBSANACION: "En subsanación",
  EN_DICTAMEN: "En dictamen jurídico",
  JURIDICO_FAVORABLE: "Jurídico favorable",
  NO_FACTIBLE: "No factible",
};

// Clase de color de la píldora según el estado ("" = verde normal)
export const TONO_ESTADO = {
  RECIBIDA: "app-etiqueta--proxima",
  SUBSANACION: "app-etiqueta--alerta",
  NO_FACTIBLE: "app-etiqueta--negativa",
};

export const siglasPrograma = (id) =>
  PROGRAMAS.find((p) => p.id === normalizarProgramaId(id))?.siglas ?? "";

export const normalizarProgramaId = (id) =>
  id === "Procarbono" ? "capturando-carbono" : id;

export const nombrePrograma = (id) =>
  PROGRAMAS.find((p) => p.id === normalizarProgramaId(id))?.nombre ?? id;

export const nombreConcepto = (id) =>
  CONCEPTOS.find((c) => c.id === id)?.nombre ?? "No aplica";
