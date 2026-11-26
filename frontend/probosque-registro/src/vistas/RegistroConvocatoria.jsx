import { Fragment, useState } from "react";
import { CONCEPTOS } from "../datos/catalogos";
import { campoObligatorio, campoVisible } from "../datos/camposFormulario";
import ZonaArchivo from "../componentes/ZonaArchivo";
import { calcularApoyo, fechaLarga, hoyISO, pesos, validarSuperficie } from "../utilidades/reglas";
import "./RegistroConvocatoria.css";

// ¿El campo tiene respuesta? Sirve para revisar los obligatorios
function tieneValor(campo, valor) {
  if (campo.tipo === "checkbox") return Boolean(valor);
  if (Array.isArray(valor)) return valor.length > 0;
  return valor !== undefined && valor !== null && String(valor).trim() !== "";
}

// Valor inicial de cada tipo de campo
const vacio = (campo) =>
  campo.tipo === "checkbox" ? false : campo.tipo === "checkbox-group" || campo.tipo === "file" ? [] : "";

const Obligatorio = ({ si }) => (si ? <span className="rc-obligatorio" aria-hidden="true"> *</span> : null);

// Props nuevas:
//   formato        → nombre del formato oficial para el encabezado ("FO-PB-501A Solicitud Única - ...")
//   solicitante    → nombre de la cuenta que está registrando (encabezado)
//   fijos          → { campo: valor } que no se pueden editar (el correo de la cuenta)
//   validarPredio  → función(respuestas) que devuelve un mensaje si el predio ya está registrado
export default function RegistroConvocatoria({
  nombrePrograma,
  formato,
  solicitante,
  campos,
  conConceptos = true,
  fijos = {},
  validarPredio,
  onRegresar,
  onFinalizar,
}) {
  // Los campos con "calcular" los llena el sistema a partir de las demás respuestas
  const conCalculados = (actuales) => {
    const siguientes = { ...actuales };
    for (const campo of campos) {
      if (campo.calcular) siguientes[campo.id] = campo.calcular(siguientes) ?? "";
    }
    return siguientes;
  };

  const [respuestas, setRespuestas] = useState(() => conCalculados({ ...fijos }));
  // Los archivos reales (File) van aparte: en respuestas solo queda el nombre para mostrarlo
  const [archivos, setArchivos] = useState({});

  const camposDelPrograma = conConceptos ? campos : campos.filter((campo) => campo.id !== "concepto");
  // "Si aplica": solo se dibujan, validan y envían los campos que aplican con lo ya contestado
  const camposVisibles = camposDelPrograma.filter((campo) => campoVisible(campo, respuestas));

  const actualizarRespuesta = (id, valor) => {
    setRespuestas((actuales) => conCalculados({ ...actuales, [id]: valor }));
  };

  const actualizarArchivos = (campo, lista) => {
    setArchivos((actuales) => ({ ...actuales, [campo.id]: lista }));
    const nombres = lista.map((archivo) => archivo.name);
    actualizarRespuesta(campo.id, campo.multiple ? nombres : nombres[0] ?? "");
  };

  const tieneCampoConcepto = camposVisibles.some((campo) => campo.id === "concepto");
  const tieneCampoSuperficie = camposVisibles.some((campo) => campo.id === "superficie");
  const errorSuperficie =
    conConceptos && tieneCampoConcepto && tieneCampoSuperficie
      ? validarSuperficie(respuestas.concepto ?? "", respuestas.superficie ?? "")
      : "";
  // Un predio no se registra dos veces en la misma convocatoria
  const errorPredio = validarPredio?.(respuestas) ?? "";
  const concepto = CONCEPTOS.find((item) => item.id === respuestas.concepto);
  const apoyo =
    conConceptos && concepto && !errorSuperficie
      ? calcularApoyo(respuestas.concepto, respuestas.superficie)
      : null;

  const faltantes = camposVisibles.filter(
    (campo) => campoObligatorio(campo, respuestas) && !tieneValor(campo, respuestas[campo.id])
  );
  const completo = faltantes.length === 0 && !errorSuperficie && !errorPredio;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!completo) return;
    // Solo viajan las respuestas y los archivos de los campos que aplican
    const ids = new Set(camposVisibles.map((campo) => campo.id));
    const soloVisibles = (objeto) => Object.fromEntries(Object.entries(objeto).filter(([id]) => ids.has(id)));
    onFinalizar?.(soloVisibles(respuestas), soloVisibles(archivos));
  };

  // Dibuja el control de un campo según su tipo
  const control = (campo, id, valor, obligatorio) => {
    switch (campo.tipo) {
      case "radio":
        return (
          <fieldset className="rc-opciones">
            <legend>
              {campo.etiqueta}
              <Obligatorio si={obligatorio} />
            </legend>
            {campo.opciones.map((opcion) => (
              <label key={opcion.valor} className="rc-opcion">
                <input
                  type="radio"
                  name={id}
                  value={opcion.valor}
                  checked={valor === opcion.valor}
                  onChange={() => actualizarRespuesta(campo.id, opcion.valor)}
                />
                {opcion.etiqueta}
              </label>
            ))}
          </fieldset>
        );

      case "checkbox-group":
        return (
          <fieldset className="rc-opciones rc-opciones--lista">
            <legend>
              {campo.etiqueta}
              <Obligatorio si={obligatorio} />
            </legend>
            {campo.opciones.map((opcion) => (
              <label key={opcion.valor} className="rc-opcion">
                <input
                  type="checkbox"
                  checked={valor.includes(opcion.valor)}
                  onChange={(e) => {
                    let elegidas = e.target.checked
                      ? [...valor, opcion.valor]
                      : valor.filter((item) => item !== opcion.valor);
                    // "Ninguno" no se combina con otros grupos: marcar uno quita al otro
                    if (campo.exclusiva && e.target.checked) {
                      elegidas = opcion.valor === campo.exclusiva
                        ? [campo.exclusiva]
                        : elegidas.filter((item) => item !== campo.exclusiva);
                    }
                    actualizarRespuesta(campo.id, elegidas);
                  }}
                />
                {opcion.etiqueta}
              </label>
            ))}
          </fieldset>
        );

      case "checkbox":
        return (
          <div className="rc-declaratoria">
            {campo.ayuda && <p>{campo.ayuda}</p>}
            <label htmlFor={id} className="rc-opcion">
              <input
                id={id}
                type="checkbox"
                checked={Boolean(valor)}
                onChange={(e) => actualizarRespuesta(campo.id, e.target.checked)}
              />
              <span>
                {campo.etiqueta}
                <Obligatorio si={obligatorio} />
              </span>
            </label>
          </div>
        );

      case "file":
        return (
          <>
            <label htmlFor={id}>
              {campo.etiqueta}
              <Obligatorio si={obligatorio} />
            </label>
            <ZonaArchivo
              id={id}
              archivos={archivos[campo.id] ?? []}
              accept={campo.accept}
              multiple={campo.multiple}
              texto={
                campo.multiple && (archivos[campo.id] ?? []).length > 0
                  ? "Arrastra otro archivo para agregarlo"
                  : "Arrastra aquí el archivo o haz clic para elegirlo"
              }
              onCambiar={(lista) => actualizarArchivos(campo, lista)}
            />
          </>
        );

      default:
        return (
          <>
            <label htmlFor={id}>
              {campo.etiqueta}
              <Obligatorio si={obligatorio} />
            </label>
            {campo.tipo === "textarea" ? (
              <textarea id={id} value={valor} onChange={(e) => actualizarRespuesta(campo.id, e.target.value)} />
            ) : campo.tipo === "select" ? (
              <select id={id} value={valor} onChange={(e) => actualizarRespuesta(campo.id, e.target.value)}>
                <option value="">Selecciona una opción</option>
                {campo.opciones.map((opcion) => (
                  <option key={opcion.valor} value={opcion.valor}>
                    {opcion.etiqueta}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={id}
                type={campo.tipo}
                min={campo.tipo === "number" ? "0" : undefined}
                step={campo.tipo === "number" ? "any" : undefined}
                maxLength={campo.maxLength}
                pattern={campo.pattern}
                value={valor}
                // Calculados (delegación) y fijos (correo de la cuenta): se ven, pero no se editan
                readOnly={Boolean(campo.calcular) || campo.id in fijos}
                placeholder={campo.calcular ? "Elige primero el municipio" : undefined}
                aria-invalid={
                  (campo.id === "superficie" && Boolean(errorSuperficie)) ||
                  (campo.id === "Nombre_predio" && Boolean(errorPredio))
                }
                onChange={(e) => actualizarRespuesta(campo.id, e.target.value)}
              />
            )}
            {campo.id === "superficie" && errorSuperficie && <small className="rc-error">{errorSuperficie}</small>}
            {campo.id === "concepto" && concepto && <small className="rc-ayuda">{concepto.nota}</small>}
            {campo.id === "Nombre_predio" && errorPredio && <small className="rc-error" role="alert">{errorPredio}</small>}
            {campo.id in fijos && <small className="rc-ayuda">Es el correo de tu cuenta: ahí llegan las notificaciones.</small>}
          </>
        );
    }
  };

  return (
    <form className="rc-pagina" onSubmit={handleSubmit} noValidate>
      {/* Encabezado del formato oficial: nombre del formato, fecha de recepción y folio */}
      <header className="rc-encabezado">
        {formato && <p className="rc-formato">{formato}</p>}
        <h1 className="rc-titulo">Registro a convocatoria</h1>
        <dl className="rc-encabezado-datos">
          {nombrePrograma && <div><dt>Programa</dt><dd>{nombrePrograma}</dd></div>}
          <div><dt>Fecha de recepción</dt><dd>{fechaLarga(hoyISO())}</dd></div>
          {solicitante && <div><dt>Registra</dt><dd>{solicitante}</dd></div>}
          <div><dt>Folio</dt><dd>Se asigna al finalizar</dd></div>
        </dl>
      </header>
      <p className="rc-programa">
        Llena la Solicitud Única. Las preguntas que no aplican a tu caso no se muestran.
        Al terminar recibes tu folio y un acuse en PDF.
      </p>

      {/* La columna del apoyo estimado solo existe en Plantaciones; sin ella el formulario usa todo el ancho */}
      <div className={`rc-contenido ${conConceptos ? "" : "rc-contenido--solo"}`}>
        <div className="rc-columna rc-columna--datos">
          {camposVisibles.map((campo, indice) => {
            const id = `respuesta-${campo.id}`;
            const valor = respuestas[campo.id] ?? vacio(campo);
            const anterior = camposVisibles[indice - 1];
            const nuevaSeccion = campo.seccion && campo.seccion !== anterior?.seccion;
            const nuevaSubseccion =
              campo.subseccion && (nuevaSeccion || campo.subseccion !== anterior?.subseccion);

            return (
              <Fragment key={campo.id}>
                {nuevaSeccion && <h2 className="rc-grupo">{campo.seccion}</h2>}
                {nuevaSubseccion && <h3 className="rc-subgrupo">{campo.subseccion}</h3>}
                <div className={`rc-campo rc-campo--${campo.ancho ?? "mitad"}`}>
                  {control(campo, id, valor, campoObligatorio(campo, respuestas))}
                  {campo.nota && <small className="rc-ayuda">{campo.nota}</small>}
                </div>
              </Fragment>
            );
          })}
        </div>

        {conConceptos && (
          <div className="rc-columna rc-columna--lado">
            {apoyo ? (
              <div className="rc-apoyo" aria-live="polite">
                <span className="rc-apoyo-titulo">Apoyo estimado</span>
                {apoyo.total > 0 && <strong className="rc-apoyo-total">{pesos(apoyo.total)}</strong>}
                {apoyo.total > 0 ? (
                  <dl>
                    <div><dt>1ª ministración (70%)</dt><dd>{pesos(apoyo.primera)}</dd></div>
                    <div><dt>2ª ministración (30%)</dt><dd>{pesos(apoyo.segunda)}</dd></div>
                  </dl>
                ) : (
                  <p>Este concepto no incluye recurso económico: se entrega planta.</p>
                )}
              </div>
            ) : (
              <p className="rc-apoyo-vacio">Elige el concepto y la superficie para ver el apoyo estimado.</p>
            )}
          </div>
        )}
      </div>

      {errorPredio && faltantes.length === 0 && (
        <p className="rc-pendientes" role="status">{errorPredio}</p>
      )}

      {!completo && faltantes.length > 0 && (
        <p className="rc-pendientes" role="status">
          Faltan {faltantes.length} {faltantes.length === 1 ? "dato obligatorio" : "datos obligatorios"}:{" "}
          {faltantes.slice(0, 3).map((campo) => campo.subseccion ? `${campo.subseccion}: ${campo.etiqueta}` : campo.etiqueta).join(" · ")}
          {faltantes.length > 3 ? " · …" : ""}
        </p>
      )}

      <div className="rc-acciones">
        {onRegresar && (
          <button type="button" className="rc-boton rc-boton--secundario" onClick={onRegresar}>
            Regresar
          </button>
        )}
        <button type="submit" className="rc-boton rc-boton--primario" disabled={!completo}>
          Finalizar registro
        </button>
      </div>
    </form>
  );
}
