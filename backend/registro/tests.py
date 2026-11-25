# Pruebas de las reglas del módulo 1.
# Correr con: docker compose exec backend python manage.py test registro
# Django crea una base temporal "test_probosque" y la borra al terminar: tu base real no se toca.
import shutil
import tempfile
from datetime import timedelta

from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import Convocatoria, Programa, Solicitud


class ReglasRegistroTests(TestCase):
    def setUp(self):
        # El programa ya existe gracias a la migración 0002
        self.peg = Programa.objects.get(clave='guardabosques')
        hoy = timezone.localdate()
        self.abierta = Convocatoria.objects.create(
            programa=self.peg, fecha_apertura=hoy - timedelta(days=5),
            fecha_clausura=hoy + timedelta(days=30), texto='Convocatoria de prueba',
        )

    def nueva_solicitud(self, convocatoria):
        return Solicitud(
            convocatoria=convocatoria, tipo_persona='Núcleo Agrario', nombres='Ejido',
            primer_apellido='San Juan', telefono='7221234567', correo='prueba@correo.mx',
            delegacion='Toluca',
        )

    def test_carga_los_seis_programas(self):
        self.assertEqual(Programa.objects.count(), 6)

    def test_folio_con_siglas_anio_e_id(self):
        s = self.nueva_solicitud(self.abierta)
        s.full_clean()  # corre las validaciones, como lo hará la API
        s.save()
        self.assertEqual(s.folio, f'PEG-{self.abierta.ejercicio}-{s.pk:04d}')
        self.assertEqual(s.estado, Solicitud.Estado.RECIBIDA)
        self.assertEqual(s.historial[0]['estado'], 'RECIBIDA')

    def test_no_registra_si_la_convocatoria_esta_cerrada(self):
        hoy = timezone.localdate()
        cerrada = Convocatoria.objects.create(
            programa=self.peg, fecha_apertura=hoy - timedelta(days=60),
            fecha_clausura=hoy - timedelta(days=1), texto='Ya cerró',
        )
        self.assertEqual(cerrada.estado, 'cerrada')
        with self.assertRaises(ValidationError):
            self.nueva_solicitud(cerrada).full_clean()

    def test_clausura_no_puede_ser_antes_de_apertura(self):
        hoy = timezone.localdate()
        mala = Convocatoria(programa=self.peg, fecha_apertura=hoy, fecha_clausura=hoy - timedelta(days=1), texto='x')
        with self.assertRaises(ValidationError):
            mala.full_clean()


# ---------- Pruebas de la API (lo mismo que hará React con fetch) ----------

MEDIA_PRUEBAS = tempfile.mkdtemp()  # los archivos de prueba van a una carpeta temporal, no a media/


@override_settings(MEDIA_ROOT=MEDIA_PRUEBAS)
class ApiRegistroTests(APITestCase):
    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(MEDIA_PRUEBAS, ignore_errors=True)
        super().tearDownClass()

    def publicar_convocatoria(self):
        hoy = timezone.localdate()
        return self.client.post('/api/convocatorias/', {
            'programa': 'guardabosques',
            'fecha_apertura': (hoy - timedelta(days=1)).isoformat(),
            'fecha_clausura': (hoy + timedelta(days=30)).isoformat(),
            'texto': 'Convocatoria de prueba',
            'reglas_operacion': SimpleUploadedFile('ro.pdf', b'%PDF-1.4', content_type='application/pdf'),
        }, format='multipart')

    def datos_solicitud(self, convocatoria_id, **extra):
        return {
            'convocatoria': convocatoria_id, 'tipo_persona': 'Núcleo Agrario', 'nombres': 'Ejido',
            'primer_apellido': 'San Juan', 'telefono': '7221234567', 'correo': 'prueba@correo.mx',
            'delegacion': 'Toluca', 'municipio': 'Villa Victoria',
            'ubicacion': {'type': 'Point', 'coordinates': [-99.99, 19.43]},  # GeoJSON: [longitud, latitud]
            'datos_programa': {'superficie': 120}, **extra,
        }

    def test_publicar_y_consultar_convocatorias(self):
        r = self.publicar_convocatoria()
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data['estado'], 'abierta')
        self.assertIn('/media/convocatorias/ro', r.data['reglas_operacion'])
        r = self.client.get('/api/convocatorias/?programa=guardabosques')
        self.assertEqual(len(r.data), 1)
        self.assertEqual(self.client.get('/api/convocatorias/?programa=plantaciones').data, [])

    def test_registrar_solicitud_subir_documento_y_buscar_por_folio(self):
        convocatoria_id = self.publicar_convocatoria().data['id']
        r = self.client.post('/api/solicitudes/', self.datos_solicitud(convocatoria_id), format='json')
        self.assertEqual(r.status_code, 201, r.data)
        folio, solicitud_id = r.data['folio'], r.data['id']
        self.assertTrue(folio.startswith('PEG-'))

        r = self.client.post('/api/documentos/', {
            'solicitud': solicitud_id, 'tipo': 'curp',
            'archivo': SimpleUploadedFile('curp.pdf', b'%PDF-1.4', content_type='application/pdf'),
        }, format='multipart')
        self.assertEqual(r.status_code, 201, r.data)

        r = self.client.get(f'/api/solicitudes/?folio={folio.lower()}')  # minúsculas también encuentra
        self.assertEqual(len(r.data), 1)
        self.assertEqual(r.data[0]['documentos'][0]['nombre'], 'curp.pdf')
        self.assertEqual(r.data[0]['ubicacion']['type'], 'Point')

    def test_rechaza_solicitud_si_la_convocatoria_cerro(self):
        hoy = timezone.localdate()
        cerrada = Convocatoria.objects.create(
            programa=Programa.objects.get(clave='guardabosques'),
            fecha_apertura=hoy - timedelta(days=60), fecha_clausura=hoy - timedelta(days=1), texto='Cerró',
        )
        r = self.client.post('/api/solicitudes/', self.datos_solicitud(cerrada.id), format='json')
        self.assertEqual(r.status_code, 400)

    def test_rechaza_clabe_invalida(self):
        convocatoria_id = self.publicar_convocatoria().data['id']
        datos = self.datos_solicitud(convocatoria_id, datos_programa={'clabe': '123456789012345678'})
        r = self.client.post('/api/solicitudes/', datos, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('clabe', r.data['datos_programa'])

    def test_estado_no_se_puede_mandar_desde_la_api(self):
        convocatoria_id = self.publicar_convocatoria().data['id']
        r = self.client.post('/api/solicitudes/', self.datos_solicitud(convocatoria_id, estado='NO_FACTIBLE'), format='json')
        self.assertEqual(r.data['estado'], 'RECIBIDA')

    # ---------- HU-1.3-01: polígono del predio ----------

    KML = (
        b'<?xml version="1.0" encoding="UTF-8"?>'
        b'<kml xmlns="http://www.opengis.net/kml/2.2"><Placemark><Polygon><outerBoundaryIs><LinearRing>'
        b'<coordinates>-98.7420,19.1210,0 -98.7350,19.1210,0 -98.7350,19.1150,0 -98.7420,19.1150,0 -98.7420,19.1210,0'
        b'</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark></kml>'
    )

    def nueva_solicitud_api(self):
        convocatoria_id = self.publicar_convocatoria().data['id']
        datos = self.datos_solicitud(convocatoria_id)
        del datos['ubicacion']  # la ubicación debe salir del polígono
        return self.client.post('/api/solicitudes/', datos, format='json').data['id']

    def subir_sig(self, solicitud_id, nombre, contenido):
        return self.client.post('/api/documentos/', {
            'solicitud': solicitud_id, 'tipo': 'validacionSig', 'archivo': SimpleUploadedFile(nombre, contenido),
        }, format='multipart')

    def test_kml_llena_poligono_y_ubicacion(self):
        solicitud_id = self.nueva_solicitud_api()
        r = self.subir_sig(solicitud_id, 'predio.kml', self.KML)
        self.assertEqual(r.status_code, 201, r.data)
        s = self.client.get(f'/api/solicitudes/{solicitud_id}/').data
        self.assertEqual(s['poligono']['type'], 'MultiPolygon')
        lon, lat = s['ubicacion']['coordinates']
        self.assertAlmostEqual(lon, -98.7385, places=3)  # centro del predio, en Amecameca
        self.assertAlmostEqual(lat, 19.118, places=3)

    def test_rechaza_archivo_sig_que_no_es_poligono(self):
        r = self.subir_sig(self.nueva_solicitud_api(), 'predio.kml', b'esto no es un kml')
        self.assertEqual(r.status_code, 400)
        self.assertIn('archivo', r.data)

    def test_rechaza_poligono_fuera_del_estado_de_mexico(self):
        # Mismo polígono pero con latitud y longitud intercambiadas (error común)
        al_reves = self.KML
        for lon, lat in [(b'-98.7420', b'19.1210'), (b'-98.7350', b'19.1150')]:
            al_reves = al_reves.replace(lon, b'LON').replace(lat, lon).replace(b'LON', lat)
        r = self.subir_sig(self.nueva_solicitud_api(), 'al_reves.kml', al_reves)
        self.assertEqual(r.status_code, 400)


@override_settings(MEDIA_ROOT=MEDIA_PRUEBAS)
class DatosPruebaTests(TestCase):
    """El comando datos_prueba carga solicitudes en cada estado y no duplica si se corre dos veces."""

    def test_carga_una_vez_y_respeta_las_reglas(self):
        from io import StringIO

        from django.core.management import call_command

        call_command('datos_prueba', stdout=StringIO())
        call_command('datos_prueba', stdout=StringIO())  # la segunda vez no debe agregar nada
        solicitudes = Solicitud.objects.filter(correo__endswith='@datos-prueba.mx')
        self.assertEqual(solicitudes.count(), 6)
        self.assertEqual(Convocatoria.objects.count(), 6)  # una abierta por programa
        estados = set(solicitudes.values_list('estado', flat=True))
        self.assertEqual(estados, {'RECIBIDA', 'SUBSANACION', 'EN_DICTAMEN', 'JURIDICO_FAVORABLE', 'NO_FACTIBLE'})
        self.assertFalse(solicitudes.filter(ubicacion__isnull=True).exists())  # el KML llenó la ubicación
