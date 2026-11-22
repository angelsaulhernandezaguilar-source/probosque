// Centro del predio como enlace a OpenStreetMap (HU-1.3-01).
// Ojo: GeoJSON guarda [longitud, latitud], al revés de como se suelen escribir.
export default function EnlaceUbicacion({ ubicacion }) {
  if (!ubicacion) return "Sin polígono SIG";
  const [lon, lat] = ubicacion.coordinates.map((n) => n.toFixed(5));
  return (
    <a
      href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=15/${lat}/${lon}`}
      target="_blank"
      rel="noreferrer"
    >
      {lat}, {lon} (ver en mapa)
    </a>
  );
}
