import { useRef, useState } from "react";
import MapaPredio from "../componentes/MapaPredio";
import { mostrarEnCelular } from "../utilidades/pantalla";
import "./PanelSolicitudes.css";

// Una columna de la bandeja: título con contador y las filas de sus expedientes.
// Cada fila muestra el estado del expediente en una píldora de color.
export function GrupoExpedientes({ id, titulo, vacio, expedientes, seleccionadaId, accion = "Ver", onElegir }) {
  return (
    <section className="ps-grupo" aria-labelledby={id}>
      <h2 className="ps-grupo-titulo" id={id}>
        {titulo} <span>{expedientes.length}</span>
      </h2>
      <ul className="ps-lista">
        {expedientes.length === 0 ? (
          <li className="ps-lista-vacia">{vacio}</li>
        ) : (
          expedientes.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className={`ps-fila ${s.id === seleccionadaId ? "ps-fila--activa" : ""}`}
                aria-pressed={s.id === seleccionadaId}
                onClick={() => onElegir(s.id)}
              >
                <span className="ps-fila-arriba">
                  <span className="ps-folio">{s.folio}</span>
                  <span className={`app-etiqueta ps-estado ${s.tono ?? ""}`}>{s.etiquetaEstado}</span>
                </span>
                <span className="ps-nombre">{s.nombre}</span>
                <span className="ps-accion">{accion}</span>
              </button>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

// HU-2.1-01 · Recepción y validación de expedientes (Delegación Regional)
// Cada expediente: { id, folio, nombre, programa, etiquetaEstado, tono, estadoLargo, poligono,
//                    detalles: [[etiqueta, valor], ...], documentos: [{ id, nombre, url }] }
// (etiquetaEstado = texto corto de la píldora; estadoLargo = estado completo en el expediente)
//   solicitudes    → por cotejar (se pueden aceptar o rechazar)
//   enSubsanacion  → se pidieron faltantes y corre el plazo del solicitante
//   atendidas      → ya salieron de la delegación (en dictamen, favorables o no factibles)
export default function RecepcionSolicitudes({
  delegacion,
  solicitudes = [],
  enSubsanacion = [],
  atendidas = [],
  onAceptar,
  onRechazar,
}) {
  // Guardamos solo el id de la solicitud elegida, no el objeto completo
  const [seleccionadaId, setSeleccionadaId] = useState(null);
  const [documentoPrevisualizadoId, setDocumentoPrevisualizadoId] = useState(null);
  const [documentosRevisados, setDocumentosRevisados] = useState({});
  const [faltantes, setFaltantes] = useState(""); // aviso de faltantes que leerá el solicitante

  // Buscamos el objeto completo cada vez que se renderiza
  const seleccionada = [...solicitudes, ...enSubsanacion, ...atendidas].find((s) => s.id === seleccionadaId);
  const seleccionadaPendiente = solicitudes.some((s) => s.id === seleccionadaId);

  const detalleRef = useRef(null); // para bajar al detalle en el celular

  const elegir = (id) => {
    setSeleccionadaId(id);
    setDocumentoPrevisualizadoId(null);
    setDocumentosRevisados({});
    setFaltantes("");
    mostrarEnCelular(detalleRef); // en pantallas angostas el detalle queda abajo de la lista
  };

  const grupo = { seleccionadaId, onElegir: elegir };

  return (
    <div className="ps-pagina">
      <header className="ps-encabezado">
        <h1 className="ps-titulo">Recepción de solicitudes</h1>
        <p className="ps-entrada">
          {delegacion ? `Expedientes de la Delegación Regional Forestal ${delegacion}. ` : ""}
          Coteja los documentos de cada solicitud. Si está completa, pasa a dictamen jurídico; si faltan documentos, escribe cuáles y el solicitante tendrá 5 días hábiles para subsanar.
        </p>
      </header>

      <div className="ps-listas ps-listas--tres">
        <GrupoExpedientes
          {...grupo}
          id="ps-pendientes-titulo"
          titulo="Por cotejar"
          vacio="No hay solicitudes pendientes de cotejo."
          accion="Cotejar"
          expedientes={solicitudes}
        />
        <GrupoExpedientes
          {...grupo}
          id="ps-subsanacion-titulo"
          titulo="En subsanación"
          vacio="Ninguna solicitud está esperando documentos."
          expedientes={enSubsanacion}
        />
        <GrupoExpedientes
          {...grupo}
          id="ps-atendidas-titulo"
          titulo="Atendidas"
          vacio="Aún no hay expedientes turnados."
          expedientes={atendidas}
        />
      </div>

      {/* Detalle de la solicitud elegida */}
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

              {/* El polígono se dibuja con el GeoJSON que guardó Django (HU-1.3-01) */}
              <h3 className="ps-subtitulo">Polígono del predio</h3>
              <MapaPredio poligono={seleccionada.poligono} />

              {/* Los documentos se pueden abrir aparte o previsualizar en el expediente */}
              <h3 className="ps-subtitulo">Documentos ({seleccionada.documentos?.length ?? 0})</h3>
              <ul className="ps-documentos">
                {(seleccionada.documentos ?? []).map((doc) => (
                  <li key={doc.id}>
                    <a href={doc.url} target="_blank" rel="noreferrer">{doc.nombre}</a>
                    {seleccionadaPendiente && (
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
                    )}
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
            <p className="ps-vacio">Selecciona una solicitud para revisar su expediente.</p>
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
          <p className="ps-estado-aprobado">{seleccionada.estadoLargo}</p>
        ) : null}
      </section>
    </div>
  );
}
