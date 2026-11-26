import { describe, expect, it } from "vitest";
import { formularioDePrograma } from "../datos/camposFormulario";
import { delegacionDeMunicipio, MUNICIPIOS, MUNICIPIOS_POR_DELEGACION } from "../datos/municipios";
import { DELEGACIONES } from "../datos/catalogos";
import { CUENTAS_DEMO, ROLES, seccionesDe } from "../datos/usuarios";
import { acuseDe, dictamenDe, segundaPersonaDe } from "./documentos";

const respuestas = {
  nombres: "María",
  apellidos: "López",
  segundoApellido: "Cruz",
  tipoPersona: "Núcleo Agrario",
  razonSocial: "Ejido San Pedro",
  secretarioNombres: "Juan",
  secretarioPrimerApellido: "Pérez",
  segundaPersonaCargo: "Secretario(a)",
  correo: "maria@ejemplo.mx",
  Nombre_predio: "Las Trancas",
  Municipio_predio: "Amecameca",
  delegacion: "Amecameca",
  esRefrendo: "No",
};
const solicitud = {
  folio: "RHF-2026-0002",
  registradaEl: "2026-11-02",
  limiteAvisoFaltantes: "2026-11-12",
  fechaLimiteDictamen: "2027-01-04",
  poligono: { type: "MultiPolygon", coordinates: [] },
  documentos: [
    { id: 1, tipo: "curp", nombre: "curp.pdf" },
    { id: 2, tipo: "validacionSig", nombre: "predio.kml" },
  ],
  respuestas,
};
const convocatoria = { id: 7, programa: "restauracion" };
const campos = formularioDePrograma("restauracion").campos;
const textoDe = (documento) => JSON.stringify(documento);

describe("acuse de recepción", () => {
  const acuse = acuseDe({ solicitud, convocatoria, campos });

  it("lleva el folio, el formato y el nombre del archivo PDF", () => {
    expect(acuse.folio).toBe("RHF-2026-0002");
    expect(acuse.archivo).toBe("Acuse_RHF-2026-0002.pdf");
    expect(acuse.subtitulo).toContain("FO-PB-501A");
  });

  it("dice cuándo se liberan los dictámenes y lista los documentos presentados", () => {
    expect(textoDe(acuse)).toContain("4 de enero de 2027");
    const documentos = acuse.secciones.find((s) => s.titulo === "Documentación presentada").lista;
    expect(documentos).toHaveLength(2);
    expect(documentos.join(" | ")).toContain("curp.pdf");
    expect(documentos.join(" | ")).toContain("predio.kml");
  });

  it("nombra a la segunda persona beneficiaria según el cargo elegido en el comisariado", () => {
    expect(segundaPersonaDe(respuestas)).toBe("Juan Pérez · Secretario(a)");
    expect(segundaPersonaDe({ segundaPersonaNombres: "Ana", segundaPersonaPrimerApellido: "Ruiz" })).toBe("Ana Ruiz");
  });
});

describe("dictamen jurídico", () => {
  it("distingue el favorable del desfavorable y conserva el fundamento", () => {
    const base = { solicitud, convocatoria, campos };
    const favorable = dictamenDe({ ...base, dictamen: { resultado: "FAVORABLE", observaciones: "", fecha: "2026-11-20" } });
    const negativo = dictamenDe({
      ...base,
      dictamen: { resultado: "DESFAVORABLE", observaciones: "Escritura sin inscripción.", fecha: "2026-11-20" },
    });
    expect(textoDe(favorable)).toContain("FAVORABLE (procedente)");
    expect(textoDe(negativo)).toContain("DESFAVORABLE (no procedente)");
    expect(textoDe(negativo)).toContain("Escritura sin inscripción.");
    expect(favorable.archivo).toBe("Dictamen_juridico_RHF-2026-0002.pdf");
  });
});

describe("municipios y delegaciones", () => {
  it("cubre los 125 municipios sin repetir y usa las mismas delegaciones que el catálogo", () => {
    expect(MUNICIPIOS).toHaveLength(125);
    expect(new Set(MUNICIPIOS).size).toBe(125);
    expect(Object.keys(MUNICIPIOS_POR_DELEGACION).sort()).toEqual([...DELEGACIONES].sort());
  });

  it("encuentra la delegación sin importar acentos ni mayúsculas", () => {
    expect(delegacionDeMunicipio("teotihuacan")).toBe("Texcoco");
    expect(delegacionDeMunicipio("Atizapán")).toBe("Toluca");
    expect(delegacionDeMunicipio("Atizapán de Zaragoza")).toBe("Naucalpan");
    expect(delegacionDeMunicipio("Cuernavaca")).toBe("");
  });
});

describe("pantallas por rol", () => {
  const rutas = (usuario) => seccionesDe(usuario).map((s) => s.a);

  it("sin sesión solo se ven las convocatorias", () => {
    expect(rutas(null)).toEqual(["/"]);
  });

  it("cada rol ve únicamente su pantalla de trabajo", () => {
    expect(rutas({ rol: ROLES.SOLICITANTE })).toEqual(["/", "/estatus"]);
    expect(rutas({ rol: ROLES.DELEGACION })).toEqual(["/", "/recepcion"]);
    expect(rutas({ rol: ROLES.JURIDICO })).toEqual(["/", "/dictamenes"]);
    expect(rutas({ rol: ROLES.COMITE })).toEqual(["/", "/listados"]);
    expect(rutas({ rol: ROLES.DIRECCION })).toEqual(["/", "/publicar"]);
  });

  it("hay una cuenta de ventanilla por cada delegación", () => {
    const delegaciones = CUENTAS_DEMO.filter((c) => c.rol === ROLES.DELEGACION).map((c) => c.delegacion);
    expect(delegaciones.sort()).toEqual([...DELEGACIONES].sort());
  });
});
