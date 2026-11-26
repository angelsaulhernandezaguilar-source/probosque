// Municipios que atiende cada Delegación Regional Forestal.
// Fuente: tabla "OFICINA / DIRECCIÓN / MUNICIPIOS QUE ATIENDE" de las Reglas de Operación 2026
// (docs/reglas-operacion/RO Plantaciones Sustentables.pdf). Las RO dicen que una solicitud
// no se puede recibir en una delegación que no le corresponde: por eso el formulario
// ya no deja elegir la delegación, la asigna según el municipio del predio.

export const MUNICIPIOS_POR_DELEGACION = {
  Toluca: [
    "Almoloya de Juárez", "Almoloya del Río", "Atizapán", "Calimaya", "Capulhuac", "Chapultepec",
    "Huixquilucan", "Joquicingo", "Lerma", "Metepec", "Mexicaltzingo", "Ocoyoacac", "Otzolotepec",
    "Rayón", "San Antonio la Isla", "San Mateo Atenco", "Temoaya", "Tenango del Valle", "Texcalyacac",
    "Tianguistenco", "Toluca", "Xalatlaco", "Xonacatlán", "Zinacantepec",
  ],
  Naucalpan: [
    "Apaxco", "Atizapán de Zaragoza", "Coacalco de Berriozábal", "Coyotepec", "Cuautitlán",
    "Cuautitlán Izcalli", "Ecatepec de Morelos", "Huehuetoca", "Hueypoxtla", "Isidro Fabela", "Jaltenco",
    "Jilotzingo", "Melchor Ocampo", "Naucalpan de Juárez", "Nextlalpan", "Nicolás Romero", "Teoloyucan",
    "Tepotzotlán", "Tequixquiac", "Tlalnepantla de Baz", "Tultepec", "Tultitlán", "Zumpango",
  ],
  Texcoco: [
    "Acolman", "Atenco", "Axapusco", "Chiautla", "Chicoloapan", "Chiconcuac", "Chimalhuacán", "La Paz",
    "Nezahualcóyotl", "Nopaltepec", "Otumba", "Papalotla", "San Martín de las Pirámides", "Tecámac",
    "Temascalapa", "Teotihuacán", "Tepetlaoxtoc", "Texcoco", "Tezoyuca", "Tonanitla",
  ],
  Tejupilco: [
    "Amatepec", "Luvianos", "San Simón de Guerrero", "Sultepec", "Tejupilco", "Temascaltepec", "Tlatlaya",
  ],
  Atlacomulco: [
    "Acambay", "Atlacomulco", "El Oro", "Ixtlahuaca", "Jiquipilco", "Jocotitlán", "Morelos",
    "San Felipe del Progreso", "San José del Rincón", "Temascalcingo",
  ],
  "Coatepec Harinas": [
    "Almoloya de Alquisiras", "Coatepec Harinas", "Ixtapan de la Sal", "Malinalco", "Ocuilan", "Tenancingo",
    "Texcaltitlán", "Tonatico", "Villa Guerrero", "Zacualpan", "Zumpahuacán",
  ],
  "Valle de Bravo": [
    "Amanalco", "Donato Guerra", "Ixtapan del Oro", "Otzoloapan", "Santo Tomás", "Valle de Bravo",
    "Villa de Allende", "Villa Victoria", "Zacazonapan",
  ],
  Amecameca: [
    "Amecameca", "Atlautla", "Ayapango", "Chalco", "Cocotitlán", "Ecatzingo", "Ixtapaluca", "Juchitepec",
    "Ozumba", "Temamatla", "Tenango del Aire", "Tepetlixpa", "Tlalmanalco", "Valle de Chalco",
  ],
  Jilotepec: [
    "Aculco", "Chapa de Mota", "Jilotepec", "Polotitlán", "Soyaniquilpan de Juárez", "Timilpan",
    "Villa del Carbón",
  ],
};

// Sin acentos ni mayúsculas, para comparar "Teotihuacan" con "Teotihuacán"
export const normalizarTexto = (texto) =>
  String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

// Los 125 municipios en orden alfabético (para la lista del formulario)
export const MUNICIPIOS = Object.values(MUNICIPIOS_POR_DELEGACION)
  .flat()
  .sort((a, b) => a.localeCompare(b, "es"));

// "Zinacantepec" → "Toluca". Devuelve "" si el municipio no está en la tabla.
export function delegacionDeMunicipio(municipio) {
  const buscado = normalizarTexto(municipio);
  if (!buscado) return "";
  const encontrada = Object.entries(MUNICIPIOS_POR_DELEGACION).find(([, municipios]) =>
    municipios.some((m) => normalizarTexto(m) === buscado)
  );
  return encontrada ? encontrada[0] : "";
}
