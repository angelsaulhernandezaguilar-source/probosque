import { useRef, useState } from "react";
import { mostrarEnCelular } from "../utilidades/pantalla";
import { GrupoExpedientes } from "./RecepcionSolicitudes";
import "./PanelSolicitudes.css";

// HU-2.4-01 · Emisión de dictamen jurídico (Unidad Jurídica)
// Cada solicitud: { id, folio, nombre, programa, etiquetaEstado, tono, estadoLargo, plazo: "texto",
//                   documentos: [{ id, nombre, url }], pie: enlace al dictamen en PDF (solo emitidos) }
//   solicitudes → en dictamen (se puede emitir)      emitidos → ya dictaminadas, favorables o no
export default function EmisionDictamenes({ solicitudes = [], emitidos = [], onFavorable, onDesfavorable }) {
  const [seleccionadaId, setSeleccionadaId] = useState(null);
  const [documentoPrevisualizadoId, setDocumentoPrevisualizadoId] = useState(null);
  const [observaciones, setObservaciones] = useState(""); // fundamento del dictamen
  const seleccionada = [...solicitudes, ...emitidos].find((s) => s.id === seleccionadaId);
  const seleccionadaPendiente = solicitudes.some((s) => s.id === seleccionadaId);

  const detalleRef = useRef(null); // para bajar al detalle en el celular

  const elegir = (id) => {
    setSeleccionadaId(id);
    setDocumentoPrevisualizadoId(null);
    setObservaciones("");
    mostrarEnCelular(detalleRef); // en pantallas angostas el detalle queda abajo de la lista
  };

  const grupo = { seleccionadaId, onElegir: elegir };

  return (
    <div className="ps-pagina">
      <header className="ps-encabezado">
        <h1 className="ps-titulo">Emisión de dictámenes jurídicos</h1>
        <p className="ps-entrada">Revisa las escrituras y la documentación legal de las solicitudes que ya cotejó la delegación y emite el dictamen jurídico.</p>
      </header>

      <div className="ps-listas">
        <GrupoExpedientes
          {...grupo}
          id="ps-pendientes-titulo"
          titulo="Pendientes"
          vacio="No hay solicitudes pendientes de dictamen jurídico."
          accion="Revisar documentos"
          expedientes={solicitudes}
        />
        <GrupoExpedientes
          {...grupo}
          id="ps-emitidos-titulo"
          titulo="Dictámenes emitidos"
          vacio="Aún no se ha emitido ningún dictamen."
          accion="Ver dictamen"
          expedientes={emitidos}
        />
      </div>

      {/* Documentos de la solicitud elegida */}
      <section className="ps-detalle" ref={detalleRef}>
        <div className="ps-detalle-cuerpo">
          {seleccionada ? (
            <>
              {/* Encabezado del expediente: folio, programa y estado */}
              <header className="ps-expediente">
                <div>
                  <p className="ps-expediente-folio">Expediente {seleccionada.folio}</p>
                  <h2 className="ps-detalle-titulo">{seleccionada.nombre}</h2>
                  {seleccionada.programa && <p className="ps-expediente-programa">{seleccionada.programa}</p>}
                </div>
                <span className={`app-etiqueta ${seleccionada.tono ?? ""}`}>{seleccionada.estadoLargo}</span>
              </header>
              <h3 className="ps-subtitulo">Documentos ({seleccionada.documentos.length})</h3>
              {seleccionadaPendiente && seleccionada.plazo && <p className="ps-plazo">{seleccionada.plazo}</p>}
              <ul className="ps-documentos">
                {seleccionada.documentos.map((doc) => (
                  <li key={doc.id}>
                    <a href={doc.url} target="_blank" rel="noreferrer">{doc.nombre}</a>
                    {doc.nombre.toLowerCase().endsWith(".pdf") && (
                      <div className="ps-vista-pdf">
                        <button
                          type="button"
                          className="ps-vista-pdf-boton"
                          aria-expanded={documentoPrevisualizadoId === doc.id}
                          aria-controls={`dictamen-pdf-${doc.id}`}
                          onClick={() =>
                            setDocumentoPrevisualizadoId((actual) => actual === doc.id ? null : doc.id)
                          }
                        >
                          {documentoPrevisualizadoId === doc.id ? "Cerrar vista previa" : "Previsualizar PDF"}
                        </button>
                        {documentoPrevisualizadoId === doc.id && (
                        <iframe
                          id={`dictamen-pdf-${doc.id}`}
                          className="ps-pdf"
                          src={doc.url}
                          title={`Vista previa de ${doc.nombre}`}
                        />
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="ps-vacio">Elige una solicitud para ver su expediente.</p>
          )}
        </div>

        {seleccionadaPendiente ? (
          <>
            <div className="ps-observaciones">
              <label htmlFor="ps-dictamen">Fundamento del dictamen (obligatorio si es desfavorable)</label>
              <textarea
                id="ps-dictamen"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Ej. Escrituras y acta de asamblea vigentes; el representante está acreditado."
              />
            </div>
            <div className="ps-acciones">
              <button
                type="button"
                className="ps-boton ps-boton--secundario"
                disabled={!observaciones.trim()}
                onClick={() => onDesfavorable?.(seleccionada.id, observaciones.trim())}
              >
                Emitir desfavorable
              </button>
              <button
                type="button"
                className="ps-boton ps-boton--primario"
                onClick={() => onFavorable?.(seleccionada.id, observaciones.trim())}
              >
                Emitir favorable
              </button>
            </div>
          </>
        ) : seleccionada ? (
          <p className="ps-estado-aprobado">
            {seleccionada.estadoLargo}
            {seleccionada.pie}
          </p>
        ) : null}
      </section>
    </div>
  );
}
