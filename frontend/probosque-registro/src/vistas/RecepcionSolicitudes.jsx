import { useRef, useState } from "react";
import { mostrarEnCelular } from "../utilidades/pantalla";
import "./PanelSolicitudes.css";

// HU-2.1-01 · Recepción y validación de expedientes (Delegación Regional)
// Cada solicitud: { id, folio, nombre, detalles: [[etiqueta, valor], ...], documentos: [{ id, nombre, url }] }
export default function RecepcionSolicitudes({ solicitudes = [], aprobadas = [], onAceptar, onRechazar }) {
  // Guardamos solo el id de la solicitud elegida, no el objeto completo
  const [seleccionadaId, setSeleccionadaId] = useState(null);
  const [documentoPrevisualizadoId, setDocumentoPrevisualizadoId] = useState(null);
  const [documentosRevisados, setDocumentosRevisados] = useState({});
  const [faltantes, setFaltantes] = useState(""); // aviso de faltantes que leerá el solicitante

  // Buscamos el objeto completo cada vez que se renderiza
  const seleccionada = [...solicitudes, ...aprobadas].find((s) => s.id === seleccionadaId);
  const seleccionadaPendiente = solicitudes.some((s) => s.id === seleccionadaId);

  const detalleRef = useRef(null); // para bajar al detalle en el celular

  const elegir = (id) => {
    setSeleccionadaId(id);
    setDocumentoPrevisualizadoId(null);
    setDocumentosRevisados({});
    setFaltantes("");
    mostrarEnCelular(detalleRef); // en pantallas angostas el detalle queda abajo de la lista
  };

  return (
    <div className="ps-pagina">
      <header className="ps-encabezado">
        <h1 className="ps-titulo">Recepción de solicitudes</h1>
        <p className="ps-entrada">Coteja los documentos de cada solicitud. Si está completa, pasa a dictamen jurídico; si faltan documentos, escribe cuáles y el solicitante tendrá 5 días hábiles para subsanar.</p>
      </header>

      <div className="ps-listas">
        <section className="ps-grupo" aria-labelledby="ps-aprobadas-titulo">
          <h2 className="ps-grupo-titulo" id="ps-aprobadas-titulo">
            Aprobadas <span>{aprobadas.length}</span>
          </h2>
          <ul className="ps-lista">
            {aprobadas.length === 0 ? (
              <li className="ps-lista-vacia">Aún no hay solicitudes aprobadas.</li>
            ) : (
              aprobadas.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className={`ps-fila ps-fila--aprobada ${s.id === seleccionadaId ? "ps-fila--activa" : ""}`}
                    aria-pressed={s.id === seleccionadaId}
                    onClick={() => elegir(s.id)}
                  >
                    <span className="ps-folio">{s.folio}</span>
                    <span className="ps-nombre">{s.nombre}</span>
                    <span className="ps-accion">Ver</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="ps-grupo" aria-labelledby="ps-pendientes-titulo">
          <h2 className="ps-grupo-titulo" id="ps-pendientes-titulo">
            Pendientes <span>{solicitudes.length}</span>
          </h2>
          <ul className="ps-lista">
            {solicitudes.length === 0 ? (
              <li className="ps-lista-vacia">No hay solicitudes pendientes de cotejo.</li>
            ) : (
              solicitudes.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className={`ps-fila ${s.id === seleccionadaId ? "ps-fila--activa" : ""}`}
                    aria-pressed={s.id === seleccionadaId}
                    onClick={() => elegir(s.id)}
                  >
                    <span className="ps-folio">{s.folio}</span>
                    <span className="ps-nombre">{s.nombre}</span>
                    <span className="ps-accion">Ver</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      {/* Detalle de la solicitud elegida */}
      <section className="ps-detalle" ref={detalleRef}>
        <div className="ps-detalle-cuerpo">
          {seleccionada ? (
            <>
              <h2 className="ps-detalle-titulo">{seleccionada.nombre}</h2>
              <dl className="ps-datos">
                {(seleccionada.detalles ?? []).map(
                  ([etiqueta, valor]) => (
                    <div key={etiqueta} style={{ display: "contents" }}>
                      <dt>{etiqueta}</dt>
                      <dd>{valor}</dd>
                    </div>
                  )
                )}
              </dl>

              {/* Los documentos se pueden abrir aparte o previsualizar en el expediente */}
              <h3 className="ps-subtitulo">Documentos ({seleccionada.documentos?.length ?? 0})</h3>
              <ul className="ps-documentos">
                {(seleccionada.documentos ?? []).map((doc) => (
                  <li key={doc.id}>
                    <a href={doc.url} target="_blank" rel="noreferrer">{doc.nombre}</a>
                    <label className="ps-documento-revision">
                      <input
                        type="checkbox"
                        checked={Boolean(documentosRevisados[doc.id])}
                        onChange={(e) =>
                          setDocumentosRevisados((actuales) => ({
                            ...actuales,
                            [doc.id]: e.target.checked,
                          }))
                        }
                      />
                      Revisado y correcto
                    </label>
                    {doc.nombre.toLowerCase().endsWith(".pdf") && (
                      <div className="ps-vista-pdf">
                        <button
                          type="button"
                          className="ps-vista-pdf-boton"
                          aria-expanded={documentoPrevisualizadoId === doc.id}
                          aria-controls={`recepcion-pdf-${doc.id}`}
                          onClick={() =>
                            setDocumentoPrevisualizadoId((actual) => actual === doc.id ? null : doc.id)
                          }
                        >
                          {documentoPrevisualizadoId === doc.id ? "Cerrar vista previa" : "Previsualizar PDF"}
                        </button>
                        {documentoPrevisualizadoId === doc.id && (
                          <iframe
                            id={`recepcion-pdf-${doc.id}`}
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
            <p className="ps-vacio">Selecciona una solicitud con “Ver” para revisarla.</p>
          )}
        </div>

        {seleccionadaPendiente ? (
          <>
            <div className="ps-observaciones">
              <label htmlFor="ps-faltantes">Faltantes u observaciones (obligatorio para rechazar)</label>
              <textarea
                id="ps-faltantes"
                value={faltantes}
                onChange={(e) => setFaltantes(e.target.value)}
                placeholder="Ej. Falta la CURP actualizada; la identificación oficial está vencida."
              />
            </div>
            <div className="ps-acciones">
              <button
                type="button"
                className="ps-boton ps-boton--secundario"
                disabled={!faltantes.trim()}
                onClick={() => onRechazar?.(seleccionada.id, faltantes.trim())}
              >
                Rechazar solicitud
              </button>
              <button
                type="button"
                className="ps-boton ps-boton--primario"
                onClick={() => onAceptar?.(seleccionada.id)}
              >
                Aceptar solicitud
              </button>
            </div>
          </>
        ) : seleccionada ? (
          <p className="ps-estado-aprobado">Documentación aprobada; pasó a dictamen jurídico.</p>
        ) : null}
      </section>
    </div>
  );
}
