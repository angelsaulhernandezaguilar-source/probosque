import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { pedir } from "../api/cliente";

// El estado ya no vive en localStorage: se pide a la API de Django.
// Este archivo traduce entre los nombres del frontend (camelCase) y los de la API (snake_case),
// así las pantallas siguen recibiendo los datos con la misma forma de antes y no hubo que cambiarlas.

// Campos del formulario que en Django son columnas propias de Solicitud.
// Todo lo demás (superficie, concepto, CLABE...) viaja dentro de datos_programa.
const COLUMNAS = {
  tipoPersona: "tipo_persona",
  nombres: "nombres",
  apellidos: "primer_apellido",
  segundoApellido: "segundo_apellido",
  telefono: "telefono",
  correo: "correo",
  delegacion: "delegacion",
  Municipio_predio: "municipio",
};

// ---------- De la API al frontend ----------

const nombreDeArchivo = (url) => (url ? decodeURIComponent(url.split("/").pop()) : "");

function convocatoriaDesdeApi(c) {
  return {
    id: c.id,
    programa: c.programa,
    fechaApertura: c.fecha_apertura,
    fechaClausura: c.fecha_clausura,
    texto: c.texto,
    archivoConvocatoriaUrl: c.archivo_convocatoria,
    archivoConvocatoriaNombre: nombreDeArchivo(c.archivo_convocatoria),
    publicadaEl: c.fecha_publicacion,
    reglasNombre: nombreDeArchivo(c.reglas_operacion) || "Sin archivo",
    reglasUrl: c.reglas_operacion, // HU-1.1-02: el público descarga las reglas de operación
  };
}

function solicitudDesdeApi(s) {
  const respuestas = { ...s.datos_programa };
  for (const [campoFront, campoApi] of Object.entries(COLUMNAS)) {
    respuestas[campoFront] = s[campoApi];
  }
  // Cada documento se muestra en el campo de archivo de donde salió (tipo = id del campo)
  for (const documento of s.documentos) {
    const anterior = respuestas[documento.tipo];
    respuestas[documento.tipo] = anterior ? [].concat(anterior, documento.nombre) : documento.nombre;
  }
  return {
    ...respuestas, // las pantallas leen s.concepto, s.superficie... directo
    respuestas,
    id: s.id,
    folio: s.folio,
    convocatoriaId: s.convocatoria,
    registradaEl: s.fecha_registro,
    estado: s.estado,
    limiteSubsanacion: s.limite_subsanacion,
    historial: s.historial,
    // Documentos con su URL para abrirlos (Recepción y Dictámenes)
    documentos: s.documentos.map((d) => ({ id: d.id, tipo: d.tipo, nombre: d.nombre, url: d.archivo })),
    ubicacion: s.ubicacion, // GeoJSON { type: "Point", coordinates: [longitud, latitud] } o null
    limiteAvisoFaltantes: s.limite_aviso_faltantes, // N5: plazos calculados por Django
    fechaLimiteDictamen: s.fecha_limite_dictamen,
  };
}

const Contexto = createContext(null);

export function ProveedorAlmacen({ children }) {
  const [convocatorias, setConvocatorias] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorConexion, setErrorConexion] = useState("");

  // Pide las convocatorias y las solicitudes al mismo tiempo (como dos fetch con Promise.all en Node)
  const recargar = useCallback(async () => {
    setCargando(true);
    try {
      const [listaConvocatorias, listaSolicitudes] = await Promise.all([
        pedir("/convocatorias/"),
        pedir("/solicitudes/"),
      ]);
      setConvocatorias(listaConvocatorias.map(convocatoriaDesdeApi));
      setSolicitudes(listaSolicitudes.map(solicitudDesdeApi));
      setErrorConexion("");
    } catch (error) {
      setErrorConexion(error.message);
    } finally {
      setCargando(false);
    }
  }, []);

  // Se ejecuta una vez, cuando se abre la aplicación
  useEffect(() => {
    recargar();
  }, [recargar]);

  // Reemplaza una solicitud en la lista con la versión que regresó Django
  const actualizar = (solicitudApi) => {
    const solicitud = solicitudDesdeApi(solicitudApi);
    setSolicitudes((actuales) => actuales.map((s) => (s.id === solicitud.id ? solicitud : s)));
    return solicitud;
  };

  const acciones = {
    recargar,

    // Dirección General · HU-1.1-01
    async publicarConvocatoria({ programa, fechaApertura, fechaClausura, reglas, archivoConvocatoria }) {
      const datos = new FormData(); // FormData porque lleva los archivos de la convocatoria
      datos.append("programa", programa);
      datos.append("fecha_apertura", fechaApertura);
      datos.append("fecha_clausura", fechaClausura);
      datos.append("archivo_convocatoria", archivoConvocatoria);
      if (reglas) datos.append("reglas_operacion", reglas);
      const creada = convocatoriaDesdeApi(await pedir("/convocatorias/", { metodo: "POST", datos }));
      setConvocatorias((actuales) => [...actuales, creada]);
      return creada;
    },

    // Solicitante · HU-1.2-01 y HU-1.3-01
    // respuestas: { campo: valor }   archivos: { campo: [File, File...] }
    async registrarSolicitud(convocatoria, respuestas, archivos = {}) {
      // 1) Crear la solicitud con los datos (JSON)
      const cuerpo = { convocatoria: convocatoria.id, datos_programa: {} };
      for (const [campo, valor] of Object.entries(respuestas)) {
        if (campo in archivos) continue; // los archivos se suben en el paso 2
        if (COLUMNAS[campo]) cuerpo[COLUMNAS[campo]] = valor;
        else cuerpo.datos_programa[campo] = valor;
      }
      const creada = await pedir("/solicitudes/", { metodo: "POST", datos: cuerpo });

      // 2) Subir cada archivo, ligado a la solicitud recién creada
      for (const [tipo, lista] of Object.entries(archivos)) {
        for (const archivo of lista) {
          const datos = new FormData();
          datos.append("solicitud", creada.id);
          datos.append("tipo", tipo);
          datos.append("archivo", archivo);
          await pedir("/documentos/", { metodo: "POST", datos });
        }
      }

      // 3) Volver a pedirla para tenerla completa, ya con sus documentos
      const solicitud = solicitudDesdeApi(await pedir(`/solicitudes/${creada.id}/`));
      setSolicitudes((actuales) => [...actuales, solicitud]);
      return solicitud;
    },

    // Solicitante: atiende los faltantes dentro del plazo.
    // archivos: { campo: [File, ...] }. Cada campo que se manda sustituye a sus archivos anteriores.
    async reenviarDocumentacion(id, archivos = {}) {
      const datos = new FormData();
      for (const [tipo, lista] of Object.entries(archivos)) {
        for (const archivo of lista) datos.append(tipo, archivo); // mismo nombre de campo = varios archivos
      }
      actualizar(await pedir(`/solicitudes/${id}/reenviar/`, { metodo: "POST", datos }));
    },

    // Delegación Regional · HU-2.1-01
    async aceptarSolicitud(id) {
      actualizar(await pedir(`/expedientes/${id}/aceptar/`, { metodo: "POST" }));
    },
    async rechazarSolicitud(id, faltantes) {
      const solicitud = actualizar(
        await pedir(`/expedientes/${id}/rechazar/`, { metodo: "POST", datos: { faltantes } })
      );
      return solicitud.limiteSubsanacion; // Django calcula el plazo (5 días hábiles)
    },

    // Unidad Jurídica · HU-2.4-01
    async dictaminar(id, favorable, observaciones = "") {
      await pedir("/dictamenes/", {
        metodo: "POST",
        datos: { solicitud: id, tipo: "JURIDICO", resultado: favorable ? "FAVORABLE" : "DESFAVORABLE", observaciones },
      });
      actualizar(await pedir(`/solicitudes/${id}/`)); // el dictamen cambió el estado: se pide de nuevo
    },
  };

  return (
    <Contexto.Provider value={{ convocatorias, solicitudes, cargando, errorConexion, ...acciones }}>
      {children}
    </Contexto.Provider>
  );
}

export const useAlmacen = () => useContext(Contexto);
