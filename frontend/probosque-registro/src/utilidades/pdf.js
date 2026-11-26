// Convierte un documento oficial (ver utilidades/documentos.js) en un archivo PDF y lo descarga.
// jsPDF se importa hasta que alguien pide un PDF: así no pesa en la carga inicial de la app.

const MARGEN = 56; // puntos (72 pt = 1 pulgada)
const VERDE = [28, 74, 55];
const GRIS = [77, 95, 85];
const TINTA = [20, 35, 27];

export async function descargarPdf(documento) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "pt", format: "letter" });
  const ancho = pdf.internal.pageSize.getWidth();
  const alto = pdf.internal.pageSize.getHeight();
  const util = ancho - MARGEN * 2;
  let y = MARGEN;

  // Si lo que sigue no cabe en la hoja, se pasa a una nueva
  const reservar = (espacio) => {
    if (y + espacio > alto - 60) { // abajo quedan 60 pt para el pie de página
      pdf.addPage();
      y = MARGEN;
    }
  };

  const escribir = (texto, { x = MARGEN, anchoMax = util, tamano = 10, estilo = "normal", color = TINTA, salto = 1.35 } = {}) => {
    pdf.setFont("helvetica", estilo);
    pdf.setFontSize(tamano);
    pdf.setTextColor(...color);
    for (const linea of pdf.splitTextToSize(String(texto), anchoMax)) {
      reservar(tamano * salto);
      pdf.text(linea, x, y);
      y += tamano * salto;
    }
  };

  // Encabezado institucional
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.setTextColor(...VERDE);
  pdf.text("PROBOSQUE", MARGEN, y);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(...GRIS);
  pdf.text("Protectora de Bosques del Estado de México", MARGEN, y + 13);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(...TINTA);
  pdf.text(`Folio ${documento.folio}`, ancho - MARGEN, y, { align: "right" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(...GRIS);
  pdf.text(documento.fecha, ancho - MARGEN, y + 13, { align: "right" });
  y += 26;
  pdf.setDrawColor(...VERDE);
  pdf.setLineWidth(1.5);
  pdf.line(MARGEN, y, ancho - MARGEN, y);
  y += 28;

  escribir(documento.titulo, { tamano: 17, estilo: "bold", salto: 1.2 });
  if (documento.subtitulo) escribir(documento.subtitulo, { tamano: 9.5, color: GRIS });
  y += 10;

  for (const seccion of documento.secciones) {
    const vacia = !seccion.filas?.length && !seccion.lista?.length && !seccion.parrafos?.length;
    if (vacia) continue;
    reservar(44);
    y += 8;
    escribir(seccion.titulo, { tamano: 11, estilo: "bold", color: VERDE });
    pdf.setDrawColor(207, 217, 206);
    pdf.setLineWidth(0.6);
    pdf.line(MARGEN, y - 6, ancho - MARGEN, y - 6);
    y += 6;

    for (const [etiqueta, valor] of seccion.filas ?? []) {
      // Etiqueta a la izquierda y valor a la derecha, en el mismo renglón
      const lineasEtiqueta = pdf.splitTextToSize(etiqueta, 150);
      reservar(Math.max(14, lineasEtiqueta.length * 12.5));
      const renglon = y;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9.5);
      pdf.setTextColor(...GRIS);
      pdf.text(lineasEtiqueta, MARGEN, renglon, { lineHeightFactor: 1.3 });
      escribir(valor, { x: MARGEN + 164, anchoMax: util - 164 });
      // Si la etiqueta ocupó más renglones que el valor, se baja hasta donde terminó la etiqueta
      y = Math.max(y, renglon + lineasEtiqueta.length * 12.5) + 3;
    }
    for (const elemento of seccion.lista ?? []) {
      reservar(14);
      pdf.setTextColor(...VERDE);
      pdf.text("•", MARGEN + 2, y);
      escribir(elemento, { x: MARGEN + 14, anchoMax: util - 14, tamano: 9.5 });
      y += 2;
    }
    for (const parrafo of seccion.parrafos ?? []) {
      escribir(parrafo, { tamano: 10 });
      y += 6;
    }
  }

  // Firmas, una al lado de otra
  if (documento.firmas?.length) {
    reservar(72); // espacio para firmar + renglón + nombre
    y += 48;
    const columna = util / documento.firmas.length;
    documento.firmas.forEach((firma, i) => {
      const x = MARGEN + columna * i;
      pdf.setDrawColor(...TINTA);
      pdf.setLineWidth(0.7);
      pdf.line(x + 12, y, x + columna - 12, y);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.5);
      pdf.setTextColor(...GRIS);
      pdf.text(pdf.splitTextToSize(firma, columna - 24), x + columna / 2, y + 12, { align: "center" });
    });
  }

  // Pie y número de página en todas las hojas
  const paginas = pdf.getNumberOfPages();
  for (let n = 1; n <= paginas; n++) {
    pdf.setPage(n);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...GRIS);
    if (documento.pie) pdf.text(pdf.splitTextToSize(documento.pie, util - 70), MARGEN, alto - 34);
    pdf.text(`Página ${n} de ${paginas}`, ancho - MARGEN, alto - 34, { align: "right" });
  }

  pdf.save(documento.archivo);
}
