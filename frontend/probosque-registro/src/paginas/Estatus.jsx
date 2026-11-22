import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ESTADOS, ETIQUETA_ESTADO, nombrePrograma } from "../datos/catalogos";
import { camposDeConvocatoria, formatearRespuesta } from "../datos/camposFormulario";
import { useAlmacen } from "../estado/Almacen";
import EnlaceUbicacion from "../componentes/EnlaceUbicacion";
import { calcularApoyo, fechaLarga, pesos } from "../utilidades/reglas";

// Qué mostrar en cada paso de la ruta según el estado de la solicitud
const RUTA = {
  [ESTADOS.RECIBIDA]: ["hecho", "actual", "", ""],
  [ESTADOS.SUBSANACION]: ["hecho", "alerta", "", ""],
  [ESTADOS.EN_DICTAMEN]: ["hecho", "hecho", "actual", ""],
  [ESTADOS.JURIDICO_FAVORABLE]: ["hecho", "hecho", "hecho", "actual"],
  [ESTADOS.NO_FACTIBLE]: ["hecho", "hecho", "negativo", ""],
};

const PASOS = [
  ["Registro", "Enviaste tu solicitud"],
  ["Cotejo", "La delegación revisa tus documentos"],
  ["Dictamen jurídico", "La Unidad jurídica revisa tu expediente"],
  ["Comité", "Dictamen técnico y listados de resultados"],
];

const TONO = {
  [ESTADOS.SUBSANACION]: "app-etiqueta--alerta",
  [ESTADOS.NO_FACTIBLE]: "app-etiqueta--negativa",
};

// Subsanación: el solicitante ve qué le pidió la delegación y cambia solo los archivos que hagan falta.
// Los campos que deje vacíos conservan su archivo actual.
function Subsanacion({ solicitud, campos, onReenviar }) {
  const [archivos, setArchivos] = useState({}); // { campo: [File, ...] }
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  // La nota del último rechazo dice qué falta (la escribió la delegación en Recepción)
  const rechazo = [...solicitud.historial].reverse().find((h) => h.estado === ESTADOS.SUBSANACION);
  const elegidos = Object.values(archivos).flat().length;

  const reenviar = async () => {
    if (!elegidos && !window.confirm("No elegiste archivos nuevos. ¿Reenviar la documentación como está?")) return;
    setEnviando(true);
    setError("");
    try {
      await onReenviar(solicitud.id, archivos); // al cambiar el estado, este bloque desaparece solo
    } catch (e) {
      setError(e.message);
      setEnviando(false);
    }
  };

  return (
    <div className="app-aviso app-aviso--alerta">
      <p>
        Tu documentación está incompleta. Tienes hasta el{" "}
        <strong>{fechaLarga(solicitud.limiteSubsanacion)}</strong> (5 días hábiles) para
        subsanarla; después la solicitud se desecha.
      </p>
      {rechazo && <p><strong>Lo que pidió la delegación:</strong> {rechazo.nota}</p>}

      <p>Sube solo los archivos que vas a corregir; el nuevo sustituye al anterior.</p>
      <ul className="estatus-archivos">
        {campos.map((campo) => {
          const actuales = solicitud.documentos.filter((d) => d.tipo === campo.id);
          return (
            <li key={campo.id}>
              <label htmlFor={`sub-${campo.id}`}>{campo.etiqueta}</label>
              <small>
                Actual:{" "}
                {actuales.length
                  ? actuales.map((d, i) => (
                      <span key={d.id}>
                        {i > 0 && ", "}
                        <a href={d.url} target="_blank" rel="noreferrer">{d.nombre}</a>
                      </span>
                    ))
                  : "sin archivo"}
              </small>
              <input
                id={`sub-${campo.id}`}
                type="file"
                accept={campo.accept}
                multiple={campo.multiple}
                onChange={(e) => {
                  const lista = Array.from(e.target.files ?? []);
                  setArchivos((antes) => {
                    const siguiente = { ...antes, [campo.id]: lista };
                    if (!lista.length) delete siguiente[campo.id]; // si lo deja vacío, se conserva el actual
                    return siguiente;
                  });
                }}
              />
            </li>
          );
        })}
      </ul>

      {error && <p role="alert"><strong>No se reenvió:</strong> {error}</p>}
      <button type="button" className="app-boton app-boton--primario" disabled={enviando} onClick={reenviar}>
        {enviando ? "Enviando..." : `Reenviar documentación${elegidos ? ` (${elegidos} archivo(s) nuevo(s))` : ""}`}
      </button>
    </div>
  );
}

// Consulta de estatus por folio (necesidad #17)
export default function Estatus() {
  const { solicitudes, convocatorias, cargando, reenviarDocumentacion } = useAlmacen();
  const [parametros, setParametros] = useSearchParams();
  const folio = (parametros.get("folio") ?? "").toUpperCase();
  const [busqueda, setBusqueda] = useState(folio);

  const solicitud = solicitudes.find((s) => s.folio === folio);
  const convocatoria = solicitud && convocatorias.find((c) => c.id === solicitud.convocatoriaId);
  const respuestas = solicitud && (solicitud.respuestas ?? solicitud);
  const campos = camposDeConvocatoria(convocatoria);
  const nombreSolicitante = respuestas && [
    respuestas.nombres,
    respuestas.apellidos,
    respuestas.segundoApellido,
  ].filter(Boolean).join(" ");
  const campoInicial = respuestas && campos.find(
    (campo) => campo.tipo !== "file" && campo.tipo !== "checkbox" && respuestas[campo.id]
  );
  const apoyo = solicitud && calcularApoyo(solicitud.concepto, solicitud.superficie);

  const buscar = (e) => {
    e.preventDefault();
    setParametros({ folio: busqueda.trim().toUpperCase() });
  };

  return (
    <div className="app-pagina app-pagina--angosta">
      <h1 className="app-titulo">Mi solicitud</h1>
      <p className="app-entrada">Escribe el folio que recibiste al registrarte para ver en qué paso va tu trámite.</p>

      <form className="app-busqueda" onSubmit={buscar}>
        <div className="app-campo">
          <label htmlFor="folio">Folio</label>
          <input
            id="folio"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="PS-2026-0001"
          />
        </div>
        <button type="submit" className="app-boton app-boton--primario" disabled={!busqueda.trim()}>
          Consultar
        </button>
      </form>

      {parametros.get("nuevo") && solicitud && (
        <p className="app-aviso" role="status">
          Registro guardado. Anota tu folio <strong>{solicitud.folio}</strong>: lo necesitas para
          consultar el avance.
        </p>
      )}

      {folio && !solicitud && !cargando && (
        <p className="app-vacio">
          No hay ninguna solicitud con el folio {folio}. Revisa que esté escrito igual que en tu
          comprobante, con guiones.
        </p>
      )}

      {solicitud && (
        <article className="app-panel">
          <p className="estatus-folio">{solicitud.folio}</p>
          <header className="estatus-encabezado">
            <h2>
              {nombreSolicitante ||
                (campoInicial
                  ? `${campoInicial.etiqueta}: ${formatearRespuesta(campoInicial, respuestas[campoInicial.id])}`
                  : solicitud.folio)}
            </h2>
            <span className={`app-etiqueta ${TONO[solicitud.estado] ?? ""}`}>
              {ETIQUETA_ESTADO[solicitud.estado]}
            </span>
          </header>

          <ol className="ruta">
            {PASOS.map(([nombre, detalle], i) => {
              const tipo = RUTA[solicitud.estado][i];
              return (
                <li
                  key={nombre}
                  className={tipo ? `ruta--${tipo}` : undefined}
                  aria-current={tipo === "actual" || tipo === "alerta" ? "step" : undefined}
                >
                  <strong>{nombre}</strong>
                  {detalle}
                </li>
              );
            })}
          </ol>

          {solicitud.estado === ESTADOS.SUBSANACION && (
            <Subsanacion
              solicitud={solicitud}
              campos={campos.filter((campo) => campo.tipo === "file")}
              onReenviar={reenviarDocumentacion}
            />
          )}

          <h3 className="app-subtitulo">Datos de la solicitud</h3>
          <dl className="app-datos">
            <dt>Programa</dt>
            <dd>{convocatoria ? nombrePrograma(convocatoria.programa) : "No disponible"}</dd>
            <dt>Ubicación del predio (centro)</dt>
            <dd><EnlaceUbicacion ubicacion={solicitud.ubicacion} /></dd>
            {campos.map((campo) => {
              const valor = formatearRespuesta(campo, respuestas[campo.id]);
              return valor ? (
                <div key={campo.id} style={{ display: "contents" }}>
                  <dt>{campo.etiqueta}</dt>
                  <dd>{valor}</dd>
                </div>
              ) : null;
            })}
            {apoyo && (
              <>
                <dt>Apoyo estimado</dt>
                <dd>
                  {apoyo.total > 0
                    ? `${pesos(apoyo.total)}: ${pesos(apoyo.primera)} al firmar y ${pesos(apoyo.segunda)} al verificar`
                    : "Sin recurso económico: se entrega planta"}
                </dd>
              </>
            )}
          </dl>

          <h3 className="app-subtitulo">Historial</h3>
          <ol className="app-historial">
            {solicitud.historial.map((h, i) => (
              <li key={i}>
                <time dateTime={h.fecha}>{fechaLarga(h.fecha)}</time>
                <span>{h.nota}</span>
              </li>
            ))}
          </ol>
        </article>
      )}
    </div>
  );
}
