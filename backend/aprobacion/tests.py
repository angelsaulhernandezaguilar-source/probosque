# Pruebas de HU-2.1-01 (cotejo del expediente) y HU-2.4-01 (dictamen jurídico).
# Correr con: docker compose exec backend python manage.py test aprobacion
import shutil
import tempfile
from datetime import timedelta

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from registro.models import Convocatoria, Documento, Programa, Solicitud
from registro.plazos import sumar_dias_habiles


MEDIA_PRUEBAS = tempfile.mkdtemp()  # los archivos de prueba no ensucian backend/media


@override_settings(MEDIA_ROOT=MEDIA_PRUEBAS)
class FlujoAprobacionTests(APITestCase):
    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(MEDIA_PRUEBAS, ignore_errors=True)
        super().tearDownClass()

    def setUp(self):
        hoy = timezone.localdate()
        self.convocatoria = Convocatoria.objects.create(
            programa=Programa.objects.get(clave='guardabosques'), texto='Prueba',
            fecha_apertura=hoy - timedelta(days=5), fecha_clausura=hoy + timedelta(days=60),
        )
        self.solicitud = Solicitud.objects.create(
            convocatoria=self.convocatoria, tipo_persona='Núcleo Agrario', nombres='Ejido',
            primer_apellido='Prueba', telefono='7221234567', correo='p@correo.mx', delegacion='Toluca',
        )

    def url(self, accion):
        return f'/api/expedientes/{self.solicitud.id}/{accion}/'

    def rechazar(self, faltantes='Falta la CURP.'):
        return self.client.post(self.url('rechazar'), {'faltantes': faltantes}, format='json')

    def dictaminar(self, resultado, observaciones=''):
        return self.client.post('/api/dictamenes/', {
            'solicitud': self.solicitud.id, 'tipo': 'JURIDICO',
            'resultado': resultado, 'observaciones': observaciones,
        }, format='json')

    # ---------- HU-2.1-01 ----------

    def test_aceptar_pasa_a_dictamen(self):
        r = self.client.post(self.url('aceptar'))
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data['estado'], 'EN_DICTAMEN')
        self.assertEqual(len(r.data['historial']), 2)

    def test_rechazar_exige_faltantes_y_da_cinco_dias_habiles(self):
        self.assertEqual(self.rechazar('').status_code, 400)
        r = self.rechazar()
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data['estado'], 'SUBSANACION')
        esperado = sumar_dias_habiles(timezone.localdate(), 5)
        self.assertEqual(r.data['limite_subsanacion'], esperado.isoformat())
        self.assertIn('Falta la CURP.', r.data['historial'][-1]['nota'])

    def test_plazo_de_subsanacion_no_pasa_del_cierre(self):
        self.convocatoria.fecha_clausura = timezone.localdate() + timedelta(days=1)
        self.convocatoria.save()
        r = self.rechazar()
        self.assertEqual(r.data['limite_subsanacion'], self.convocatoria.fecha_clausura.isoformat())

    def test_reenviar_regresa_a_cotejo_pero_no_si_vencio(self):
        self.rechazar()
        r = self.client.post(f'/api/solicitudes/{self.solicitud.id}/reenviar/')
        self.assertEqual(r.data['estado'], 'RECIBIDA')
        # Se vuelve a rechazar y se simula que el plazo ya pasó
        self.rechazar()
        Solicitud.objects.filter(pk=self.solicitud.pk).update(limite_subsanacion=timezone.localdate() - timedelta(days=1))
        r = self.client.post(f'/api/solicitudes/{self.solicitud.id}/reenviar/')
        self.assertEqual(r.status_code, 400)

    def documentos(self):
        return list(self.solicitud.documentos.order_by('tipo').values_list('tipo', 'archivo'))

    def test_reenviar_sustituye_los_documentos_del_mismo_tipo(self):
        Documento.objects.create(solicitud=self.solicitud, tipo='curp', archivo=SimpleUploadedFile('curp_vieja.pdf', b'%PDF'))
        Documento.objects.create(solicitud=self.solicitud, tipo='ine', archivo=SimpleUploadedFile('ine.pdf', b'%PDF'))
        self.rechazar()
        r = self.client.post(f'/api/solicitudes/{self.solicitud.id}/reenviar/', {
            'curp': SimpleUploadedFile('curp_nueva.pdf', b'%PDF'),
        }, format='multipart')
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data['estado'], 'RECIBIDA')
        # Django agrega un sufijo al nombre si ya existe un archivo igual: se comparan solo los inicios
        nombres = sorted(d['nombre'] for d in r.data['documentos'])
        self.assertEqual(len(nombres), 2)
        self.assertTrue(nombres[0].startswith('curp_nueva'))
        self.assertTrue(nombres[1].startswith('ine'))  # la INE no se tocó

    def test_reenviar_con_poligono_ilegible_no_cambia_nada(self):
        Documento.objects.create(solicitud=self.solicitud, tipo='curp', archivo=SimpleUploadedFile('curp.pdf', b'%PDF'))
        self.rechazar()
        antes = self.documentos()
        r = self.client.post(f'/api/solicitudes/{self.solicitud.id}/reenviar/', {
            'curp': SimpleUploadedFile('curp_nueva.pdf', b'%PDF'),
            'validacionSig': SimpleUploadedFile('predio.kml', b'esto no es un kml'),
        }, format='multipart')
        self.assertEqual(r.status_code, 400)
        self.solicitud.refresh_from_db()
        self.assertEqual(self.solicitud.estado, 'SUBSANACION')
        self.assertEqual(self.documentos(), antes)  # transaction.atomic deshizo el reemplazo de la CURP

    def test_no_se_agregan_documentos_despues_del_cotejo(self):
        self.client.post(self.url('aceptar'))
        r = self.client.post('/api/documentos/', {
            'solicitud': self.solicitud.id, 'tipo': 'curp', 'archivo': SimpleUploadedFile('curp.pdf', b'%PDF'),
        }, format='multipart')
        self.assertEqual(r.status_code, 400)

    def test_no_se_acepta_dos_veces(self):
        self.client.post(self.url('aceptar'))
        self.assertEqual(self.client.post(self.url('aceptar')).status_code, 400)

    # ---------- HU-2.4-01 ----------

    def test_dictamen_favorable(self):
        self.client.post(self.url('aceptar'))
        r = self.dictaminar('FAVORABLE', 'Escrituras en regla.')
        self.assertEqual(r.status_code, 201, r.data)
        self.solicitud.refresh_from_db()
        self.assertEqual(self.solicitud.estado, 'JURIDICO_FAVORABLE')
        self.assertIn('Escrituras en regla.', self.solicitud.historial[-1]['nota'])

    def test_desfavorable_exige_motivo_y_queda_no_factible(self):
        self.client.post(self.url('aceptar'))
        self.assertEqual(self.dictaminar('DESFAVORABLE').status_code, 400)
        r = self.dictaminar('DESFAVORABLE', 'El acta de asamblea no está vigente.')
        self.assertEqual(r.status_code, 201, r.data)
        self.solicitud.refresh_from_db()
        self.assertEqual(self.solicitud.estado, 'NO_FACTIBLE')

    def test_no_se_dictamina_sin_cotejo(self):
        r = self.dictaminar('FAVORABLE')  # la solicitud sigue RECIBIDA
        self.assertEqual(r.status_code, 400)
        self.assertFalse(self.solicitud.dictamenes.exists())

    def test_plazos_en_la_api(self):
        r = self.client.get(f'/api/solicitudes/{self.solicitud.id}/')
        registro = self.solicitud.fecha_registro
        self.assertEqual(r.data['limite_aviso_faltantes'], (registro + timedelta(days=10)).isoformat())
        self.assertEqual(r.data['fecha_limite_dictamen'], sumar_dias_habiles(registro, 45).isoformat())
