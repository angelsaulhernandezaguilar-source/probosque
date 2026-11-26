import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./MapaPredio.css";

// Dibuja el polígono del predio sobre un mapa (HU-1.3-01).
// "poligono" es el GeoJSON que regresa la API en Solicitud.poligono: Django lo leyó del KML o
// Shapefile que subió el solicitante, así que aquí se ve exactamente lo que quedó guardado en PostGIS.
// El fondo es OpenStreetMap; si no hay internet el polígono se dibuja igual, sin fondo.
export default function MapaPredio({ poligono, alto = 300 }) {
  const contenedor = useRef(null);

  useEffect(() => {
    if (!poligono || !contenedor.current) return undefined;
    const mapa = L.map(contenedor.current, { scrollWheelZoom: false }); // la rueda sigue moviendo la página
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapa);
    const capa = L.geoJSON(poligono, {
      style: { color: "#1c4a37", weight: 3, fillColor: "#8fc49a", fillOpacity: 0.35 },
    }).addTo(mapa);
    mapa.fitBounds(capa.getBounds(), { padding: [24, 24] });
    return () => mapa.remove(); // al cambiar de solicitud se destruye el mapa anterior
  }, [poligono]);

  if (!poligono) {
    return <p className="mapa-vacio">Esta solicitud no tiene polígono georreferenciado.</p>;
  }
  return (
    <div
      ref={contenedor}
      className="mapa-predio"
      style={{ height: alto }}
      role="img"
      aria-label="Mapa con el polígono del predio"
    />
  );
}
