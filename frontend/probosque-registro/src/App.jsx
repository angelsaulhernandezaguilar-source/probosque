import { useState } from "react";
import { HashRouter, Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { ESTADOS, ESTADO_CORTO, ETIQUETA_ESTADO, TONO_ESTADO, nombrePrograma, normalizarProgramaId } from "./datos/catalogos";
import { camposDeConvocatoria, etiquetaCompleta, formatearRespuesta, formularioDePrograma } from "./datos/camposFormulario";
import { ROLES, descripcionDeUsuario, seccionesDe } from "./datos/usuarios";
import { ProveedorAlmacen, useAlmacen } from "./estado/Almacen";
import { ProveedorSesion, useSesion } from "./estado/Sesion";
import EnlaceUbicacion from "./componentes/EnlaceUbicacion";
import Convocatorias from "./paginas/Convocatorias";
import Documento from "./paginas/Documento";
import Estatus from "./paginas/Estatus";
import Ingreso from "./paginas/Ingreso";
import Listados from "./paginas/Listados";
import { calcularApoyo, estadoConvocatoria, fechaLarga, pesos, solicitudDelMismoPredio } from "./utilidades/reglas";
import EmisionDictamenes from "./vistas/EmisionDictamenes";
import PublicacionConvocatorias from "./vistas/PublicacionConvocatorias";
import RecepcionSolicitudes from "./vistas/RecepcionSolicitudes";
import RegistroConvocatoria from "./vistas/RegistroConvocatoria";
import "./App.css";

// Cada "Ruta..." conecta una vista con el almacén: la vista solo dibuja y avisa.

// Aviso de error o de "enviando..." arriba de una pantalla
const Aviso = ({ texto }) =>
  texto ? <p className="app-aviso app-aviso--suelto" role="status">{texto}</p> : null;

// Ruta protegida: solo entra quien inició sesión con uno de los roles permitidos.
// Sin sesión manda a "Ingresar" (y recuerda a dónde iba); con otro rol avisa que no tiene acceso.
function Protegida({ roles, children }) {
  const { usuario } = useSesion();
  const ubicacion = useLocation();
  if (!usuario) {
    const volver = encodeURIComponent(ubicacion.pathname + ubicacion.search);
    return <Navigate to={`/ingresar?volver=${volver}`} replace />;
  }
  if (!roles.includes(usuario.rol)) {
    return (
      <div className="app-pagina app-pagina--angosta">
        <h1 className="app-titulo">Sin acceso</h1>
        <p className="app-vacio">
          Esta pantalla no corresponde a tu cuenta ({descripcionDeUsuario(usuario)}). Usa las secciones de la
          barra superior o cierra sesión para entrar con otra cuenta.
        </p>
      </div>
    );
  }
  return children;
}

function RutaPublicar() {
  const { publicarConvocatoria } = useAlmacen();
  const navegar = useNavigate();
  const [aviso, setAviso] = useState("");
  return (
    <>
      <Aviso texto={aviso} />
      <PublicacionConvocatorias
        onVolver={() => navegar("/")}
        onPublicar={async (formData) => {
          setAviso("Publicando convocatoria...");
          try {
            await publicarConvocatoria({
              programa: formData.get("programa"),
              fechaApertura: formData.get("fechaApertura"),
              fechaClausura: formData.get("fechaClausura"),
              reglas: formData.get("reglas"), // el archivo completo: Django lo guarda en media/
              archivoConvocatoria: formData.get("archivoConvocatoria"),
            });
            navegar("/");
          } catch (error) {
            setAviso(`No se publicó: ${error.message}`);
          }
        }}
      />
    </>
  );
}

function RutaRegistro() {
  const { id } = useParams();
  const { convocatorias, solicitudes, cargando, registrarSolicitud } = useAlmacen();
  const { usuario } = useSesion();
  const navegar = useNavigate();
  const [aviso, setAviso] = useState("");
  const [enviando, setEnviando] = useState(false);
  const convocatoria = convocatorias.find((c) => c.id === Number(id));

  if (cargando) return <Aviso texto="Cargando convocatoria..." />;
  if (!convocatoria || estadoConvocatoria(convocatoria) !== "abierta") {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <Aviso texto={aviso} />
      <RegistroConvocatoria
        nombrePrograma={nombrePrograma(convocatoria.programa)}
        formato={formularioDePrograma(convocatoria.programa)?.nombre}
        solicitante={usuario.nombre}
        fijos={{ correo: usuario.correo }} // la solicitud queda ligada a la cuenta por su correo
        validarPredio={(respuestas) =>
          solicitudDelMismoPredio(solicitudes, convocatoria.id, respuestas.Nombre_predio, respuestas.Municipio_predio)
            ? "Este predio ya tiene una solicitud registrada en esta convocatoria. Un predio no se puede registrar dos veces."
            : ""
        }
        campos={camposDeConvocatoria(convocatoria)}
        conConceptos={normalizarProgramaId(convocatoria.programa) === "plantaciones"}
        onRegresar={() => navegar("/")}
        onFinalizar={async (respuestas, archivos) => {
          if (enviando) return; // evita registrar dos veces si se da doble clic
          setEnviando(true);
          setAviso("Enviando solicitud y documentos...");
          try {
            const solicitud = await registrarSolicitud(convocatoria, respuestas, archivos);
            navegar(`/acuse/${solicitud.folio}?nuevo=1`); // el acuse con folio es el comprobante del registro
          } catch (error) {
            setAviso(`No se registró: ${error.message}`);
            window.scrollTo(0, 0);
          } finally {
            setEnviando(false);
          }
        }}
      />
    </>
  );
}

const respuestasDe = (solicitud) => solicitud.respuestas ?? solicitud;

const nombreCompleto = (solicitud, convocatorias) => {
  const respuestas = respuestasDe(solicitud);
  const nombre = [
    respuestas.nombres,
    respuestas.apellidos,
    respuestas.segundoApellido,
  ].filter(Boolean).join(" ");
  if (nombre) return nombre;
  const convocatoria = convocatorias.find((c) => c.id === solicitud.convocatoriaId);
  const campoInicial = camposDeConvocatoria(convocatoria).find(
    (campo) => campo.tipo !== "file" && campo.tipo !== "checkbox" && respuestas[campo.id]
  );
  return campoInicial
    ? `${campoInicial.etiqueta}: ${formatearRespuesta(campoInicial, respuestas[campoInicial.id])}`
    : solicitud.folio;
};

// Lo que las bandejas muestran del estado de un expediente: píldora corta, texto largo y color
const estadoDe = (s) => ({
  etiquetaEstado: ESTADO_CORTO[s.estado],
  estadoLargo: ETIQUETA_ESTADO[s.estado],
  tono: TONO_ESTADO[s.estado],
});

function RutaRecepcion() {
  const { solicitudes: todas, convocatorias, aceptarSolicitud, rechazarSolicitud } = useAlmacen();
  const { usuario } = useSesion();
  const [aviso, setAviso] = useState("");
  // Cada ventanilla solo ve los expedientes de los municipios que atiende su delegación
  const solicitudes = todas.filter((s) => s.delegacion === usuario.delegacion);

  const prepararSolicitud = (s) => {
    const convocatoria = convocatorias.find((c) => c.id === s.convocatoriaId);
    const respuestas = respuestasDe(s);
    const apoyo = calcularApoyo(s.concepto, s.superficie);
    return {
      id: s.id,
      folio: s.folio,
      nombre: nombreCompleto(s, convocatorias),
      programa: convocatoria ? nombrePrograma(convocatoria.programa) : "",
      ...estadoDe(s),
      poligono: s.poligono,
      documentos: s.documentos,
      detalles: [
        ["Acuse de recepción", <Link key="acuse" to={`/acuse/${s.folio}`}>Ver acuse (PDF)</Link>],
        ["Registrada el", fechaLarga(s.registradaEl)],
        ["Notificar faltantes a más tardar", fechaLarga(s.limiteAvisoFaltantes)], // N5: 10 días naturales
        ["Ubicación del predio", <EnlaceUbicacion key="ubicacion" ubicacion={s.ubicacion} />],
        ...camposDeConvocatoria(convocatoria)
          .filter((campo) => campo.tipo !== "file") // los archivos van en la lista de documentos
          .map((campo) => [
            etiquetaCompleta(campo),
            formatearRespuesta(campo, respuestas[campo.id]),
          ])
          .filter(([, valor]) => valor),
        ...(apoyo ? [["Apoyo calculado", apoyo.total > 0 ? pesos(apoyo.total) : "Solo planta"]] : []),
      ],
    };
  };

  const pendientes = solicitudes
    .filter((s) => s.estado === ESTADOS.RECIBIDA)
    .map(prepararSolicitud);
  const enSubsanacion = solicitudes
    .filter((s) => s.estado === ESTADOS.SUBSANACION)
    .map(prepararSolicitud);
  const atendidas = solicitudes
    .filter((s) => s.estado !== ESTADOS.RECIBIDA && s.estado !== ESTADOS.SUBSANACION)
    .map(prepararSolicitud);

  const folioDe = (id) => solicitudes.find((s) => s.id === id)?.folio;

  return (
    <>
      {aviso && <p className="app-aviso app-aviso--suelto" role="status">{aviso}</p>}
      <RecepcionSolicitudes
        delegacion={usuario.delegacion}
        solicitudes={pendientes}
        enSubsanacion={enSubsanacion}
        atendidas={atendidas}
        onAceptar={async (id) => {
          try {
            await aceptarSolicitud(id);
            setAviso(`${folioDe(id)}: documentación completa. Pasó a dictamen jurídico.`);
          } catch (error) {
            setAviso(`No se guardó: ${error.message}`);
          }
        }}
        onRechazar={async (id, faltantes) => {
          try {
            const limite = await rechazarSolicitud(id, faltantes);
            setAviso(`${folioDe(id)}: documentación incompleta. El solicitante puede subsanar hasta el ${fechaLarga(limite)}.`);
          } catch (error) {
            setAviso(`No se guardó: ${error.message}`);
          }
        }}
      />
    </>
  );
}

function RutaDictamenes() {
  const { solicitudes, convocatorias, dictaminar } = useAlmacen();
  const [aviso, setAviso] = useState("");

  const preparar = (s) => ({
    id: s.id,
    folio: s.folio,
    nombre: nombreCompleto(s, convocatorias),
    programa: nombrePrograma(s.programa),
    ...estadoDe(s),
    documentos: s.documentos,
    plazo: `Dictaminar a más tardar el ${fechaLarga(s.fechaLimiteDictamen)} (45 días hábiles).`, // N5
    // Dictamen ya emitido: se abre como documento y se descarga en PDF
    pie: <Link to={`/dictamen/${s.folio}`}>Ver dictamen en PDF</Link>,
  });
  const enDictamen = solicitudes.filter((s) => s.estado === ESTADOS.EN_DICTAMEN).map(preparar);
  // Emitidos: favorables y desfavorables, cada uno con su estado
  const emitidos = solicitudes
    .filter((s) => s.estado === ESTADOS.JURIDICO_FAVORABLE || s.estado === ESTADOS.NO_FACTIBLE)
    .map(preparar);

  const folioDe = (id) => solicitudes.find((s) => s.id === id)?.folio;

  return (
    <>
      {aviso && <p className="app-aviso app-aviso--suelto" role="status">{aviso}</p>}
      <EmisionDictamenes
        solicitudes={enDictamen}
        emitidos={emitidos}
        onFavorable={async (id, observaciones) => {
          try {
            await dictaminar(id, true, observaciones);
            setAviso(`${folioDe(id)}: dictamen jurídico favorable.`);
          } catch (error) {
            setAviso(`No se guardó: ${error.message}`);
          }
        }}
        onDesfavorable={async (id, observaciones) => {
          try {
            await dictaminar(id, false, observaciones);
            setAviso(`${folioDe(id)}: dictamen desfavorable. Pasó al listado de no factibles.`);
          } catch (error) {
            setAviso(`No se guardó: ${error.message}`);
          }
        }}
      />
    </>
  );
}

function Navegacion() {
  const { solicitudes } = useAlmacen();
  const { usuario, salir } = useSesion();
  const navegar = useNavigate();

  // Pendientes de cada bandeja; la delegación solo cuenta los expedientes de sus municipios
  const pendientes = {
    "/recepcion": solicitudes.filter(
      (s) => s.estado === ESTADOS.RECIBIDA && s.delegacion === usuario?.delegacion
    ).length,
    "/dictamenes": solicitudes.filter((s) => s.estado === ESTADOS.EN_DICTAMEN).length,
    "/listados": solicitudes.filter((s) => s.estado === ESTADOS.JURIDICO_FAVORABLE).length,
  };

  return (
    <header className="app-barra">
      <div className="app-barra-interior">
        <Link className="app-marca" to="/">
          <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
            <path d="M17 3 9 14h4l-6 8h5l-5 7h20l-5-7h5l-6-8h4z" fill="#8fc49a" />
            <rect x="15.5" y="27" width="3" height="5" fill="#8fc49a" />
          </svg>
          <div>
            <strong>PROBOSQUE</strong>
            <span>Convocatorias forestales 2026</span>
          </div>
        </Link>
        {/* El menú cambia con el rol: cada usuario solo ve sus pantallas */}
        <nav className="app-nav" aria-label="Secciones">
          {seccionesDe(usuario).map((e) => (
            <NavLink key={e.a} to={e.a} end={e.a === "/"}>
              <span className="app-nav-texto">
                {e.texto}
                {pendientes[e.a] > 0 && <b className="app-contador">{pendientes[e.a]}</b>}
              </span>
            </NavLink>
          ))}
          {!usuario && <NavLink className="app-nav-ingresar" to="/ingresar">Ingresar</NavLink>}
        </nav>
      </div>
      {/* Quién tiene la sesión iniciada y con qué rol */}
      {usuario && (
        <div className="app-barra-usuario">
          <div>
            <p className="app-usuario">
              <strong>{usuario.nombre}</strong>
              <span>{descripcionDeUsuario(usuario)} · {usuario.correo}</span>
            </p>
            <button
              type="button"
              className="app-enlace"
              onClick={() => {
                salir();
                navegar("/");
              }}
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

function Pie() {
  const { recargar } = useAlmacen();
  return (
    <footer className="app-pie">
      <div className="app-pie-interior">
      <span>Prototipo académico (FPI, ESCOM-IPN). Los datos se guardan en el servidor (API de Django).</span>
      <button type="button" className="app-enlace" onClick={recargar}>
        Recargar datos
      </button>
      </div>
    </footer>
  );
}

// Si el backend está apagado, se avisa en todas las pantallas
function AvisoConexion() {
  const { errorConexion, recargar } = useAlmacen();
  if (!errorConexion) return null;
  return (
    <p className="app-aviso app-aviso--suelto" role="alert">
      {errorConexion}{" "}
      <button type="button" className="app-enlace" onClick={recargar}>Reintentar</button>
    </p>
  );
}

export default function App() {
  const { SOLICITANTE, DIRECCION, DELEGACION, JURIDICO, COMITE } = ROLES;
  return (
    <ProveedorSesion>
      <ProveedorAlmacen>
        <HashRouter>
          <Navegacion />
          <main className="app-principal">
            <AvisoConexion />
            <Routes>
              {/* Públicas */}
              <Route path="/" element={<Convocatorias />} />
              <Route path="/ingresar" element={<Ingreso />} />
              {/* Persona solicitante */}
              <Route path="/registro/:id" element={<Protegida roles={[SOLICITANTE]}><RutaRegistro /></Protegida>} />
              <Route path="/estatus" element={<Protegida roles={[SOLICITANTE]}><Estatus /></Protegida>} />
              <Route path="/acuse/:folio" element={<Protegida roles={[SOLICITANTE, DELEGACION]}><Documento tipo="acuse" /></Protegida>} />
              {/* Personal de PROBOSQUE */}
              <Route path="/publicar" element={<Protegida roles={[DIRECCION]}><RutaPublicar /></Protegida>} />
              <Route path="/recepcion" element={<Protegida roles={[DELEGACION]}><RutaRecepcion /></Protegida>} />
              <Route path="/dictamenes" element={<Protegida roles={[JURIDICO]}><RutaDictamenes /></Protegida>} />
              <Route path="/dictamen/:folio" element={<Protegida roles={[JURIDICO, COMITE]}><Documento tipo="dictamen" /></Protegida>} />
              <Route path="/listados" element={<Protegida roles={[COMITE]}><Listados /></Protegida>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Pie />
        </HashRouter>
      </ProveedorAlmacen>
    </ProveedorSesion>
  );
}
