import { useEffect, useState } from "react";
import { ESTADOS, nombrePrograma, siglasPrograma } from "../datos/catalogos";
import { useAlmacen } from "../estado/Almacen";
import { guardarListado, leerListado } from "../estado/listados";
import {
  asignarPresupuesto,
  ETIQUETA_RESULTADO,
  folioProyecto,
  ordenCronologico,
  RESULTADO,
} from "../utilidades/listados";
import { calcularApoyo, fechaLarga, hoyISO, pesos } from "../utilidades/reglas";
import "./Listados.css";

const TONO = {
  [RESULTADO.ESPERA]: "app-etiqueta--alerta",
  [RESULTADO.SIN_MONTO]: "app-etiqueta--cerrada",
};

const nombreDe = (s) =>
  [s.nombres, s.apellidos, s.segundoApellido].filter(Boolean).join(" ") || s.razonSocial || s.folio;

// HU-2.5-01 · Consolidación y aprobación de listados (Instancia Ejecutora y Comité de Admisión).
// 1) Listado preliminar: las solicitudes con dictamen jurídico favorable, en el orden en que llegaron.
// 2) Suficiencia presupuestal: se captura el techo y cada solicitud aprobada le resta su monto;
//    la que ya no alcanza queda en lista de espera.
// 3) Listado definitivo: al aprobarlo, cada solicitud aprobada recibe su folio de proyecto.
export default function Listados() {
  const { solicitudes, convocatorias, cargando } = useAlmacen();
  const [convocatoriaId, setConvocatoriaId] = useState(null);
  const [listado, setListado] = useState({ techo: "", montos: {} });

  const elegir = (id) => {
    setConvocatoriaId(id);
    setListado(leerListado(id));
  };

  // Al cargar se abre la primera convocatoria que ya tiene solicitudes dictaminadas
  useEffect(() => {
    if (convocatoriaId !== null || convocatorias.length === 0) return;
    const conDictamen = convocatorias.find((c) =>
      solicitudes.some((s) => s.convocatoriaId === c.id && s.estado === ESTADOS.JURIDICO_FAVORABLE)
    );
    elegir((conDictamen ?? convocatorias[0]).id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convocatorias, solicitudes]);

  const cambiar = (parcial) => {
    const nuevo = { ...listado, ...parcial };
    setListado(nuevo);
    guardarListado(convocatoriaId, nuevo);
  };

  const convocatoria = convocatorias.find((c) => c.id === convocatoriaId);
  const delPrograma = solicitudes.filter((s) => s.convocatoriaId === convocatoriaId);
  const rechazadas = delPrograma.filter((s) => s.estado === ESTADOS.NO_FACTIBLE);
  const enTramite = delPrograma.filter(
    (s) => s.estado !== ESTADOS.NO_FACTIBLE && s.estado !== ESTADOS.JURIDICO_FAVORABLE
  ).length;

  // Listado preliminar: en Plantaciones el monto sale del concepto y la superficie;
  // en los demás programas lo captura la Instancia Ejecutora.
  const preliminar = ordenCronologico(delPrograma.filter((s) => s.estado === ESTADOS.JURIDICO_FAVORABLE)).map((s) => {
    const apoyo = calcularApoyo(s.concepto, s.superficie);
    return {
      id: s.id,
      folio: s.folio,
      nombre: nombreDe(s),
      municipio: s.Municipio_predio,
      registradaEl: s.registradaEl,
      montoCalculado: Boolean(apoyo),
      monto: apoyo ? apoyo.total : listado.montos[s.id] ?? "",
    };
  });

  const aprobado = Boolean(listado.aprobadoEl);
  const calculo = asignarPresupuesto(preliminar, listado.techo);
  // Ya aprobado se muestra lo que se aprobó ese día, aunque después cambien los datos
  const filas = aprobado ? listado.filas : calculo.filas;
  const comprometido = aprobado ? listado.comprometido : calculo.comprometido;
  const disponible = aprobado ? listado.disponible : calculo.disponible;
  const cuenta = (resultado) => filas.filter((f) => f.resultado === resultado).length;
  const faltanMontos = cuenta(RESULTADO.SIN_MONTO) > 0;
  const sinTecho = listado.techo === "" || Number(listado.techo) < 0;

  const aprobar = () => {
    if (!window.confirm("¿Aprobar el listado definitivo? Se asignarán los folios de proyecto.")) return;
    let consecutivo = 0;
    const ejercicio = convocatoria.fechaApertura.slice(0, 4);
    cambiar({
      aprobadoEl: hoyISO(),
      comprometido: calculo.comprometido,
      disponible: calculo.disponible,
      filas: calculo.filas.map((f) => ({
        ...f,
        folioProyecto:
          f.resultado === RESULTADO.APROBADA
            ? folioProyecto(siglasPrograma(convocatoria.programa), ejercicio, ++consecutivo)
            : "",
      })),
    });
  };

  const reabrir = () => {
    if (!window.confirm("¿Reabrir el listado? Se descartan los folios de proyecto asignados.")) return;
    cambiar({ aprobadoEl: null, filas: undefined, comprometido: undefined, disponible: undefined });
  };

  if (cargando && convocatorias.length === 0) {
    return <p className="app-aviso app-aviso--suelto" role="status">Cargando solicitudes...</p>;
  }

  return (
    <div className="app-pagina">
      <h1 className="app-titulo">Consolidación y aprobación de listados</h1>
      <p className="app-entrada">
        El listado preliminar reúne las solicitudes con dictamen favorable en el orden en que se recibieron.
        Captura el techo presupuestal: cada solicitud aprobada le resta su monto y las que ya no alcanzan
        quedan en lista de espera.
      </p>

      {convocatorias.length === 0 ? (
        <p className="app-vacio">Todavía no hay convocatorias publicadas.</p>
      ) : (
        <>
          <div className="li-controles">
            <div className="app-campo">
              <label htmlFor="li-convocatoria">Convocatoria</label>
              <select id="li-convocatoria" value={convocatoriaId ?? ""} onChange={(e) => elegir(Number(e.target.value))}>
                {convocatorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {nombrePrograma(c.programa)} {c.fechaApertura.slice(0, 4)}
                  </option>
                ))}
              </select>
            </div>
            <div className="app-campo">
              <label htmlFor="li-techo">Techo presupuestal (MXN)</label>
              <input
                id="li-techo"
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                placeholder="Ej. 1500000"
                value={listado.techo}
                disabled={aprobado}
                onChange={(e) => cambiar({ techo: e.target.value })}
              />
            </div>
          </div>

          <dl className="li-resumen" aria-live="polite">
            <div><dt>Techo presupuestal</dt><dd>{pesos(Number(listado.techo) || 0)}</dd></div>
            <div><dt>Comprometido</dt><dd>{pesos(comprometido)}</dd></div>
            <div className="li-resumen--disponible"><dt>Disponible</dt><dd>{pesos(disponible)}</dd></div>
            <div><dt>Aprobadas</dt><dd>{cuenta(RESULTADO.APROBADA)}</dd></div>
            <div><dt>En espera</dt><dd>{cuenta(RESULTADO.ESPERA)}</dd></div>
            <div><dt>Rechazadas</dt><dd>{rechazadas.length}</dd></div>
          </dl>

          {aprobado && (
            <p className="app-aviso" role="status">
              Listado definitivo aprobado el {fechaLarga(listado.aprobadoEl)}. Las solicitudes aprobadas ya tienen
              folio de proyecto.{" "}
              <button type="button" className="app-enlace" onClick={reabrir}>Reabrir listado</button>
            </p>
          )}

          <h2 className="app-subtitulo">{aprobado ? "Listado definitivo" : "Listado preliminar"}</h2>
          {filas.length === 0 ? (
            <p className="app-vacio">
              Esta convocatoria todavía no tiene solicitudes con dictamen jurídico favorable.
            </p>
          ) : (
            <div className="li-tabla-caja">
              <table className="li-tabla">
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Folio</th>
                    <th scope="col">Solicitante</th>
                    <th scope="col">Recibida</th>
                    <th scope="col" className="li-numero">Monto del apoyo</th>
                    <th scope="col">Resultado</th>
                    <th scope="col" className="li-numero">Presupuesto restante</th>
                    {aprobado && <th scope="col">Folio de proyecto</th>}
                  </tr>
                </thead>
                <tbody>
                  {filas.map((f, i) => (
                    <tr key={f.id}>
                      <td>{i + 1}</td>
                      <td className="li-folio">{f.folio}</td>
                      <td>
                        {f.nombre}
                        {f.municipio && <small>{f.municipio}</small>}
                      </td>
                      <td>{fechaLarga(f.registradaEl)}</td>
                      <td className="li-numero">
                        {aprobado || f.montoCalculado ? (
                          Number(f.monto) > 0 ? pesos(Number(f.monto)) : "Solo planta"
                        ) : (
                          <input
                            type="number"
                            min="0"
                            step="any"
                            inputMode="decimal"
                            aria-label={`Monto del apoyo de ${f.folio}`}
                            placeholder="Monto"
                            value={f.monto}
                            onChange={(e) => cambiar({ montos: { ...listado.montos, [f.id]: e.target.value } })}
                          />
                        )}
                      </td>
                      <td>
                        <span className={`app-etiqueta ${TONO[f.resultado] ?? ""}`}>{ETIQUETA_RESULTADO[f.resultado]}</span>
                      </td>
                      <td className="li-numero">{f.resultado === RESULTADO.SIN_MONTO ? "—" : pesos(f.restante)}</td>
                      {aprobado && <td className="li-folio">{f.folioProyecto || "—"}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!aprobado && filas.length > 0 && (
            <div className="li-acciones">
              <p>
                {sinTecho
                  ? "Captura el techo presupuestal para asignar el listado."
                  : faltanMontos
                    ? "Captura el monto del apoyo de todas las solicitudes para poder aprobar."
                    : "Revisa la asignación. Al aprobar se generan los folios de proyecto."}
              </p>
              <button
                type="button"
                className="app-boton app-boton--primario"
                disabled={sinTecho || faltanMontos}
                onClick={aprobar}
              >
                Aprobar listado definitivo
              </button>
            </div>
          )}

          <h2 className="app-subtitulo">Rechazadas (no factibles)</h2>
          {rechazadas.length === 0 ? (
            <p className="li-nota">Ninguna solicitud de esta convocatoria tiene dictamen desfavorable.</p>
          ) : (
            <ul className="li-rechazadas">
              {rechazadas.map((s) => (
                <li key={s.id}>
                  <span className="li-folio">{s.folio}</span> {nombreDe(s)}
                  <span className="app-etiqueta app-etiqueta--negativa">Rechazada</span>
                </li>
              ))}
            </ul>
          )}

          {enTramite > 0 && (
            <p className="li-nota">
              {enTramite === 1 ? "1 solicitud sigue" : `${enTramite} solicitudes siguen`} en cotejo o dictamen y
              todavía no {enTramite === 1 ? "entra" : "entran"} al listado.
            </p>
          )}
          <p className="li-nota">
            Prototipo: el techo y el listado aprobado se guardan en este navegador mientras el backend no tenga
            los modelos de presupuesto y listados.
          </p>
        </>
      )}
    </div>
  );
}
