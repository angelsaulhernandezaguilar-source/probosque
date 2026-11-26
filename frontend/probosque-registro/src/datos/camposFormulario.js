import {
  CONCEPTOS,
  DELEGACIONES,
  PROGRAMAS,
  normalizarProgramaId,
} from "./catalogos";

// Formularios de registro por programa.
// El orden y los textos siguen los formatos oficiales que están en docs/analisis:
//   FO-PB-501A Solicitud Única: PSAHEM, Restauración (REEF), Plantaciones y Capturando Carbono
//   FO-PB-501B Solicitud Única: Manejo Forestal Sustentable
//
// Cada campo es un objeto { id, etiqueta, tipo, obligatorio, seccion, subseccion, ancho, ... }.
// Dos propiedades hacen el "si aplica" de los formatos:
//   visibleSi(respuestas)   → el campo solo aparece cuando la función devuelve true
//   obligatorio             → true/false, o una función(respuestas) para "obligatorio solo si..."
// Un campo oculto no se valida ni se envía al servidor.

// ---------- Constructores de campos ----------

const texto = (id, etiqueta, obligatorio = false, extra = {}) => ({
  id,
  etiqueta,
  tipo: "text",
  obligatorio,
  ...extra,
});

const numero = (id, etiqueta, obligatorio = false, extra = {}) => ({
  id,
  etiqueta,
  tipo: "number",
  obligatorio,
  ...extra,
});

const lista = (id, etiqueta, opciones, obligatorio = false, extra = {}) => ({
  id,
  etiqueta,
  tipo: "select",
  obligatorio,
  opciones: opciones.map((opcion) =>
    typeof opcion === "string" ? { valor: opcion, etiqueta: opcion } : opcion
  ),
  ...extra,
});

// Opciones en línea, como los "( )" del formato impreso
const opcionUnica = (id, etiqueta, opciones, obligatorio = false, extra = {}) => ({
  ...lista(id, etiqueta, opciones, obligatorio, extra),
  tipo: "radio",
});

// Varias casillas; "exclusiva" es la opción que borra las demás (por ejemplo "Ninguno")
const grupoCasillas = (id, etiqueta, opciones, extra = {}) => ({
  id,
  etiqueta,
  tipo: "checkbox-group",
  obligatorio: false,
  opciones: opciones.map((opcion) => ({ valor: opcion, etiqueta: opcion })),
  ...extra,
});

const archivo = (id, etiqueta, extra = {}) => ({
  id,
  etiqueta,
  tipo: "file",
  obligatorio: false,
  multiple: false,
  accept: ".pdf,.doc,.docx,.jpg,.jpeg,.png",
  ancho: "completo",
  ...extra,
});

// ---------- Condiciones "si aplica" ----------

const marcada = (respuestas, campo, opcion) =>
  Array.isArray(respuestas[campo]) && respuestas[campo].includes(opcion);
const algunaMarcada = (respuestas, campo) =>
  Array.isArray(respuestas[campo]) && respuestas[campo].length > 0;
const mayorQueCero = (valor) => Number(valor) > 0;

const esNucleoAgrario = (r) => r.tipoPersona === "Núcleo Agrario";
const esSociedad = (r) => r.tipoPersona === "Sociedad";
const esPersonaColectiva = (r) => esNucleoAgrario(r) || esSociedad(r);
const tieneRepresentante = (r) => r.representanteLegal === "Sí";
const designaSegunda = (r) => r.designaSegundaPersona === "Sí";

// ---------- Secciones ----------

const SECCION_PERSONA = "I. Datos generales de la persona solicitante";
const SECCION_PREDIO = "II. Datos generales del predio";
const SECCION_PROGRAMA = "III. Programa a solicitar";
const SECCION_DOCUMENTOS = "IV. Documentación presentada";
const SECCION_DECLARATORIA = "Declaratoria de no litigio ni condicionante";

const TEXTO_DECLARATORIA =
  "Bajo protesta de decir verdad, manifiesto que el predio descrito en esta solicitud no presenta " +
  "problemas de litigio de cualquier índole, ni gravamen; que la documentación que se presenta no es " +
  "apócrifa o falsa; que no se cuenta con problemas de representación ni conflictos sociales, y que no " +
  "tiene como condicionante por parte de las autoridades en materia forestal la restauración de la " +
  "superficie que se propone, derivado de autorizaciones de aprovechamiento forestal, de cambio de uso " +
  "del suelo o de cualquier otro tipo, así como pago por servicios ambientales por concepto de captura " +
  "de carbono de otras dependencias gubernamentales o no gubernamentales.";

// Opciones de I.1 y 1.4 en cada formato (el 501B las redacta distinto)
const PERSONA_501A = ["Propietario", "Poseedor", "Núcleo Agrario", "Sociedad", "Otro"];
const PERSONA_501B = [
  "Propietario",
  { valor: "Poseedor", etiqueta: "Posesionario" },
  "Núcleo Agrario",
  "Sociedad",
  "Otro",
];

const GRUPOS_501A = [
  "Mujeres o grupo de mujeres",
  "Pueblos indígenas",
  "Comunidad afromexicana",
  "Con enfermedades crónico degenerativas",
  "Víctimas u ofendidas del delito",
  "Repatriadas",
  "Mujeres cuidadoras de hijas e hijos menores de edad, de mujeres privadas de su libertad por resolución judicial",
  "Ninguno",
];
const GRUPOS_501B = [
  "Grupos de mujeres y/o grupos indígenas",
  "Con enfermedades crónico degenerativas",
  "Víctimas u ofendidas del delito",
  "Repatriadas",
  "Mujeres cuidadoras de hijas e hijos menores de edad",
  "Mujeres privadas de su libertad por resolución judicial",
  "Comunidad y/o grupo de personas que se autoreconozcan como afromexicanos",
  "Ninguno",
];

// Una fila de la tabla I.3: nombre(s), primer apellido y segundo apellido en tercios
const filaNombre = (prefijo, subseccion, obligatorio, visibleSi) => {
  const extra = { seccion: SECCION_PERSONA, subseccion, ancho: "tercio", visibleSi };
  // La persona solicitante conserva los ids de siempre: Django los guarda en columnas propias
  const ids = prefijo
    ? [`${prefijo}Nombres`, `${prefijo}PrimerApellido`, `${prefijo}SegundoApellido`]
    : ["nombres", "apellidos", "segundoApellido"];
  return [
    texto(ids[0], "Nombre(s)", obligatorio, extra),
    texto(ids[1], "Primer apellido", obligatorio, extra),
    texto(ids[2], "Segundo apellido", false, extra),
  ];
};

// ---------- I. Persona solicitante (común a los dos formatos) ----------

const camposPersona = ({ opcionesPersona, grupos, segundaEnTabla }) => [
  opcionUnica("tipoPersona", "I.1 Tipo de persona solicitante", opcionesPersona, true, {
    seccion: SECCION_PERSONA,
    ancho: "completo",
  }),
  texto("otroTipoPersona", "Especifica el tipo de persona", true, {
    seccion: SECCION_PERSONA,
    visibleSi: (r) => r.tipoPersona === "Otro",
  }),
  // Si aplica: solo ejidos, comunidades, sociedades u "otro"
  texto("razonSocial", "I.2 Denominación o razón social", esPersonaColectiva, {
    seccion: SECCION_PERSONA,
    ancho: "completo",
    visibleSi: (r) => esPersonaColectiva(r) || r.tipoPersona === "Otro",
  }),

  // I.3 Tabla de nombres: el secretario y el tesorero solo existen en ejidos y comunidades
  ...filaNombre("", "I.3 Persona solicitante / Presidente(a)", true),
  ...filaNombre("secretario", "Secretario(a)", true, esNucleoAgrario),
  ...filaNombre("tesorero", "Tesorero(a)", true, esNucleoAgrario),

  opcionUnica("representanteLegal", "¿El trámite lo realiza un representante legal?", ["Sí", "No"], true, {
    seccion: SECCION_PERSONA,
    ancho: "completo",
  }),

  // En el 501A la segunda persona beneficiaria está en la tabla I.3; en el 501B, en la autorización
  ...(segundaEnTabla
    ? [
        opcionUnica("designaSegundaPersona", "¿Designa una segunda persona beneficiaria?", ["Sí", "No"], true, {
          seccion: SECCION_PERSONA,
          ancho: "completo",
        }),
        ...filaNombre("segundaPersona", "Segunda persona beneficiaria", true, designaSegunda),
      ]
    : []),

  grupoCasillas(
    "gruposPrioritarios",
    "1.4 ¿La persona solicitante forma parte de uno de estos grupos? De ser así, indica cuáles (puedes elegir varios):",
    grupos,
    { seccion: SECCION_PERSONA, obligatorio: true, exclusiva: "Ninguno", ancho: "completo" }
  ),

  // Datos que necesita el sistema para avisar del trámite y pagar el apoyo
  texto("telefono", "Teléfono", true, { tipo: "tel", seccion: SECCION_PERSONA, subseccion: "Datos de contacto" }),
  texto("correo", "Correo electrónico para recibir notificaciones", true, {
    tipo: "email",
    seccion: SECCION_PERSONA,
    subseccion: "Datos de contacto",
  }),
  texto("direccion", "Domicilio", true, { seccion: SECCION_PERSONA, subseccion: "Datos de contacto", ancho: "completo" }),
  texto("clabe", "CLABE interbancaria (18 dígitos) para recibir el apoyo", true, {
    seccion: SECCION_PERSONA,
    subseccion: "Datos de contacto",
    maxLength: 18,
    pattern: "\\d{18}",
  }),
];

// ---------- II. Predio ----------

const poligono = (extra = {}) =>
  archivo("validacionSig", "Polígono del predio georreferenciado (KML, KMZ, GeoJSON o Shapefile en .zip)", {
    accept: ".zip,.kml,.kmz,.geojson,.json",
    ...extra,
  });

const camposPredio501A = () => [
  texto("Nombre_predio", "Nombre del predio (con base en la documentación legal)", true, {
    seccion: SECCION_PREDIO,
    ancho: "completo",
  }),
  texto("Municipio_predio", "Municipio", true, { seccion: SECCION_PREDIO }),
  texto("Localidad_predio", "Población o localidad", true, { seccion: SECCION_PREDIO }),
  opcionUnica("pmfVigente", "Predio con PMF vigente", ["Sí", "No", "Certificado"], true, {
    seccion: SECCION_PREDIO,
  }),
  lista("delegacion", "Delegación Regional Forestal que corresponde al predio", DELEGACIONES, true, {
    seccion: SECCION_PREDIO,
  }),
  poligono({ seccion: SECCION_PREDIO, obligatorio: true }),
];

const camposPredio501B = () => [
  texto("Nombre_predio", "Nombre del predio o predios (con base en la documentación legal)", true, {
    seccion: SECCION_PREDIO,
    ancho: "completo",
  }),
  texto("Municipio_predio", "Municipio", true, { seccion: SECCION_PREDIO }),
  texto("Localidad_predio", "Población o localidad", true, { seccion: SECCION_PREDIO }),
  numero("superficiePredio", "Superficie total del predio o predios (ha)", true, { seccion: SECCION_PREDIO }),
  lista("delegacion", "Delegación Regional Forestal que corresponde al predio", DELEGACIONES, true, {
    seccion: SECCION_PREDIO,
  }),
];

// ---------- IV. Documentación ----------

const documento = (id, etiqueta, obligatorio, visibleSi, extra = {}) =>
  archivo(id, etiqueta, { seccion: SECCION_DOCUMENTOS, obligatorio, visibleSi, ...extra });

// Requisitos 1 a 8 del FO-PB-501A ("aplican para todos los programas", cada uno con su condición)
const documentos501A = () => [
  documento(
    "identificacionOficial",
    "1. Identificación oficial vigente con fotografía (si no trae domicilio, agrega comprobante de domicilio no mayor a tres meses)",
    true,
    undefined,
    { multiple: true }
  ),
  documento("curp", "2. Clave Única de Registro de Población (CURP) actualizada", true),
  documento("registroPersona", "3. FO-PB-502 Registro de Información de la persona solicitante y/o beneficiaria", true),
  documento("acreditaPropiedad", "4. Documento con el que acredita la legal propiedad o posesión del terreno", true),
  documento(
    "actaIncorporacion",
    "5. Acta de asamblea de incorporación a los Programas de PROBOSQUE, inscrita o presentada ante el RAN",
    true,
    esNucleoAgrario
  ),
  documento(
    "actaRepresentantes",
    "6. Acta de asamblea de elección vigente de los órganos de representación (o credenciales vigentes del RAN)",
    true,
    esNucleoAgrario
  ),
  documento(
    "actaConstitutiva",
    "7. Documento que acredite la legal constitución, protocolizado ante Notario Público, con facultades de administración",
    true,
    esSociedad
  ),
  documento(
    "acreditacionRepresentante",
    "8. Documento vigente que acredite la representación legal, con facultades de administración y/o dominio",
    true,
    tieneRepresentante
  ),
];

const observacionesDocumentos = {
  id: "observacionesDocumentos",
  etiqueta: "Observaciones a los documentos presentados",
  tipo: "textarea",
  obligatorio: false,
  seccion: SECCION_DOCUMENTOS,
  ancho: "completo",
};

const declaratoria = {
  id: "declaracionNoLitigio",
  etiqueta: "Acepto la declaratoria de no litigio ni condicionante",
  ayuda: TEXTO_DECLARATORIA,
  tipo: "checkbox",
  obligatorio: true,
  seccion: SECCION_DECLARATORIA,
  ancho: "completo",
};

// ---------- Refrendo (encabezado del FO-PB-501A) ----------

const camposRefrendo = () => [
  opcionUnica("esRefrendo", "¿Es refrendo o mantenimiento de un apoyo de años anteriores?", ["Sí", "No"], true, {
    seccion: "Refrendo",
    ancho: "completo",
  }),
  texto("foliosRefrendo", "Folios de refrendo o mantenimiento (2021, 2022, 2023, 2024)", true, {
    seccion: "Refrendo",
    ancho: "completo",
    visibleSi: (r) => r.esRefrendo === "Sí",
  }),
];

// Arma un formulario FO-PB-501A completo con la parte III del programa y sus documentos extra
const formulario501A = (camposPrograma, documentosPrograma = []) => [
  ...camposRefrendo(),
  ...camposPersona({ opcionesPersona: PERSONA_501A, grupos: GRUPOS_501A, segundaEnTabla: true }),
  ...camposPredio501A(),
  ...camposPrograma.map((campo) => ({ seccion: SECCION_PROGRAMA, ...campo })),
  ...documentos501A(),
  ...documentosPrograma,
  observacionesDocumentos,
  declaratoria,
];

// ---------- III. Programa a solicitar (FO-PB-501A) ----------

const SUB_PSA = "Pago por Servicios Ambientales Hidrológicos del Estado de México (PSAHEM)";
const camposServiciosAmbientales = formulario501A(
  [
    numero("superficieConvocatoriaEstatal", "Superficie a incorporar a la convocatoria estatal (ha)", true, {
      subseccion: SUB_PSA,
    }),
    opcionUnica("fondosConcurrentesPSA", "¿Es beneficiario de fondos concurrentes de PSA-CONAFOR?", ["Sí", "No"], true, {
      subseccion: SUB_PSA,
    }),
    numero("anioConvenioPSA", "Año de convenio", true, {
      subseccion: SUB_PSA,
      visibleSi: (r) => r.fondosConcurrentesPSA === "Sí",
    }),
    numero("superficieFondosPSA", "Superficie del convenio (ha)", true, {
      subseccion: SUB_PSA,
      visibleSi: (r) => r.fondosConcurrentesPSA === "Sí",
    }),
    { id: "observacionesPrograma", etiqueta: "Observaciones", tipo: "textarea", obligatorio: false, subseccion: SUB_PSA, ancho: "completo" },
  ],
  [
    // 11. Certificado del Manejo Forestal (PSAHEM): aplica si el predio está certificado
    documento("certificadoManejo", "11. Certificado del Manejo Forestal (PSAHEM)", true, (r) => r.pmfVigente === "Certificado"),
  ]
);

const SUB_REEF = "Restauración Ecológica de Ecosistemas Forestales (REEF)";
const SUB_REEF_CONCEPTOS = "Superficie por concepto";
const camposRestauracion = formulario501A(
  [
    numero("superficieTotal", "Superficie total a incorporar (ha)", true, { subseccion: SUB_REEF }),
    numero("restauracionIntegral", "Restauración forestal integral (ha)", false, { subseccion: SUB_REEF_CONCEPTOS }),
    numero("bosquesAgua", "Bosques de Agua (ha)", false, { subseccion: SUB_REEF_CONCEPTOS }),
    numero("preservacionReforestacion2022", "Preservación de reforestaciones 2022 (ha)", false, { subseccion: SUB_REEF_CONCEPTOS, ancho: "tercio" }),
    numero("preservacionReforestacion2023", "Preservación de reforestaciones 2023 (ha)", false, { subseccion: SUB_REEF_CONCEPTOS, ancho: "tercio" }),
    numero("preservacionReforestacion2024", "Preservación de reforestaciones 2024 (ha)", false, { subseccion: SUB_REEF_CONCEPTOS, ancho: "tercio" }),
  ],
  [
    // 9. Aplica solo si se pide superficie de restauración forestal integral
    documento(
      "proyectoTecnicoRestauracion",
      "9. Proyecto Técnico de Restauración Forestal Integral (físico o digital)",
      true,
      (r) => mayorQueCero(r.restauracionIntegral)
    ),
  ]
);

const SUB_PLANT = "Plantaciones Sustentables";
const SUB_PLANT_1 = "1. Plantación Forestal Comercial Maderable y No Maderable";
const SUB_PLANT_3 = "3. Mantenimiento de Plantaciones Forestales Comerciales";
const SUB_PLANT_4 = "4. Mantenimiento de Plantaciones Navideñas";
const conceptoEs = (id) => (r) => r.concepto === id;
const hectareasPlantacion = [
  ["plantacionMaderable", "Maderable"],
  ["plantacionNavidena", "Navideño"],
  ["plantacionAgave", "Agave"],
  ["plantacionCelulosico", "Celulósico"],
  ["plantacionDendroenergeticos", "Dendroenergéticos"],
  ["plantacionFollaje", "Follaje"],
  ["plantacionBiocombustible", "Biocombustible"],
  ["plantacionOtros", "Otros"],
].map(([id, nombre]) =>
  numero(id, `${nombre} (ha)`, false, { subseccion: SUB_PLANT_1, ancho: "tercio", visibleSi: conceptoEs("plantacion") })
);

const camposPlantaciones = formulario501A(
  [
    lista(
      "concepto",
      "Concepto de apoyo",
      CONCEPTOS.map(({ id, nombre }) => ({ valor: id, etiqueta: nombre })),
      true,
      { subseccion: SUB_PLANT }
    ),
    numero("superficie", "Superficie solicitada para el concepto (ha)", true, { subseccion: SUB_PLANT }),
    numero("superficieTotal", "Total de superficie a incorporar (ha)", true, { subseccion: SUB_PLANT }),
    ...hectareasPlantacion,
    numero("sistemasAgroforestales", "2. Sistemas Agroforestales (ha)", false, {
      subseccion: SUB_PLANT_1,
      visibleSi: conceptoEs("plantacion"),
    }),
    ...[2022, 2023, 2024].map((anio) =>
      numero(`mantenimientoComercial${anio}`, `Superficie ${anio} (ha)`, false, {
        subseccion: SUB_PLANT_3,
        ancho: "tercio",
        visibleSi: conceptoEs("mantenimiento"),
      })
    ),
    numero("mantenimientoNavidenoAnio", "Año de establecimiento", true, {
      subseccion: SUB_PLANT_4,
      visibleSi: conceptoEs("navideno"),
    }),
    numero("mantenimientoNavidenoSuperficie", "Superficie solicitada (ha)", true, {
      subseccion: SUB_PLANT_4,
      visibleSi: conceptoEs("navideno"),
    }),
    opcionUnica("beneficiadoOtroPrograma", "¿El predio recibe otro apoyo con el mismo propósito?", ["Sí", "No"], true, {
      subseccion: "Otros apoyos",
    }),
    texto("otroProgramaMismoProposito", "Indica el otro programa y lugar", true, {
      subseccion: "Otros apoyos",
      visibleSi: (r) => r.beneficiadoOtroPrograma === "Sí",
    }),
  ],
  [
    // 10. Registro de plantación: aplica al Mantenimiento de Plantaciones Navideñas
    documento(
      "registroPlantacion",
      "10. Registro de plantación o comprobante de trámite (registro o bitácora), si cuenta con él",
      false,
      conceptoEs("navideno")
    ),
  ]
);

const SUB_CC = "Capturando Carbono";
const SUB_CC_TIPO = "Superficie por tipo";
const camposCarbono = formulario501A(
  [
    numero("superficieTotal", "Superficie total solicitada (ha)", true, { subseccion: SUB_CC }),
    numero("carbonMaderable", "Plantación Forestal Comercial: Maderable (ha)", false, { subseccion: SUB_CC_TIPO, ancho: "tercio" }),
    numero("carbonNavidena", "Plantación Forestal Comercial: Navideña (ha)", false, { subseccion: SUB_CC_TIPO, ancho: "tercio" }),
    numero("carbonReforestacion", "Reforestación (ha)", false, { subseccion: SUB_CC_TIPO, ancho: "tercio" }),
  ],
  [
    documento(
      "registroPlantacion",
      "10. Registro de plantación o comprobante de trámite (registro o bitácora), si cuenta con él",
      false
    ),
  ]
);

// ---------- FO-PB-501B · Manejo Forestal Sustentable ----------

const SUB_ETF = "a) Estudios técnicos forestales (ETF)";
const SUB_PSF = "Datos del Prestador de Servicios Forestales propuesto";
const SUB_FSC = "b) Certificación internacional FSC";
const ETF = {
  maderable: "Maderable",
  noMaderable: "No Maderable",
  pmf: "PMF Combinado",
  uma: "Unidades para la Conservación de la Vida Silvestre maderables (UMA)",
  dtu: "Documento Técnico Unificado (DTU)",
  preventivo: "Informe preventivo",
};
const FSC = {
  manejo: "Certificación para Manejo Forestal (de forma Grupal)",
  custodia: "Certificación para la Cadena de Custodia FSC",
  mantManejo: "Mantenimiento a la Certificación de manejo forestal en forma grupal",
  mantCustodia: "Mantenimiento a la Certificación para la Cadena de Custodia",
  servicios: "Declaración de servicios ecosistémicos",
};
const pideEtf = (opcion) => (r) => marcada(r, "estudiosTecnicos", opcion);
const pideFsc = (opcion) => (r) => marcada(r, "certificacionesFsc", opcion);
const pideAlgunEtf = (r) => algunaMarcada(r, "estudiosTecnicos");
// Hay que elegir al menos un estudio técnico o una certificación
const sinEtfNiFsc = (r) => !algunaMarcada(r, "estudiosTecnicos") && !algunaMarcada(r, "certificacionesFsc");

const camposManejoForestal = [
  ...camposPersona({ opcionesPersona: PERSONA_501B, grupos: GRUPOS_501B, segundaEnTabla: false }),
  ...camposPredio501B(),

  grupoCasillas("estudiosTecnicos", "Estudios técnicos forestales que solicita", Object.values(ETF), {
    seccion: SECCION_PROGRAMA,
    subseccion: SUB_ETF,
    ancho: "completo",
    obligatorio: sinEtfNiFsc,
  }),
  texto("recursosNoMaderables", "Recursos a aprovechar (Maderable / No Maderable)", true, {
    seccion: SECCION_PROGRAMA,
    subseccion: SUB_ETF,
    ancho: "completo",
    visibleSi: (r) => pideEtf(ETF.maderable)(r) || pideEtf(ETF.noMaderable)(r),
  }),
  texto("recursosPmfCombinado", "Recursos a aprovechar no maderables (PMF Combinado)", true, {
    seccion: SECCION_PROGRAMA,
    subseccion: SUB_ETF,
    ancho: "completo",
    visibleSi: pideEtf(ETF.pmf),
  }),
  texto("recursosUma", "Recursos a aprovechar (UMA)", true, {
    seccion: SECCION_PROGRAMA,
    subseccion: SUB_ETF,
    ancho: "completo",
    visibleSi: pideEtf(ETF.uma),
  }),
  texto("recursosInformePreventivo", "Recursos a aprovechar (DTU / Informe preventivo)", true, {
    seccion: SECCION_PROGRAMA,
    subseccion: SUB_ETF,
    ancho: "completo",
    visibleSi: (r) => pideEtf(ETF.dtu)(r) || pideEtf(ETF.preventivo)(r),
  }),

  // El prestador de servicios forestales elabora los estudios: aplica solo si pide algún ETF
  ...[
    texto("prestadorNombre", "Nombre", true, { ancho: "completo" }),
    texto("registroForestalLibro", "Registro Forestal Nacional: Libro", true, { ancho: "tercio" }),
    texto("registroForestalTipo", "Tipo", true, { ancho: "tercio" }),
    texto("registroForestalVolumen", "Volumen", true, { ancho: "tercio" }),
    texto("registroForestalNumero", "Número", true, { ancho: "tercio" }),
    numero("registroForestalAnio", "Año", true, { ancho: "tercio" }),
    texto("prestadorDomicilio", "Domicilio", true, { ancho: "completo" }),
    texto("prestadorTelefono", "Teléfono", true, { tipo: "tel" }),
    texto("prestadorCorreo", "Correo electrónico", true, { tipo: "email" }),
  ].map((campo) => ({ ...campo, seccion: SECCION_PROGRAMA, subseccion: SUB_PSF, visibleSi: pideAlgunEtf })),

  grupoCasillas("certificacionesFsc", "Certificaciones que solicita", Object.values(FSC), {
    seccion: SECCION_PROGRAMA,
    subseccion: SUB_FSC,
    ancho: "completo",
    obligatorio: sinEtfNiFsc,
  }),

  // IV. Documentación del FO-PB-501B (numeración del formato)
  documento(
    "identificacionOficial",
    "1. Identificación oficial vigente legible (si no trae domicilio, agrega comprobante de domicilio)",
    true,
    undefined,
    { multiple: true }
  ),
  documento("curp", "2. Clave Única de Registro de Población (CURP) actualizada", true),
  documento("acreditaPropiedad", "3. Documento con el que acredita la legal propiedad o posesión del terreno", true),
  documento(
    "actaRepresentantes",
    "4. Acta de asamblea de elección de los órganos de representación (o credenciales emitidas por el RAN)",
    true,
    esNucleoAgrario
  ),
  documento(
    "actaIncorporacion",
    "5. Acta de asamblea de incorporación a los Programas de PROBOSQUE, inscrita o presentada ante el RAN",
    true,
    esNucleoAgrario
  ),
  documento(
    "actaConstitutiva",
    "6. Documento que acredite la legal constitución y facultades de administración (personas jurídico colectivas)",
    true,
    esSociedad
  ),
  documento(
    "acreditacionRepresentante",
    "7. Documento que acredite la representación legal, emitido por Notario Público y protocolizado",
    true,
    tieneRepresentante
  ),
  // 8. El polígono es requisito de los Estudios Técnicos Forestales
  poligono({
    etiqueta: "8. Polígono(s) donde se propone realizar el estudio, georreferenciados (Shapefile en .zip, KML o GeoJSON)",
    seccion: SECCION_DOCUMENTOS,
    obligatorio: true,
    visibleSi: pideAlgunEtf,
  }),
  documento(
    "oficioAprovechamiento",
    "9. Oficio de Autorización del aprovechamiento de Recursos Forestales Maderables (PMF o DTU)",
    true,
    (r) => pideFsc(FSC.manejo)(r) || pideFsc(FSC.custodia)(r)
  ),
  documento(
    "autorizacionAlmacenamiento",
    "10 a) Autorización de funcionamiento del centro de almacenamiento (SEMARNAT) o código de cuantificación",
    true,
    pideFsc(FSC.custodia)
  ),
  documento(
    "cartaAbastecimiento",
    "10 b) Carta de abastecimiento de la materia prima (solo si se abastece de otros predios)",
    false,
    pideFsc(FSC.custodia)
  ),
  documento(
    "croquisIndustria",
    "10 d) / 12. Croquis de localización con coordenadas UTM de la industria",
    true,
    (r) => pideFsc(FSC.custodia)(r) || pideFsc(FSC.mantCustodia)(r)
  ),
  documento("certificadoManejo", "11. Copia del certificado de manejo forestal", true, pideFsc(FSC.mantManejo)),
  documento("certificadoCustodia", "12. Copia del certificado de la Cadena de Custodia", true, pideFsc(FSC.mantCustodia)),
  documento("certificadoFscPredio", "13. Copia del certificado internacional FSC del predio", true, pideFsc(FSC.servicios)),

  // Autorización del FO-PB-501B: segunda persona beneficiaria (si aplica)
  opcionUnica("designaSegundaPersona", "¿Designa una segunda persona beneficiaria?", ["Sí", "No"], true, {
    seccion: "Autorización",
    ancho: "completo",
  }),
  texto("segundaPersonaNombres", "Nombre completo de la segunda persona beneficiaria", true, {
    seccion: "Autorización",
    visibleSi: designaSegunda,
  }),
  texto("segundaPersonaDomicilio", "Domicilio de la segunda persona beneficiaria", true, {
    seccion: "Autorización",
    visibleSi: designaSegunda,
  }),
  observacionesDocumentos,
  declaratoria,
];

// ---------- Catálogo y utilidades ----------

export const FORMULARIOS_POR_PROGRAMA = {
  plantaciones: {
    nombre: "FO-PB-501A Solicitud Única - Plantaciones Sustentables",
    campos: camposPlantaciones,
  },
  "servicios-ambientales": {
    nombre: "FO-PB-501A Solicitud Única - Pago por Servicios Ambientales Hidrológicos",
    campos: camposServiciosAmbientales,
  },
  restauracion: {
    nombre: "FO-PB-501A Solicitud Única - Restauración Ecológica de Ecosistemas Forestales",
    campos: camposRestauracion,
  },
  "capturando-carbono": {
    nombre: "FO-PB-501A Solicitud Única - Capturando Carbono (Procarbono)",
    campos: camposCarbono,
  },
  "manejo-forestal": {
    nombre: "FO-PB-501B Solicitud Única - Manejo Forestal Sustentable",
    campos: camposManejoForestal,
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

// "Si aplica": ¿se muestra este campo con lo que la persona ya contestó?
export function campoVisible(campo, respuestas = {}) {
  return typeof campo.visibleSi === "function" ? Boolean(campo.visibleSi(respuestas)) : true;
}

// ¿Es obligatorio en este momento? (solo cuenta si además está visible)
export function campoObligatorio(campo, respuestas = {}) {
  if (!campoVisible(campo, respuestas)) return false;
  return typeof campo.obligatorio === "function"
    ? Boolean(campo.obligatorio(respuestas))
    : Boolean(campo.obligatorio);
}

// Etiqueta con su subsección, para leerla fuera del formulario: "Secretario(a) · Nombre(s)"
export const etiquetaCompleta = (campo) =>
  campo.subseccion ? `${campo.subseccion} · ${campo.etiqueta}` : campo.etiqueta;

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
