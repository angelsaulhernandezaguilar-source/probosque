import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ESTADOS, ESTADO_CORTO, ETIQUETA_ESTADO, TONO_ESTADO, nombrePrograma } from "../datos/catalogos";
import { campoVisible, camposDeConvocatoria, etiquetaCompleta, formatearRespuesta } from "../datos/camposFormulario";
import ZonaArchivo from "../componentes/ZonaArchivo";
import { useAlmacen } from "../estado/Almacen";
import { useSesion } from "../estado/Sesion";
import EnlaceUbicacion from "../componentes/EnlaceUbicacion";
import MapaPredio from "../componentes/MapaPredio";
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
              {/* Misma zona de arrastrar y soltar que en el registro */}
              <ZonaArchivo
                id={`sub-${campo.id}`}
                archivos={archivos[campo.id] ?? []}
                accept={campo.accept}
                multiple={campo.multiple}
                texto="Arrastra aquí el archivo corregido o haz clic para elegirlo"
                onCambiar={(lista) =>
                  setArchivos((antes) => {
                    const siguiente = { ...antes, [campo.id]: lista };
                    if (!lista.length) delete siguiente[campo.id]; // si lo deja vacío, se conserva el actual
                    return siguiente;
                  })
                }
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

// Mis solicitudes (necesidad #17): la persona solicitante ve solo las solicitudes
// registradas con el correo de su cuenta y abre la que quiera consultar.
export default function Estatus() {
  const { solicitudes, convocatorias, cargando, reenviarDocumentacion } = useAlmacen();
  const { usuario } = useSesion();
  const [parametros, setParametros] = useSearchParams();

  const mias = solicitudes.filter((s) => s.correo?.toLowerCase() === usuario.correo.toLowerCase());
  const folio = (parametros.get("folio") ?? "").toUpperCase();
  // Con una sola solicitud se abre directo; con varias, la que diga la dirección (?folio=)
  const solicitud = mias.find((s) => s.folio === folio) ?? (mias.length === 1 ? mias[0] : undefined);
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
  const programaDe = (s) => {
    const c = convocatorias.find((item) => item.id === s.convocatoriaId);
    return c ? nombrePrograma(c.programa) : "";
  };

  return (
    <div className="app-pagina app-pagina--angosta">
      <h1 className="app-titulo">Mis solicitudes</h1>
      <p className="app-entrada">
        Aquí están las solicitudes registradas con tu cuenta ({usuario.correo}). Abre una para ver en qué
        paso va tu trámite y descargar tu acuse.
      </p>

      {cargando && mias.length === 0 && <p className="app-aviso" role="status">Cargando tus solicitudes...</p>}

      {!cargando && mias.length === 0 && (
        <p className="app-vacio">
          Todavía no tienes solicitudes. Revisa las <Link to="/">convocatorias abiertas</Link> y regístrate en
          la que te corresponda.
        </p>
      )}

      {folio && !solicitud && mias.length > 0 && (
        <p className="app-aviso app-aviso--alerta" role="status">
          No tienes ninguna solicitud con el folio {folio}.
        </p>
      )}

      {mias.length > 1 && (
        <ul className="estatus-lista">
          {mias.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className={`estatus-fila ${s.id === solicitud?.id ? "estatus-fila--activa" : ""}`}
                aria-pressed={s.id === solicitud?.id}
                onClick={() => setParametros({ folio: s.folio })}
              >
                <span>
                  <strong>{s.folio}</strong>
                  {programaDe(s)}
                </span>
                <span className={`app-etiqueta ${TONO_ESTADO[s.estado] ?? ""}`}>{ESTADO_CORTO[s.estado]}</span>
              </button>
            </li>
          ))}
        </ul>
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
            <span className={`app-etiqueta ${TONO_ESTADO[solicitud.estado] ?? ""}`}>
              {ETIQUETA_ESTADO[solicitud.estado]}
            </span>
          </header>

          {/* Acuse con folio: comprobante de recepción y fecha en que se liberan los dictámenes */}
          <div className="estatus-acuse">
            <p>
              {[ESTADOS.RECIBIDA, ESTADOS.SUBSANACION, ESTADOS.EN_DICTAMEN].includes(solicitud.estado)
                ? <>Los dictámenes se liberan a más tardar el <strong>{fechaLarga(solicitud.fechaLimiteDictamen)}</strong> (45 días hábiles).</>
                : "Tu solicitud ya fue dictaminada."}
            </p>
            <Link className="app-boton" to={`/acuse/${solicitud.folio}`}>Ver acuse (PDF)</Link>
          </div>

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
              campos={campos.filter((campo) => campo.tipo === "file" && campoVisible(campo, respuestas))}
              onReenviar={reenviarDocumentacion}
            />
          )}

          <h3 className="app-subtitulo">Polígono del predio</h3>
          <MapaPredio poligono={solicitud.poligono} />

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
                  <dt>{etiquetaCompleta(campo)}</dt>
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
