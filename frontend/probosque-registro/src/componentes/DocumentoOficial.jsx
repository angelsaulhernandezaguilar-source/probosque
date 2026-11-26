import "./DocumentoOficial.css";

// Vista en pantalla de un documento oficial (acuse o dictamen).
// Recibe el mismo modelo que utilidades/pdf.js convierte en PDF.
export default function DocumentoOficial({ documento }) {
  return (
    <article className="doc-hoja">
      <header className="doc-membrete">
        <div>
          <strong>PROBOSQUE</strong>
          <span>Protectora de Bosques del Estado de México</span>
        </div>
        <div className="doc-folio">
          <strong>Folio {documento.folio}</strong>
          <span>{documento.fecha}</span>
        </div>
      </header>

      <h1 className="doc-titulo">{documento.titulo}</h1>
      {documento.subtitulo && <p className="doc-subtitulo">{documento.subtitulo}</p>}

      {documento.secciones.map((seccion) => {
        const vacia = !seccion.filas?.length && !seccion.lista?.length && !seccion.parrafos?.length;
        if (vacia) return null;
        return (
          <section key={seccion.titulo} className="doc-seccion">
            <h2>{seccion.titulo}</h2>
            {seccion.filas?.length > 0 && (
              <dl>
                {seccion.filas.map(([etiqueta, valor]) => (
                  <div key={etiqueta}>
                    <dt>{etiqueta}</dt>
                    <dd>{valor}</dd>
                  </div>
                ))}
              </dl>
            )}
            {seccion.lista?.length > 0 && (
              <ul>
                {seccion.lista.map((elemento) => (
                  <li key={elemento}>{elemento}</li>
                ))}
              </ul>
            )}
            {seccion.parrafos?.map((parrafo) => (
              <p key={parrafo}>{parrafo}</p>
            ))}
          </section>
        );
      })}

      {documento.firmas?.length > 0 && (
        <div className="doc-firmas">
          {documento.firmas.map((firma) => (
            <p key={firma}>{firma}</p>
          ))}
        </div>
      )}
      {documento.pie && <p className="doc-pie">{documento.pie}</p>}
    </article>
  );
}
