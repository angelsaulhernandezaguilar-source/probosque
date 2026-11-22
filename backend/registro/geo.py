# HU-1.3-01: lee el polígono del predio (KML, KMZ, GeoJSON o Shapefile en .zip) con GDAL.
# GDAL es la librería que instalamos en el Dockerfile; Django la usa desde django.contrib.gis.gdal.
import os
import tempfile

from django.contrib.gis.gdal import DataSource, GDALException
from django.contrib.gis.geos import MultiPolygon, Polygon

EXTENSIONES = ('.kml', '.kmz', '.geojson', '.json', '.zip')

# Rectángulo que contiene al Estado de México (longitud, latitud). Sirve para detectar
# coordenadas al revés o un Shapefile sin .prj (que trae metros en vez de grados).
LIMITES_EDOMEX = {'lon': (-100.7, -98.5), 'lat': (18.3, 20.35)}


def leer_poligono(ruta):
    """Devuelve un MultiPolygon en coordenadas GPS (SRID 4326) con todos los polígonos del archivo."""
    extension = os.path.splitext(ruta)[1].lower()
    if extension not in EXTENSIONES:
        raise ValueError(
            'Formato no soportado. Sube el polígono en KML, KMZ, GeoJSON '
            'o un Shapefile comprimido en .zip (con sus archivos .shp, .shx, .dbf y .prj).'
        )
    if extension == '.zip':
        ruta = f'/vsizip/{ruta}'  # GDAL lee el Shapefile directo desde el .zip, sin descomprimir

    try:
        fuente = DataSource(ruta)
    except GDALException:
        raise ValueError('No se pudo leer el archivo geográfico. Revisa que no esté dañado.')

    poligonos = []
    for capa in fuente:            # un archivo puede tener varias capas...
        for elemento in capa:      # ...y cada capa varios elementos (features)
            geometria = elemento.geom
            geometria.set_3d(False)  # KML trae altura (x, y, z); nuestra columna es 2D
            if geometria.srs is not None and geometria.srs.srid != 4326:
                geometria.transform(4326)  # por ejemplo, de UTM 14N (metros) a GPS (grados)
            geos = geometria.geos
            if isinstance(geos, Polygon):
                poligonos.append(geos)
            elif isinstance(geos, MultiPolygon):
                poligonos.extend(geos)

    if not poligonos:
        raise ValueError('El archivo no contiene ningún polígono del predio.')

    resultado = MultiPolygon(poligonos, srid=4326)
    lon_min, lat_min, lon_max, lat_max = resultado.extent
    (lon_a, lon_b), (lat_a, lat_b) = LIMITES_EDOMEX['lon'], LIMITES_EDOMEX['lat']
    if not (lon_a <= lon_min and lon_max <= lon_b and lat_a <= lat_min and lat_max <= lat_b):
        raise ValueError(
            'El polígono no cae dentro del Estado de México. Revisa las coordenadas '
            'o, si es Shapefile, que incluya su archivo .prj.'
        )
    return resultado


def leer_poligono_subido(archivo):
    """Igual que leer_poligono, pero para un archivo recién subido que todavía no está en disco."""
    extension = os.path.splitext(archivo.name)[1].lower()
    temporal = tempfile.NamedTemporaryFile(suffix=extension, delete=False)
    try:
        for pedazo in archivo.chunks():  # se copia a un archivo temporal porque GDAL necesita una ruta
            temporal.write(pedazo)
        temporal.close()
        return leer_poligono(temporal.name)
    finally:
        archivo.seek(0)  # se regresa al inicio para que Django lo pueda guardar después
        os.remove(temporal.name)
