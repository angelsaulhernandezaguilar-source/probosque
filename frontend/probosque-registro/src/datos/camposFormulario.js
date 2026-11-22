import {
  CONCEPTOS,
  DELEGACIONES,
  PROGRAMAS,
  normalizarProgramaId,
} from "./catalogos";

const texto = (id, etiqueta, obligatorio = false, extra = {}) => ({
  id,
  etiqueta,
  tipo: "text",
  obligatorio,
  ...extra,
});

const numero = (id, etiqueta, obligatorio = false) => ({
  id,
  etiqueta,
  tipo: "number",
  obligatorio,
});

const lista = (id, etiqueta, opciones, obligatorio = false) => ({
  id,
  etiqueta,
  tipo: "select",
  obligatorio,
  opciones: opciones.map((opcion) =>
    typeof opcion === "string" ? { valor: opcion, etiqueta: opcion } : opcion
  ),
});

const archivo = (
  id,
  etiqueta,
  { multiple = false, accept = ".pdf,.doc,.docx", obligatorio = false, seccion } = {}
) => ({
  id,
  etiqueta,
  tipo: "file",
  obligatorio,
  multiple,
  accept,
  seccion,
});

const opcionesPersona = [
  "Propietario",
  "Poseedor",
  "Núcleo Agrario",
  "Sociedad",
  "Otro",
];

const gruposPrioritarios = [
  "Mujeres o grupo de mujeres",
  "Pueblos indígenas",
  "Comunidad afromexicana",
  "Personas con enfermedades crónico-degenerativas",
  "Víctimas u ofendidas del delito",
  "Personas repatriadas",
  "Mujeres cuidadoras de hijas e hijos menores",
  "Mujeres privadas de su libertad por resolución judicial",
  "Ninguno",
];

const documentosComunes = [
  {
    id: "identificacionOficial",
    etiqueta: "1. Identificación oficial vigente (y comprobante de domicilio si aplica)",
    obligatorio: true,
  },
  { id: "curp", etiqueta: "2. CURP actualizada", obligatorio: true },
  {
    id: "registroPersona",
    etiqueta: "3. FO-PB-502 Registro de Información de la persona solicitante o beneficiaria",
    obligatorio: true,
  },
  {
    id: "acreditaPropiedad",
    etiqueta: "4. Documento de propiedad o posesión del terreno",
    obligatorio: true,
  },
  {
    id: "actaIncorporacion",
    etiqueta: "5. Acta de asamblea de incorporación (solo ejidos y comunidades)",
  },
  {
    id: "actaRepresentantes",
    etiqueta: "6. Acta vigente de elección de representantes (solo ejidos y comunidades)",
  },
  {
    id: "actaConstitutiva",
    etiqueta: "7. Acta constitutiva (solo personas jurídicas colectivas)",
  },
  {
    id: "acreditacionRepresentante",
    etiqueta: "8. Acreditación vigente del representante legal (cuando aplique)",
  },
];

const camposComunes = () => [
  texto("foliosRefrendo", "Folios de refrendo o mantenimiento (2021-2024)"),
  lista("tipoPersona", "Tipo de persona solicitante", opcionesPersona, true),
  texto("otroTipoPersona", "Especifica otro tipo de persona"),
  texto("razonSocial", "Denominación o razón social"),
  texto("nombres", "Nombres de la persona solicitante o representante", true),
  texto("apellidos", "Primer apellido", true),
  texto("segundoApellido", "Segundo apellido"),
  texto("secretarioNombres", "Nombre(s) del secretario(a)"),
  texto("secretarioApellidos", "Apellidos del secretario(a)"),
  texto("tesoreroNombres", "Nombre(s) del tesorero(a)"),
  texto("tesoreroApellidos", "Apellidos del tesorero(a)"),
  texto("segundaPersonaNombres", "Nombre(s) de la segunda persona beneficiaria"),
  texto("segundaPersonaApellidos", "Apellidos de la segunda persona beneficiaria"),
  {
    id: "gruposPrioritarios",
    etiqueta: "Grupo prioritario al que pertenece la persona solicitante",
    tipo: "select",
    obligatorio: true,
    opciones: gruposPrioritarios.map((opcion) => ({ valor: opcion, etiqueta: opcion })),
  },
  texto("telefono", "Teléfono", true, { tipo: "tel" }),
  texto("correo", "Correo electrónico", true, { tipo: "email" }),
  texto("direccion", "Dirección", true),
  texto("Nombre_predio", "Nombre del predio (según documentación legal)", true),
  texto("Municipio_predio", "Municipio del predio", true),
  texto("Localidad_predio", "Población o localidad del predio", true),
  lista(
    "pmfVigente",
    "Predio con PMF vigente",
    ["Sí", "No", "Certificado"],
    true
  ),
  lista("delegacion", "Delegación regional", DELEGACIONES, true),
  texto("clabe", "CLABE interbancaria (18 dígitos)", true, {
    maxLength: 18,
    pattern: "\\d{18}",
  }),
  {
    id: "declaracionNoLitigio",
    etiqueta: "Declaro que el predio no tiene litigios ni condicionantes y que la información es verídica",
    tipo: "checkbox",
    obligatorio: true,
  },
];

const camposDocumentacion = (documentosEspecificos = []) => [
  archivo("validacionSig", "Validación de polígonos (SIG)", {
    accept: ".zip,.kml,.kmz,.geojson,.shp",
    obligatorio: true,
    seccion: "Documentos por presentar",
  }),
  ...documentosComunes.map((documento) =>
    archivo(documento.id, documento.etiqueta, {
      obligatorio: Boolean(documento.obligatorio),
      seccion: "Documentos por presentar",
    })
  ),
  ...documentosEspecificos.map((documento) =>
    archivo(documento.id, documento.etiqueta, {
      obligatorio: Boolean(documento.obligatorio),
      seccion: "Documentos por presentar",
    })
  ),
  {
    id: "observacionesDocumentos",
    etiqueta: "Observaciones a los documentos presentados",
    tipo: "textarea",
    obligatorio: false,
    seccion: "Documentos por presentar",
  },
];

const camposPlantaciones = [
  ...camposComunes(),
  lista(
    "concepto",
    "Concepto de apoyo",
    CONCEPTOS.map(({ id, nombre }) => ({ valor: id, etiqueta: nombre })),
    true
  ),
  numero("superficie", "Superficie del predio (hectáreas)", true),
  numero("superficieTotal", "Total de superficie a incorporar (ha)", true),
  numero("plantacionMaderable", "Plantación comercial maderable (ha)"),
  numero("plantacionNavidena", "Plantación comercial navideña (ha)"),
  numero("plantacionAgave", "Plantación comercial de agave (ha)"),
  numero("plantacionCelulosico", "Plantación comercial celulósica (ha)"),
  numero("plantacionDendroenergeticos", "Plantación comercial dendroenergética (ha)"),
  numero("plantacionFollaje", "Plantación comercial de follaje (ha)"),
  numero("plantacionBiocombustible", "Plantación comercial para biocombustible (ha)"),
  numero("plantacionOtros", "Otros tipos de plantación comercial (ha)"),
  numero("sistemasAgroforestales", "Sistemas agroforestales (ha)"),
  numero("mantenimientoComercial2022", "Mantenimiento de plantaciones comerciales 2022 (ha)"),
  numero("mantenimientoComercial2023", "Mantenimiento de plantaciones comerciales 2023 (ha)"),
  numero("mantenimientoComercial2024", "Mantenimiento de plantaciones comerciales 2024 (ha)"),
  numero("mantenimientoNavidenoAnio", "Año de establecimiento de plantación navideña"),
  numero("mantenimientoNavidenoSuperficie", "Superficie solicitada para mantenimiento navideño (ha)"),
  lista("beneficiadoOtroPrograma", "¿El predio recibe otro apoyo con el mismo propósito?", ["Sí", "No"]),
  texto("otroProgramaMismoProposito", "Indica el otro programa y lugar"),
  ...camposDocumentacion([
    {
      id: "registroPlantacion",
      etiqueta: "10. Registro o bitácora de plantación (cuando aplique)",
    },
  ]),
];

const camposServiciosAmbientales = [
  ...camposComunes(),
  numero("superficieConvocatoriaEstatal", "Superficie a incorporar a la convocatoria estatal (ha)", true),
  lista("fondosConcurrentesPSA", "¿Es beneficiario de fondos concurrentes PSA-CONAFOR?", ["Sí", "No"]),
  numero("anioConvenioPSA", "Año del convenio PSA-CONAFOR"),
  numero("superficieFondosPSA", "Superficie del convenio PSA-CONAFOR (ha)"),
  { id: "observacionesPrograma", etiqueta: "Observaciones", tipo: "textarea", obligatorio: false },
  ...camposDocumentacion([
    {
      id: "certificadoManejo",
      etiqueta: "11. Certificado del Manejo Forestal (PSAHEM, cuando aplique)",
    },
  ]),
];

const camposRestauracion = [
  ...camposComunes(),
  numero("superficieTotal", "Superficie total a incorporar (ha)", true),
  numero("restauracionIntegral", "Restauración forestal integral (ha)"),
  numero("bosquesAgua", "Bosques de Agua (ha)"),
  numero("preservacionReforestacion2022", "Preservación de reforestaciones establecidas en 2022 (ha)"),
  numero("preservacionReforestacion2023", "Preservación de reforestaciones establecidas en 2023 (ha)"),
  numero("preservacionReforestacion2024", "Preservación de reforestaciones establecidas en 2024 (ha)"),
  ...camposDocumentacion([
    {
      id: "proyectoTecnicoRestauracion",
      etiqueta: "9. Proyecto Técnico de Restauración Forestal Integral (cuando aplique)",
    },
  ]),
];

const camposCarbono = [
  ...camposComunes(),
  numero("superficieTotal", "Superficie total solicitada (ha)", true),
  numero("carbonMaderable", "Plantación forestal comercial maderable (ha)"),
  numero("carbonNavidena", "Plantación forestal comercial navideña (ha)"),
  numero("carbonReforestacion", "Reforestación (ha)"),
  ...camposDocumentacion([
    {
      id: "registroPlantacion",
      etiqueta: "10. Registro o bitácora de plantación (cuando aplique)",
    },
  ]),
];

export const FORMULARIOS_POR_PROGRAMA = {
  plantaciones: {
    nombre: "Solicitud Única - Plantaciones Sustentables",
    campos: camposPlantaciones,
  },
  "servicios-ambientales": {
    nombre: "Solicitud Única - Servicios Ambientales",
    campos: camposServiciosAmbientales,
  },
  restauracion: {
    nombre: "Solicitud Única - Restauración",
    campos: camposRestauracion,
  },
  "capturando-carbono": {
    nombre: "Solicitud Única - Capturando Carbono (Procarbono)",
    campos: camposCarbono,
  },
};

export const PROGRAMAS_CON_FORMULARIO = PROGRAMAS.filter(
  ({ id }) => FORMULARIOS_POR_PROGRAMA[id]
);

export function formularioDePrograma(programaId) {
  return FORMULARIOS_POR_PROGRAMA[normalizarProgramaId(programaId)] ?? null;
}

export function camposDeConvocatoria(convocatoria) {
  const formulario = formularioDePrograma(convocatoria?.programa);
  if (formulario) return formulario.campos;
  if (Array.isArray(convocatoria?.campos) && convocatoria.campos.length) {
    return convocatoria.campos;
  }
  return camposPlantaciones;
}

export function formatearRespuesta(campo, respuesta) {
  if (campo.tipo === "checkbox") {
    return respuesta === undefined || respuesta === null || respuesta === ""
      ? ""
      : respuesta
        ? "Sí"
        : "No";
  }

  const respuestas = Array.isArray(respuesta) ? respuesta : [respuesta];
  return respuestas
    .filter((valor) => valor !== undefined && valor !== null && valor !== "")
    .map((valor) => {
      const opcion = campo.opciones?.find((item) => item.valor === valor);
      return opcion?.etiqueta ?? String(valor);
    })
    .join(", ");
}
