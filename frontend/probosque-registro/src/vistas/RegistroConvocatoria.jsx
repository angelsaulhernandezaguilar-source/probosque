import { Fragment, useState } from "react";
import { CONCEPTOS } from "../datos/catalogos";
import { formatearRespuesta } from "../datos/camposFormulario";
import { calcularApoyo, pesos, validarClabe, validarSuperficie } from "../utilidades/reglas";
import "./RegistroConvocatoria.css";

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
  const camposVisibles = conConceptos
    ? campos
    : campos.filter((campo) => campo.id !== "concepto");

  const actualizarRespuesta = (id, valor) => {
    setRespuestas((actuales) => ({ ...actuales, [id]: valor }));
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

  const completo =
    camposVisibles.every((campo) => {
      if (!campo.obligatorio) return true;
      const valor = respuestas[campo.id];
      if (campo.tipo === "checkbox") return Boolean(valor);
      if (campo.tipo === "checkbox-group") return Array.isArray(valor) && valor.length > 0;
      return Array.isArray(valor)
        ? valor.length > 0
        : valor !== undefined && valor !== null && String(valor).trim() !== "";
    }) && !errorSuperficie && !errorClabe;

  const handleSubmit = (e) => {
    e.preventDefault();
    onFinalizar?.(respuestas, archivos);
  };

  return (
    <form className="rc-pagina" onSubmit={handleSubmit}>
      <h1 className="rc-titulo">Registro a convocatoria</h1>
      <p className="rc-programa">
        {nombrePrograma ? `Programa ${nombrePrograma}. ` : ""}
        Llena los campos solicitados para esta convocatoria. Al terminar recibes un folio para dar seguimiento.
      </p>

      <div className="rc-contenido">
        <div className="rc-columna rc-columna--datos">
          <h2 className="rc-grupo">Datos de la solicitud</h2>
          {camposVisibles.map((campo, indice) => {
            const id = `respuesta-${campo.id}`;
            const valor = respuestas[campo.id] ?? (
              campo.tipo === "checkbox"
                ? false
                : campo.tipo === "checkbox-group"
                  ? []
                  : ""
            );
            const anchoCompleto = ["textarea", "select", "file", "checkbox-group"].includes(campo.tipo);

            return (
              <Fragment key={campo.id}>
                {campo.seccion && campo.seccion !== camposVisibles[indice - 1]?.seccion && (
                  <h2 className="rc-grupo rc-campo--ancho">{campo.seccion}</h2>
                )}
                <div className={`rc-campo ${anchoCompleto ? "rc-campo--ancho" : ""}`}>
                {campo.tipo === "checkbox-group" ? (
                  <fieldset className="rc-checkbox-grupo">
                    <legend>
                      {campo.etiqueta}
                      {campo.obligatorio ? " *" : ""}
                    </legend>
                    {(campo.opciones ?? []).map((opcion) => (
                      <label key={opcion.valor}>
                        <input
                          type="checkbox"
                          checked={valor.includes(opcion.valor)}
                          onChange={(e) => {
                            const seleccionadas = e.target.checked
                              ? [...valor, opcion.valor]
                              : valor.filter((item) => item !== opcion.valor);
                            actualizarRespuesta(campo.id, seleccionadas);
                          }}
                        />
                        {opcion.etiqueta}
                      </label>
                    ))}
                  </fieldset>
                ) : campo.tipo === "checkbox" ? (
                  <label htmlFor={id}>
                    <input
                      id={id}
                      type="checkbox"
                      checked={Boolean(valor)}
                      required={campo.obligatorio}
                      onChange={(e) => actualizarRespuesta(campo.id, e.target.checked)}
                    />
                    {campo.etiqueta}
                    {campo.obligatorio ? " *" : ""}
                  </label>
                ) : (
                  <>
                    <label htmlFor={id}>
                      {campo.etiqueta}
                      {campo.obligatorio ? " *" : ""}
                    </label>
                    {campo.tipo === "textarea" ? (
                      <textarea
                        id={id}
                        value={valor}
                        required={campo.obligatorio}
                        onChange={(e) => actualizarRespuesta(campo.id, e.target.value)}
                      />
                    ) : campo.tipo === "select" ? (
                      <select
                        id={id}
                        value={valor}
                        required={campo.obligatorio}
                        onChange={(e) => actualizarRespuesta(campo.id, e.target.value)}
                      >
                        <option value="">Selecciona una opción</option>
                        {(campo.opciones ?? []).map((opcion) => (
                          <option key={opcion.valor} value={opcion.valor}>
                            {opcion.etiqueta}
                          </option>
                        ))}
                      </select>
                    ) : campo.tipo === "file" ? (
                      <>
                        <input
                          id={id}
                          type="file"
                          accept={campo.accept}
                          multiple={campo.multiple}
                          required={campo.obligatorio}
                          onChange={(e) => {
                            const elegidos = Array.from(e.target.files ?? []);
                            setArchivos((actuales) => ({ ...actuales, [campo.id]: elegidos }));
                            const nombres = elegidos.map((archivo) => archivo.name);
                            actualizarRespuesta(
                              campo.id,
                              campo.multiple ? nombres : nombres[0] ?? ""
                            );
                          }}
                        />
                        {valor.length > 0 && (
                          <small className="rc-ayuda">
                            {formatearRespuesta(campo, valor)}
                          </small>
                        )}
                      </>
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
                        required={campo.obligatorio}
                        aria-invalid={
                          (campo.id === "superficie" && Boolean(errorSuperficie)) ||
                          (campo.id === "clabe" && Boolean(errorClabe))
                        }
                        onChange={(e) => actualizarRespuesta(campo.id, e.target.value)}
                      />
                    )}
                    {campo.id === "superficie" && errorSuperficie && (
                      <small className="rc-error">{errorSuperficie}</small>
                    )}
                    {campo.id === "concepto" && concepto && (
                      <small className="rc-ayuda">{concepto.nota}</small>
                    )}
                    {campo.id === "clabe" && errorClabe && (
                      <small className="rc-error">{errorClabe}</small>
                    )}
                  </>
                )}
                </div>
              </Fragment>
            );
          })}
        </div>

        <div className="rc-columna rc-columna--lado">
          {apoyo && (
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
          )}
        </div>
      </div>

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
