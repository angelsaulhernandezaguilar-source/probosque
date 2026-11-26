import { describe, expect, it } from "vitest";
import {
  campoObligatorio,
  campoVisible,
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
      expect.arrayContaining(["tipoPersona", "nombres", "telefono", "validacionSig"])
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

  it("uses the surname labels of the FO-PB-501 formats", () => {
    const campos = formularioDePrograma("manejo-forestal").campos;

    expect(campos.find((campo) => campo.id === "apellidos").etiqueta).toBe("Primer apellido");
    expect(campos.find((campo) => campo.id === "segundoApellido").etiqueta).toBe("Segundo apellido");
  });

  it("lets the applicant choose several priority groups and uploads documents one by one", () => {
    const campos = formularioDePrograma("plantaciones").campos;
    const grupoPrioritario = campos.find((campo) => campo.id === "gruposPrioritarios");
    const documentos = campos.filter((campo) => campo.seccion === "IV. Documentación presentada");

    expect(grupoPrioritario.tipo).toBe("checkbox-group");
    expect(grupoPrioritario.exclusiva).toBe("Ninguno");
    expect(grupoPrioritario.opciones.map(({ valor }) => valor)).toContain("Ninguno");
    const identificacion = documentos.find((campo) => campo.id === "identificacionOficial");
    expect(identificacion.tipo).toBe("file");
    // Es obligatoria salvo en refrendo (ver "ajustes de la revisión")
    expect(campoObligatorio(identificacion, { esRefrendo: "No" })).toBe(true);
  });
});

// "Si aplica": los campos aparecen y se exigen según lo que ya contestó la persona
describe("campos que solo aplican en algunos casos", () => {
  const campo = (programa, id) => formularioDePrograma(programa).campos.find((c) => c.id === id);

  it("asks for the ejido documents and officers only for a Núcleo Agrario", () => {
    const acta = campo("restauracion", "actaIncorporacion");
    const secretario = campo("restauracion", "secretarioNombres");

    expect(campoVisible(acta, { tipoPersona: "Propietario" })).toBe(false);
    expect(campoVisible(secretario, { tipoPersona: "Propietario" })).toBe(false);
    expect(campoVisible(acta, { tipoPersona: "Núcleo Agrario" })).toBe(true);
    expect(campoObligatorio(acta, { tipoPersona: "Núcleo Agrario" })).toBe(true);
    // Si no se muestra, tampoco es obligatorio
    expect(campoObligatorio(acta, { tipoPersona: "Propietario" })).toBe(false);
  });

  it("shows program documents only when their condition applies", () => {
    const proyecto = campo("restauracion", "proyectoTecnicoRestauracion");
    expect(campoVisible(proyecto, { restauracionIntegral: "" })).toBe(false);
    expect(campoVisible(proyecto, { restauracionIntegral: "12" })).toBe(true);

    const certificado = campo("servicios-ambientales", "certificadoManejo");
    expect(campoVisible(certificado, { pmfVigente: "No" })).toBe(false);
    expect(campoVisible(certificado, { pmfVigente: "Certificado" })).toBe(true);

    const anioConvenio = campo("servicios-ambientales", "anioConvenioPSA");
    expect(campoVisible(anioConvenio, { fondosConcurrentesPSA: "Sí" })).toBe(true);
    expect(campoVisible(anioConvenio, { fondosConcurrentesPSA: "No" })).toBe(false);
  });

  it("follows the MFS options: resources, forest services provider and FSC documents", () => {
    const recursosUma = campo("manejo-forestal", "recursosUma");
    const prestador = campo("manejo-forestal", "prestadorNombre");
    const custodia = campo("manejo-forestal", "autorizacionAlmacenamiento");
    const estudios = campo("manejo-forestal", "estudiosTecnicos");

    expect(campoVisible(recursosUma, { estudiosTecnicos: ["Maderable"] })).toBe(false);
    expect(
      campoVisible(recursosUma, {
        estudiosTecnicos: ["Unidades para la Conservación de la Vida Silvestre maderables (UMA)"],
      })
    ).toBe(true);
    expect(campoVisible(prestador, { estudiosTecnicos: [] })).toBe(false);
    expect(campoVisible(prestador, { estudiosTecnicos: ["Maderable"] })).toBe(true);
    expect(
      campoVisible(custodia, { certificacionesFsc: ["Certificación para la Cadena de Custodia FSC"] })
    ).toBe(true);
    // Debe elegir al menos un estudio técnico o una certificación
    expect(campoObligatorio(estudios, {})).toBe(true);
    expect(campoObligatorio(estudios, { certificacionesFsc: ["Declaración de servicios ecosistémicos"] })).toBe(false);
  });
});

// Ajustes pedidos en la revisión del 25 de noviembre
describe("ajustes de la revisión", () => {
  const campos = (programa) => formularioDePrograma(programa).campos;
  const campo = (programa, id) => campos(programa).find((c) => c.id === id);
  const programas = PROGRAMAS_CON_FORMULARIO.map(({ id }) => id);

  it("no longer asks for the CLABE or for observations in any form", () => {
    for (const programa of programas) {
      const ids = campos(programa).map((c) => c.id);
      expect(ids).not.toContain("clabe");
      expect(ids).not.toContain("observacionesDocumentos");
      expect(ids).not.toContain("observacionesPrograma");
    }
  });

  it("picks the municipio from the official list and derives the delegación from it", () => {
    for (const programa of programas) {
      const municipio = campo(programa, "Municipio_predio");
      const delegacion = campo(programa, "delegacion");
      expect(municipio.tipo).toBe("select");
      expect(municipio.opciones).toHaveLength(125);
      expect(delegacion.calcular({ Municipio_predio: "Zinacantepec" })).toBe("Toluca");
      expect(delegacion.calcular({ Municipio_predio: "Amecameca" })).toBe("Amecameca");
      expect(delegacion.calcular({})).toBe("");
    }
  });

  it("always requires a second beneficiary; in a Núcleo Agrario it is a comisariado member", () => {
    const cargo = campo("plantaciones", "segundaPersonaCargo");
    const nombres = campo("plantaciones", "segundaPersonaNombres");
    expect(campos("plantaciones").map((c) => c.id)).not.toContain("designaSegundaPersona");

    expect(campoObligatorio(nombres, { tipoPersona: "Propietario" })).toBe(true);
    expect(campoVisible(cargo, { tipoPersona: "Propietario" })).toBe(false);
    expect(campoObligatorio(cargo, { tipoPersona: "Núcleo Agrario" })).toBe(true);
    expect(campoVisible(nombres, { tipoPersona: "Núcleo Agrario" })).toBe(false);
    expect(cargo.opciones.map(({ valor }) => valor)).toEqual(["Secretario(a)", "Tesorero(a)"]);

    expect(campoObligatorio(campo("manejo-forestal", "segundaPersonaNombres"), {})).toBe(true);
  });

  it("in a refrendo only keeps the CURP, the FO-PB-502 and the polygon as mandatory documents", () => {
    const nueva = { esRefrendo: "No", tipoPersona: "Núcleo Agrario", representanteLegal: "Sí" };
    const refrendo = { ...nueva, esRefrendo: "Sí" };
    const obligatorios = (respuestas) =>
      campos("restauracion")
        .filter((c) => c.tipo === "file" && campoObligatorio(c, respuestas))
        .map((c) => c.id);

    expect(obligatorios(nueva)).toEqual(
      expect.arrayContaining(["identificacionOficial", "acreditaPropiedad", "actaIncorporacion", "acreditacionRepresentante"])
    );
    expect(obligatorios(refrendo).sort()).toEqual(["curp", "registroPersona", "validacionSig"]);
    expect(campoObligatorio(campo("restauracion", "foliosRefrendo"), refrendo)).toBe(true);
    expect(campoVisible(campo("restauracion", "foliosRefrendo"), nueva)).toBe(false);
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
