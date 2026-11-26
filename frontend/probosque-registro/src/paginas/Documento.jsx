import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import DocumentoOficial from "../componentes/DocumentoOficial";
import { camposDeConvocatoria } from "../datos/camposFormulario";
import { ROLES } from "../datos/usuarios";
import { useAlmacen } from "../estado/Almacen";
import { useSesion } from "../estado/Sesion";
import { acuseDe, dictamenDe } from "../utilidades/documentos";
import { descargarPdf } from "../utilidades/pdf";

// Página de un documento con folio: "acuse" (comprobante de recepción) o "dictamen" (jurídico).
// Muestra la hoja en pantalla y la descarga como PDF.
export default function Documento({ tipo }) {
  const { folio } = useParams();
  const [parametros] = useSearchParams();
  const { solicitudes, convocatorias, cargando, dictamenJuridicoDe } = useAlmacen();
  const { usuario } = useSesion();
  const [dictamen, setDictamen] = useState(undefined); // undefined = cargando, null = no tiene
  const [error, setError] = useState("");
  const [descargando, setDescargando] = useState(false);

  const solicitud = solicitudes.find((s) => s.folio === folio?.toUpperCase());
  // Una persona solicitante solo puede ver los documentos de sus propias solicitudes
  const ajena =
    solicitud && usuario.rol === ROLES.SOLICITANTE && solicitud.correo?.toLowerCase() !== usuario.correo.toLowerCase();
  const solicitudId = solicitud && !ajena ? solicitud.id : null;

  useEffect(() => {
    if (tipo !== "dictamen" || !solicitudId) return;
    let vigente = true; // evita guardar una respuesta vieja si se cambió de folio
    dictamenJuridicoDe(solicitudId)
      .then((d) => vigente && setDictamen(d))
      .catch((e) => vigente && setError(e.message));
    return () => {
      vigente = false;
    };
    // dictamenJuridicoDe se crea en cada render del almacén; solo importa el id de la solicitud
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, solicitudId]);

  const regreso = usuario.rol === ROLES.SOLICITANTE ? `/estatus?folio=${folio}` : tipo === "dictamen" ? "/dictamenes" : "/recepcion";

  if (cargando) return <p className="app-aviso app-aviso--suelto" role="status">Cargando documento...</p>;
  if (!solicitud || ajena) {
    return (
      <div className="app-pagina app-pagina--angosta">
        <p className="app-vacio">No hay ninguna solicitud tuya con el folio {folio}.</p>
      </div>
    );
  }

  const convocatoria = convocatorias.find((c) => c.id === solicitud.convocatoriaId);
  const campos = camposDeConvocatoria(convocatoria);

  let documento = null;
  if (tipo === "acuse") documento = acuseDe({ solicitud, convocatoria, campos });
  else if (dictamen) documento = dictamenDe({ solicitud, convocatoria, campos, dictamen });

  const descargar = async () => {
    setDescargando(true);
    setError("");
    try {
      await descargarPdf(documento);
    } catch (e) {
      setError(`No se pudo generar el PDF: ${e.message}`);
    } finally {
      setDescargando(false);
    }
  };

  return (
    <div className="app-pagina">
      {parametros.get("nuevo") && (
        <p className="app-aviso" role="status">
          Registro guardado con el folio <strong>{solicitud.folio}</strong>. Descarga tu acuse: es tu comprobante
          y trae la fecha en que se liberan los dictámenes.
        </p>
      )}
      {error && <p className="app-aviso app-aviso--alerta" role="alert">{error}</p>}

      <div className="doc-barra">
        <Link className="app-enlace" to={regreso}>← Volver</Link>
        {documento && (
          <div className="doc-barra-acciones">
            <button type="button" className="app-boton" onClick={() => window.print()}>Imprimir</button>
            <button type="button" className="app-boton app-boton--primario" disabled={descargando} onClick={descargar}>
              {descargando ? "Generando PDF..." : "Descargar PDF"}
            </button>
          </div>
        )}
      </div>

      {documento ? (
        <DocumentoOficial documento={documento} />
      ) : dictamen === null ? (
        <p className="app-vacio">La solicitud {solicitud.folio} todavía no tiene dictamen jurídico.</p>
      ) : (
        !error && <p className="app-aviso" role="status">Cargando dictamen...</p>
      )}
    </div>
  );
}
