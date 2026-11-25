import { describe, expect, it } from "vitest";
import {
  camposDeConvocatoria,
  formularioDePrograma,
  formatearRespuesta,
  PROGRAMAS_CON_FORMULARIO,
} from "./camposFormulario";

describe("camposDeConvocatoria", () => {
  it("uses the fields configured on a convocatoria", () => {
    const campos = [{ id: "superficie", etiqueta: "Hectáreas", tipo: "number" }];

    expect(camposDeConvocatoria({ campos })).toBe(campos);
  });

  it("uses the selected program's template for legacy convocatorias", () => {
    expect(camposDeConvocatoria({ programa: "restauracion" })).toBe(
      formularioDePrograma("restauracion").campos
    );
    expect(formularioDePrograma("Procarbono")).toBe(
      formularioDePrograma("capturando-carbono")
    );
  });

  it("offers a preset template for each program on the Solicitud Única", () => {
    expect(PROGRAMAS_CON_FORMULARIO.map(({ id }) => id)).toEqual([
      "plantaciones",
      "restauracion",
      "servicios-ambientales",
      "manejo-forestal",
      "capturando-carbono",
    ]);

    expect(
      formularioDePrograma("servicios-ambientales").campos.some(
        (campo) => campo.id === "superficieConvocatoriaEstatal"
      )
    ).toBe(true);
    expect(
      formularioDePrograma("restauracion").campos.some(
        (campo) => campo.id === "restauracionIntegral"
      )
    ).toBe(true);
    expect(
      formularioDePrograma("capturando-carbono").campos.some(
        (campo) => campo.id === "carbonReforestacion"
      )
    ).toBe(true);
    expect(
      formularioDePrograma("plantaciones").campos.some(
        (campo) => campo.id === "sistemasAgroforestales"
      )
    ).toBe(true);
  });

  it("combines the shared registration fields with the MFS ETF and FSC options", () => {
    const campos = formularioDePrograma("manejo-forestal").campos;
    const estudios = campos.find((campo) => campo.id === "estudiosTecnicos");
    const certificaciones = campos.find((campo) => campo.id === "certificacionesFsc");

    expect(campos.map((campo) => campo.id)).toEqual(
      expect.arrayContaining(["tipoPersona", "nombres", "telefono", "clabe", "validacionSig"])
    );
    expect(estudios.tipo).toBe("checkbox-group");
    expect(estudios.opciones.map(({ valor }) => valor)).toEqual(
      expect.arrayContaining(["Maderable", "No Maderable", "PMF Combinado", "Informe preventivo"])
    );
    expect(certificaciones.opciones.map(({ valor }) => valor)).toEqual(
      expect.arrayContaining([
        "Certificación para Manejo Forestal (de forma Grupal)",
        "Certificación para la Cadena de Custodia FSC",
        "Declaración de servicios ecosistémicos",
      ])
    );
    expect(campos.find((campo) => campo.id === "prestadorNombre")).toBeDefined();
    expect(campos.find((campo) => campo.id === "registroForestalAnio").tipo).toBe("number");
  });

  it("labels the applicant's paternal and maternal surnames separately", () => {
    const campos = formularioDePrograma("manejo-forestal").campos;

    expect(campos.find((campo) => campo.id === "apellidos").etiqueta).toBe("Apellido paterno");
    expect(campos.find((campo) => campo.id === "segundoApellido").etiqueta).toBe("Apellido materno");
  });

  it("uses a single-select group field and individual document uploads", () => {
    const campos = formularioDePrograma("plantaciones").campos;
    const grupoPrioritario = campos.find((campo) => campo.id === "gruposPrioritarios");
    const documentos = campos.filter((campo) => campo.seccion === "Documentos por presentar");

    expect(grupoPrioritario.tipo).toBe("select");
    expect(grupoPrioritario.opciones.map(({ valor }) => valor)).toContain("Ninguno");
    expect(documentos.some((campo) => campo.id === "documentosPresentados")).toBe(false);
    expect(documentos.find((campo) => campo.id === "identificacionOficial")).toMatchObject({
      tipo: "file",
      obligatorio: true,
    });
    expect(documentos.find((campo) => campo.id === "actaIncorporacion")).toMatchObject({
      tipo: "file",
      obligatorio: false,
    });
  });
});

describe("formatearRespuesta", () => {
  it("shows a select option label and joins multiple file names", () => {
    expect(
      formatearRespuesta(
        { tipo: "select", opciones: [{ valor: "ejido", etiqueta: "Núcleo agrario" }] },
        "ejido"
      )
    ).toBe("Núcleo agrario");
    expect(formatearRespuesta({ tipo: "file" }, ["identificacion.pdf", "plano.kml"])).toBe(
      "identificacion.pdf, plano.kml"
    );
  });

  it("does not display unanswered optional checkboxes", () => {
    expect(formatearRespuesta({ tipo: "checkbox" }, undefined)).toBe("");
    expect(formatearRespuesta({ tipo: "checkbox" }, false)).toBe("No");
    expect(formatearRespuesta({ tipo: "checkbox" }, true)).toBe("Sí");
  });

  it("formats selected values in a checkbox group", () => {
    expect(
      formatearRespuesta(
        {
          tipo: "checkbox-group",
          opciones: [
            { valor: "ejido", etiqueta: "Núcleo agrario" },
            { valor: "sociedad", etiqueta: "Sociedad" },
          ],
        },
        ["ejido", "sociedad"]
      )
    ).toBe("Núcleo agrario, Sociedad");
  });
});
