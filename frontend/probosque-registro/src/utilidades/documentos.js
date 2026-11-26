import { nombrePrograma } from "../datos/catalogos";
import { campoVisible, formularioDePrograma } from "../datos/camposFormulario";
import { fechaLarga } from "./reglas";

// Documentos oficiales que genera el sistema: el acuse de recepción y el dictamen jurídico.
// Cada función arma un "modelo" (título, secciones, firmas) con puro texto. Ese mismo modelo
// se dibuja en pantalla (componentes/DocumentoOficial.jsx) y se convierte en PDF (utilidades/pdf.js),
// así lo que se ve y lo que se descarga siempre dicen lo mismo.
//
// Modelo: { archivo, titulo, subtitulo, folio, fecha, secciones: [{ titulo, filas, lista, parrafos }], firmas, pie }

const nombreDe = (r, prefijo) =>
  (prefijo
    ? [r[`${prefijo}Nombres`], r[`${prefijo}PrimerApellido`], r[`${prefijo}SegundoApellido`]]
    : [r.nombres, r.apellidos, r.segundoApellido]
  )
    .filter(Boolean)
    .join(" ");

// La segunda persona beneficiaria: en núcleos agrarios es el secretario(a) o tesorero(a) elegido
export function segundaPersonaDe(r) {
  if (r.segundaPersonaCargo) {
    const prefijo = r.segundaPersonaCargo.startsWith("Secretario") ? "secretario" : "tesorero";
    return [nombreDe(r, prefijo), r.segundaPersonaCargo].filter(Boolean).join(" · ");
  }
  return nombreDe(r, "segundaPersona");
}

// Quita las filas sin valor para no imprimir renglones vacíos
const filas = (pares) => pares.filter(([, valor]) => valor !== undefined && valor !== null && valor !== "");

const seccionExpediente = (solicitud, convocatoria) => {
  const r = solicitud.respuestas;
  return [
    {
      titulo: "Persona solicitante",
      filas: filas([
        ["Nombre", nombreDe(r)],
        ["Tipo de persona", r.tipoPersona],
        ["Denominación o razón social", r.razonSocial],
        ["Segunda persona beneficiaria", segundaPersonaDe(r)],
        ["Correo para notificaciones", r.correo],
        ["Teléfono", r.telefono],
      ]),
    },
    {
      titulo: "Predio",
      filas: filas([
        ["Programa", convocatoria ? nombrePrograma(convocatoria.programa) : ""],
        ["Nombre del predio", r.Nombre_predio],
        ["Municipio", r.Municipio_predio],
        ["Población o localidad", r.Localidad_predio],
        ["Delegación Regional Forestal", r.delegacion],
        ["Polígono georreferenciado", solicitud.poligono ? "Cargado y validado" : "Sin polígono"],
      ]),
    },
  ];
};

// Documentos del expediente con la etiqueta del requisito: "2. CURP actualizada: curp.pdf"
function documentosPresentados(solicitud, campos) {
  const r = solicitud.respuestas;
  return campos
    .filter((campo) => campo.tipo === "file" && campoVisible(campo, r))
    .map((campo) => {
      const archivos = solicitud.documentos.filter((d) => d.tipo === campo.id).map((d) => d.nombre);
      return archivos.length ? `${campo.etiqueta}: ${archivos.join(", ")}` : null;
    })
    .filter(Boolean);
}

// ---------- Acuse de recepción (comprobante del FO-PB-501) ----------

export function acuseDe({ solicitud, convocatoria, campos }) {
  const r = solicitud.respuestas;
  const formato = formularioDePrograma(convocatoria?.programa)?.nombre ?? "Solicitud Única";
  return {
    archivo: `Acuse_${solicitud.folio}.pdf`,
    titulo: "Acuse de recepción de solicitud",
    subtitulo: `Comprobante de recepción de solicitud y documentos · ${formato}`,
    folio: solicitud.folio,
    fecha: fechaLarga(solicitud.registradaEl),
    secciones: [
      {
        titulo: "Solicitud",
        filas: filas([
          ["Folio", solicitud.folio],
          ["Fecha de recepción", fechaLarga(solicitud.registradaEl)],
          ["Tipo de trámite", r.esRefrendo === "Sí" ? "Refrendo" : "Solicitud nueva"],
          ["Folios de refrendo", r.esRefrendo === "Sí" ? r.foliosRefrendo : ""],
        ]),
      },
      ...seccionExpediente(solicitud, convocatoria),
      { titulo: "Documentación presentada", lista: documentosPresentados(solicitud, campos) },
      {
        titulo: "Plazos del trámite",
        parrafos: [
          `La Delegación Regional Forestal ${r.delegacion ?? ""} cotejará la documentación. Si falta algún ` +
            `documento se te avisará a más tardar el ${fechaLarga(solicitud.limiteAvisoFaltantes)} ` +
            "(10 días naturales) y tendrás 5 días hábiles para subsanar.",
          `Los dictámenes técnico y jurídico se liberarán a más tardar el ${fechaLarga(solicitud.fechaLimiteDictamen)} ` +
            "(45 días hábiles contados desde la recepción). Después la solicitud pasa al Comité, que aprueba " +
            "los listados según la suficiencia presupuestal.",
          "Consulta el avance en el portal, en “Mis solicitudes”, con este folio.",
        ],
      },
    ],
    firmas: ["Persona solicitante", `Recibió · Delegación Regional Forestal ${r.delegacion ?? ""}`.trim()],
    pie: "Este acuse comprueba la recepción de la solicitud y sus documentos; no implica la aprobación del apoyo.",
  };
}

// ---------- Dictamen jurídico (HU-2.4-01) ----------

export function dictamenDe({ solicitud, convocatoria, campos, dictamen }) {
  const favorable = dictamen.resultado === "FAVORABLE";
  return {
    archivo: `Dictamen_juridico_${solicitud.folio}.pdf`,
    titulo: "Dictamen jurídico",
    subtitulo: "Unidad Jurídica, de Igualdad de Género y Erradicación de la Violencia",
    folio: solicitud.folio,
    fecha: fechaLarga(dictamen.fecha),
    secciones: [
      {
        titulo: "Expediente",
        filas: filas([
          ["Folio del expediente", solicitud.folio],
          ["Fecha de recepción", fechaLarga(solicitud.registradaEl)],
          ["Fecha del dictamen", fechaLarga(dictamen.fecha)],
        ]),
      },
      ...seccionExpediente(solicitud, convocatoria),
      { titulo: "Documentación legal revisada", lista: documentosPresentados(solicitud, campos) },
      {
        titulo: "Resultado",
        filas: [
          ["Dictamen", favorable ? "FAVORABLE (procedente)" : "DESFAVORABLE (no procedente)"],
          ["Fundamento", dictamen.observaciones || "Sin observaciones."],
        ],
        parrafos: [
          favorable
            ? "Revisadas las escrituras y la documentación legal del expediente, se determina que la solicitud " +
              "cumple los requisitos legales aplicables y puede continuar a la consolidación de listados."
            : "Revisadas las escrituras y la documentación legal del expediente, se determina que la solicitud " +
              "no cumple los requisitos legales aplicables, por lo que se integra al listado de no factibles.",
        ],
      },
    ],
    firmas: ["Unidad Jurídica, de Igualdad de Género y Erradicación de la Violencia"],
    pie: "Dictamen emitido conforme a las Reglas de Operación y la Convocatoria vigentes del programa.",
  };
}
