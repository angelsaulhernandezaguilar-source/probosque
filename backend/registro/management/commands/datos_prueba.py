# Carga datos de prueba para no empezar con la base vacía.
#   docker compose exec backend python manage.py datos_prueba
#
# Un "management command" es un script que Django corre con todo el proyecto cargado
# (modelos, settings, base de datos). Es como un script de "seed" en Node: npm run seed.
#
# Se usa un comando y no un fixture JSON porque así los datos pasan por las mismas reglas
# del sistema: el folio, el historial, el polígono SIG y los cambios de estado se generan solos.
from datetime import date, timedelta
from pathlib import Path

from django.conf import settings
from django.core.files import File
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from aprobacion.models import Dictamen
from registro.models import Convocatoria, Documento, Programa, Solicitud

# En Docker, docs/ se monta en /docs (ver docker-compose.yml). BASE_DIR es /app, así que su padre es /.
DOCS = Path(settings.BASE_DIR).parent / 'docs'

# Todas las solicitudes de prueba usan este dominio: así se reconocen y no se cargan dos veces
DOMINIO = '@datos-prueba.mx'

REGLAS = {
    'plantaciones': 'RO Plantaciones Sustentables.pdf',
    'restauracion': 'RO Restauración Hidrológico-Forestal.pdf',
    'servicios-ambientales': 'RO Pago por Servicios Ambientales Hidrológicos del Estado de México.pdf',
    'manejo-forestal': 'RO ManejoForestalSustentable.pdf',
    'capturando-carbono': 'RO CapturandoCarbono.pdf',
    'guardabosques': 'RO Guardabosques.pdf',
}


def clabe_de_prueba(base17):
    """Agrega el dígito de control a 17 dígitos para obtener una CLABE válida (pesos 3-7-1)."""
    pesos = [3, 7, 1] * 6
    suma = sum((int(d) * p) % 10 for d, p in zip(base17, pesos))
    return base17 + str((10 - suma % 10) % 10)


# Datos comunes del formulario (los mismos campos que pide React en camposFormulario.js)
def datos_comunes(predio, localidad, clabe_base):
    return {
        'Nombre_predio': predio,
        'Localidad_predio': localidad,
        'direccion': f'Domicilio conocido, {localidad}',
        'gruposPrioritarios': 'Ninguno',
        'pmfVigente': 'No',
        'clabe': clabe_de_prueba(clabe_base),
        'declaracionNoLitigio': True,
    }


# Cada solicitud: programa, datos del solicitante, datos del programa y hasta qué estado llega
SOLICITUDES = [
    {
        'programa': 'plantaciones', 'estado': 'RECIBIDA',
        'nombres': 'Ejido San Juan', 'primer_apellido': 'de las Huertas', 'delegacion': 'Toluca',
        'municipio': 'Zinacantepec',
        'datos': {**datos_comunes('El Ocotal', 'San Juan de las Huertas', '00218000012345678'),
                  'concepto': 'plantacion', 'superficie': 20, 'superficieTotal': 20, 'plantacionMaderable': 20},
    },
    {
        'programa': 'restauracion', 'estado': 'SUBSANACION',
        'nombres': 'María', 'primer_apellido': 'López', 'segundo_apellido': 'Hernández',
        'tipo_persona': 'Propietario', 'delegacion': 'Amecameca', 'municipio': 'Amecameca',
        'datos': {**datos_comunes('Las Trancas', 'San Pedro Nexapa', '01218000098765432'),
                  'superficieTotal': 35, 'restauracionIntegral': 35},
        'faltantes': 'La CURP no es legible y falta el documento de propiedad del terreno.',
    },
    {
        'programa': 'servicios-ambientales', 'estado': 'EN_DICTAMEN',
        'nombres': 'Comunidad San Pedro', 'primer_apellido': 'Atlapulco', 'delegacion': 'Naucalpan',
        'municipio': 'Ocoyoacac',
        'datos': {**datos_comunes('Monte Alto', 'San Pedro Atlapulco', '07218000011122233'),
                  'superficieConvocatoriaEstatal': 150, 'fondosConcurrentesPSA': 'No'},
    },
    {
        'programa': 'capturando-carbono', 'estado': 'JURIDICO_FAVORABLE',
        'nombres': 'José', 'primer_apellido': 'Martínez', 'segundo_apellido': 'Ruiz',
        'tipo_persona': 'Poseedor', 'delegacion': 'Valle de Bravo', 'municipio': 'Valle de Bravo',
        'datos': {**datos_comunes('La Cañada', 'Avándaro', '01418000044455566'),
                  'superficieTotal': 12, 'carbonReforestacion': 12},
        'observaciones': 'Escrituras y acta de asamblea en orden.',
    },
    {
        'programa': 'restauracion', 'estado': 'NO_FACTIBLE',
        'nombres': 'Ejido Santa Cruz', 'primer_apellido': 'Tepexpan', 'delegacion': 'Texcoco',
        'municipio': 'Jiquipilco',
        'datos': {**datos_comunes('Cerro Gordo', 'Santa Cruz Tepexpan', '00218000077788899'),
                  'superficieTotal': 60, 'bosquesAgua': 60},
        'observaciones': 'El predio está en litigio agrario según el acta presentada (RO, requisitos de elegibilidad).',
    },
    {
        'programa': 'guardabosques', 'estado': 'RECIBIDA',
        'nombres': 'Ejido Santiago', 'primer_apellido': 'Tlacotepec', 'delegacion': 'Toluca',
        'municipio': 'Toluca',
        # N8: la persona cobeneficiaria se captura por ahora en datos_programa
        'datos': {**datos_comunes('Paraje La Loma', 'Santiago Tlacotepec', '01218000033344455'),
                  'guardabosquePropuesto': 'Pedro Sánchez Díaz', 'cobeneficiaria': 'Ana Sánchez Gómez'},
    },
]


class Command(BaseCommand):
    help = 'Carga convocatorias abiertas y solicitudes de prueba en distintos estados del trámite.'

    def handle(self, *args, **opciones):
        if not DOCS.exists():
            raise CommandError(
                f'No encuentro la carpeta {DOCS}. Revisa que docker-compose.yml monte ./docs en /docs '
                'y vuelve a levantar el backend con: docker compose up -d'
            )
        if Solicitud.objects.filter(correo__endswith=DOMINIO).exists():
            self.stdout.write(self.style.WARNING('Los datos de prueba ya estaban cargados. No se agregó nada.'))
            return

        # atomic: si algo falla a la mitad, no queda la base con datos a medias
        with transaction.atomic():
            convocatorias = {clave: self.convocatoria_abierta(clave) for clave in REGLAS}
            for i, datos in enumerate(SOLICITUDES, start=1):
                solicitud = self.crear_solicitud(convocatorias[datos['programa']], datos, i)
                self.stdout.write(f'  {solicitud.folio:<16} {solicitud.get_estado_display()}')

        self.stdout.write(self.style.SUCCESS(
            f'Listo: {len(convocatorias)} convocatorias abiertas y {len(SOLICITUDES)} solicitudes de prueba.'
        ))

    def convocatoria_abierta(self, clave):
        """Usa la convocatoria abierta del programa si ya existe; si no, crea una con su RO real."""
        hoy = timezone.localdate()
        programa = Programa.objects.get(clave=clave)
        existente = programa.convocatorias.filter(fecha_apertura__lte=hoy, fecha_clausura__gte=hoy).first()
        if existente:
            return existente
        convocatoria = Convocatoria(
            programa=programa,
            fecha_apertura=date(hoy.year, 1, 1),          # ejercicio fiscal del año en curso
            fecha_clausura=hoy + timedelta(days=90),      # siempre abierta al cargar los datos
            texto=f'Convocatoria de prueba del programa {programa.nombre}. Se recibe la Solicitud Única '
                  'con la documentación completa en la delegación regional que corresponda al predio.',
        )
        with open(DOCS / 'reglas-operacion' / REGLAS[clave], 'rb') as pdf:
            convocatoria.reglas_operacion.save(REGLAS[clave], File(pdf), save=False)
        convocatoria.full_clean()
        convocatoria.save()
        self.stdout.write(f'Convocatoria abierta: {programa.nombre}')
        return convocatoria

    def crear_solicitud(self, convocatoria, datos, numero):
        solicitud = Solicitud(
            convocatoria=convocatoria,
            tipo_persona=datos.get('tipo_persona', 'Núcleo Agrario'),
            nombres=datos['nombres'],
            primer_apellido=datos['primer_apellido'],
            segundo_apellido=datos.get('segundo_apellido', ''),
            telefono=f'72200000{numero:02d}',
            correo=f'solicitante{numero}{DOMINIO}',
            delegacion=datos['delegacion'],
            municipio=datos['municipio'],
            datos_programa=datos['datos'],
        )
        solicitud.full_clean()  # mismas reglas que la API (por ejemplo, convocatoria abierta)
        solicitud.save()        # aquí se genera el folio

        # Documentos: el polígono SIG (llena poligono y ubicacion) y dos requisitos en PDF
        self.adjuntar(solicitud, Documento.TIPO_POLIGONO, DOCS / 'pruebas' / 'predio_las_trancas.kml')
        for tipo in ('identificacionOficial', 'curp'):
            self.adjuntar(solicitud, tipo, DOCS / 'pruebas' / 'pdfDePrueba.pdf', f'{tipo}.pdf')

        # Se avanza el trámite con los mismos métodos que usan Recepción y Dictámenes
        estado = datos['estado']
        if estado == 'SUBSANACION':
            solicitud.pedir_subsanacion(datos['faltantes'])
        elif estado != 'RECIBIDA':
            solicitud.aceptar_expediente()
            if estado in ('JURIDICO_FAVORABLE', 'NO_FACTIBLE'):
                dictamen = Dictamen(
                    solicitud=solicitud,
                    tipo=Dictamen.Tipo.JURIDICO,
                    resultado=Dictamen.Resultado.FAVORABLE if estado == 'JURIDICO_FAVORABLE'
                    else Dictamen.Resultado.DESFAVORABLE,
                    observaciones=datos.get('observaciones', ''),
                )
                dictamen.full_clean()
                dictamen.save()  # Dictamen.save() cambia el estado de la solicitud
        solicitud.refresh_from_db()
        return solicitud

    def adjuntar(self, solicitud, tipo, ruta, nombre=None):
        with open(ruta, 'rb') as archivo:
            documento = Documento(solicitud=solicitud, tipo=tipo)
            documento.archivo.save(nombre or ruta.name, File(archivo), save=False)
            documento.save()
