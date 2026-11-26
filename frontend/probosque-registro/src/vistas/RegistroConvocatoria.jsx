import { Fragment, useState } from "react";
import { CONCEPTOS } from "../datos/catalogos";
import { campoObligatorio, campoVisible } from "../datos/camposFormulario";
import ZonaArchivo from "../componentes/ZonaArchivo";
import { calcularApoyo, pesos, validarClabe, validarSuperficie } from "../utilidades/reglas";
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

export default function RegistroConvocatoria({
  nombrePrograma,
  campos,
  conConceptos = true,
  onRegresar,
  onFinalizar,
}) {
  const [respuestas, setRespuestas] = useState({});
  // Los archivos reales (File) van aparte: en respuestas solo queda el nombre para mostrarlo
  const [archivos, setArchivos] = useState({});

  const camposDelPrograma = conConceptos ? campos : campos.filter((campo) => campo.id !== "concepto");
  // "Si aplica": solo se dibujan, validan y envían los campos que aplican con lo ya contestado
  const camposVisibles = camposDelPrograma.filter((campo) => campoVisible(campo, respuestas));

  const actualizarRespuesta = (id, valor) => {
    setRespuestas((actuales) => ({ ...actuales, [id]: valor }));
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
  const errorClabe =
    respuestas.clabe && !validarClabe(respuestas.clabe)
      ? "La CLABE debe tener 18 dígitos y un dígito verificador válido."
      : "";
  const concepto = CONCEPTOS.find((item) => item.id === respuestas.concepto);
  const apoyo =
    conConceptos && concepto && !errorSuperficie
      ? calcularApoyo(respuestas.concepto, respuestas.superficie)
      : null;

  const faltantes = camposVisibles.filter(
    (campo) => campoObligatorio(campo, respuestas) && !tieneValor(campo, respuestas[campo.id])
  );
  const completo = faltantes.length === 0 && !errorSuperficie && !errorClabe;

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
                inputMode={campo.id === "clabe" ? "numeric" : undefined}
                value={valor}
                aria-invalid={
                  (campo.id === "superficie" && Boolean(errorSuperficie)) ||
                  (campo.id === "clabe" && Boolean(errorClabe))
                }
                onChange={(e) => actualizarRespuesta(campo.id, e.target.value)}
              />
            )}
            {campo.id === "superficie" && errorSuperficie && <small className="rc-error">{errorSuperficie}</small>}
            {campo.id === "concepto" && concepto && <small className="rc-ayuda">{concepto.nota}</small>}
            {campo.id === "clabe" && errorClabe && <small className="rc-error">{errorClabe}</small>}
          </>
        );
    }
  };

  return (
    <form className="rc-pagina" onSubmit={handleSubmit} noValidate>
      <h1 className="rc-titulo">Registro a convocatoria</h1>
      <p className="rc-programa">
        {nombrePrograma ? `Programa ${nombrePrograma}. ` : ""}
        Llena la Solicitud Única. Las preguntas que no aplican a tu caso no se muestran.
        Al terminar recibes un folio para dar seguimiento.
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
