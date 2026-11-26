import { useState } from "react";
import ZonaArchivo from "../componentes/ZonaArchivo";
import { formularioDePrograma, PROGRAMAS_CON_FORMULARIO } from "../datos/camposFormulario";
import "./PublicacionConvocatorias.css";

export default function PublicacionConvocatorias({ onVolver, onPublicar }) {
  const [programa, setPrograma] = useState("");
  const [fechaApertura, setFechaApertura] = useState("");
  const [fechaClausura, setFechaClausura] = useState("");
  const [reglas, setReglas] = useState(null);
  const [archivoConvocatoria, setArchivoConvocatoria] = useState(null);
  const formulario = formularioDePrograma(programa);

  const fechasInvalidas =
    fechaApertura && fechaClausura && fechaClausura < fechaApertura;
  const puedePublicar =
    programa && formulario && fechaApertura && fechaClausura && reglas && archivoConvocatoria && !fechasInvalidas;

  const handleSubmit = (e) => {
    e.preventDefault();
    const datos = new FormData();
    datos.append("programa", programa);
    datos.append("fechaApertura", fechaApertura);
    datos.append("fechaClausura", fechaClausura);
    datos.append("reglas", reglas);
    datos.append("archivoConvocatoria", archivoConvocatoria);
    datos.append("campos", JSON.stringify(formulario.campos));
    onPublicar?.(datos);
  };

  return (
    <form className="pc-pagina" onSubmit={handleSubmit}>
      <h1 className="pc-titulo">Publicación de convocatorias</h1>
      <p className="pc-entrada">
        Elige un programa para asignar automáticamente su formulario de registro.
      </p>

      <section className="pc-caja">
        <h2 className="pc-subtitulo">Parámetros</h2>

        <div className="pc-campo pc-programa">
          <label htmlFor="programa">Programa</label>
          <select
            id="programa"
            value={programa}
            onChange={(e) => setPrograma(e.target.value)}
            required
          >
            <option value="">Selecciona un programa</option>
            {PROGRAMAS_CON_FORMULARIO.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nombre}
              </option>
            ))}
          </select>
        </div>
        {formulario ? (
          <div className="pc-formulario-resumen">
            <strong>Formulario asignado: {formulario.nombre}</strong>
            <details>
              <summary>Ver campos ({formulario.campos.length})</summary>
              <ul>
                {formulario.campos.map((campo) => (
                  <li key={campo.id}>
                    {campo.subseccion ? `${campo.subseccion}: ` : ""}{campo.etiqueta}
                    {campo.visibleSi || typeof campo.obligatorio === "function" ? " (si aplica)" : campo.obligatorio ? " (obligatorio)" : ""}
                  </li>
                ))}
              </ul>
            </details>
          </div>
        ) : (
          <p className="pc-ayuda">
            Al publicar, se asignará al programa su formulario de registro disponible.
          </p>
        )}

        <div className="pc-fechas">
          <div className="pc-campo">
            <label htmlFor="apertura">Fecha de apertura</label>
            <input
              id="apertura"
              type="date"
              value={fechaApertura}
              onChange={(e) => setFechaApertura(e.target.value)}
              required
            />
          </div>
          <div className="pc-campo">
            <label htmlFor="clausura">Fecha de clausura</label>
            <input
              id="clausura"
              type="date"
              min={fechaApertura}
              value={fechaClausura}
              onChange={(e) => setFechaClausura(e.target.value)}
              required
            />
          </div>
        </div>
        {fechasInvalidas && (
          <p className="pc-error">
            La fecha de clausura debe ser posterior a la de apertura.
          </p>
        )}

        <div className="pc-campo">
          <label htmlFor="reglas">Reglas de operación</label>
          <ZonaArchivo
            id="reglas"
            archivos={reglas ? [reglas] : []}
            accept=".pdf,.doc,.docx"
            texto="Arrastra aquí las reglas de operación, o haz clic para elegir el archivo"
            onCambiar={(lista) => setReglas(lista[0] ?? null)}
          />
        </div>
      </section>

      <section className="pc-caja">
        <h2 className="pc-subtitulo">Subir archivo de convocatoria</h2>
        <ZonaArchivo
          id="archivoConvocatoria"
          archivos={archivoConvocatoria ? [archivoConvocatoria] : []}
          accept=".pdf,.doc,.docx"
          texto="Arrastra aquí el archivo de convocatoria o haz clic para elegirlo"
          onCambiar={(lista) => setArchivoConvocatoria(lista[0] ?? null)}
        />
      </section>

      <div className="pc-acciones">
        <button type="button" className="pc-boton pc-boton--secundario" onClick={onVolver}>
          Volver a las convocatorias
        </button>
        <button type="submit" className="pc-boton pc-boton--primario" disabled={!puedePublicar}>
          Publicar convocatoria
        </button>
      </div>
    </form>
  );
}
