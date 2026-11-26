import { useRef, useState } from "react";
import "./ZonaArchivo.css";

// ¿El nombre del archivo termina en alguna de las extensiones de "accept"? (".pdf,.kml" → [".pdf", ".kml"])
// El navegador solo aplica "accept" al elegir con el explorador; al arrastrar hay que revisarlo aquí.
export function aceptaArchivo(nombre, accept) {
  if (!accept) return true;
  const extensiones = accept.split(",").map((e) => e.trim().toLowerCase()).filter((e) => e.startsWith("."));
  return extensiones.length === 0 || extensiones.some((ext) => nombre.toLowerCase().endsWith(ext));
}

// Zona para arrastrar y soltar un archivo, o hacer clic para elegirlo.
// Es la misma interfaz en Publicar (reglas de operación y convocatoria) y en el registro (documentos).
//   archivos   → lista de File elegidos (vacía si no hay)
//   onCambiar  → recibe la lista nueva de File
export default function ZonaArchivo({ id, archivos = [], onCambiar, accept, multiple = false, texto, invalida = false }) {
  const inputRef = useRef(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [error, setError] = useState("");

  const recibir = (lista) => {
    const elegidos = Array.from(lista ?? []);
    if (elegidos.length === 0) return;
    const validos = elegidos.filter((archivo) => aceptaArchivo(archivo.name, accept));
    setError(
      validos.length < elegidos.length
        ? `Formato no permitido. Usa archivos ${accept.split(",").join(", ")}.`
        : ""
    );
    if (validos.length === 0) return;
    // Con "multiple" se suman a los que ya había; si no, el nuevo sustituye al anterior
    onCambiar(multiple ? [...archivos, ...validos] : validos.slice(0, 1));
  };

  const quitar = (indice) => onCambiar(archivos.filter((_, i) => i !== indice));

  const clases = [
    "za-zona",
    arrastrando && "za-zona--activa",
    archivos.length > 0 && "za-zona--llena",
    invalida && "za-zona--invalida",
  ].filter(Boolean).join(" ");

  return (
    <div className="za">
      <div
        id={id}
        className={clases}
        role="button"
        tabIndex={0}
        aria-describedby={error ? `${id}-error` : undefined}
        onClick={() => inputRef.current.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current.click();
          }
        }}
        // Sin preventDefault en dragover el navegador abriría el archivo en lugar de soltarlo aquí
        onDragOver={(e) => {
          e.preventDefault();
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastrando(false);
          recibir(e.dataTransfer.files);
        }}
      >
        {archivos.length > 0 && !multiple
          ? archivos[0].name
          : texto ?? "Arrastra aquí el archivo o haz clic para elegirlo"}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          hidden
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            recibir(e.target.files);
            e.target.value = ""; // permite volver a elegir el mismo archivo después de quitarlo
          }}
        />
      </div>

      {/* Con un solo archivo su nombre ya se ve en la zona; con varios se listan aquí */}
      {archivos.length > 0 && !multiple && (
        <button type="button" className="za-quitar za-quitar--solo" onClick={() => quitar(0)}>
          Quitar archivo
        </button>
      )}
      {archivos.length > 0 && multiple && (
        <ul className="za-lista">
          {archivos.map((archivo, i) => (
            <li key={`${archivo.name}-${i}`}>
              <span>{archivo.name}</span>
              <button type="button" className="za-quitar" onClick={() => quitar(i)} aria-label={`Quitar ${archivo.name}`}>
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <small id={`${id}-error`} className="za-error" role="alert">{error}</small>}
    </div>
  );
}
