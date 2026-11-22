# Módulo 1 · Convocatoria y registro (servicios 1.1, 1.2 y 1.3)
# Historias de usuario: HU-1.1-01, HU-1.1-02, HU-1.2-01, HU-1.2-02 y HU-1.3-01.

# Se importa "models" desde GeoDjango: trae los campos normales de Django
# y además los geográficos (PointField, MultiPolygonField...).
from datetime import timedelta

from django.contrib.gis.db import models
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from .geo import leer_poligono, leer_poligono_subido
from .plazos import sumar_dias_habiles

# Plazos de las RO. Se aplican a los 6 programas mientras el equipo no defina uno por programa.
DIAS_SUBSANACION = 5        # hábiles para entregar faltantes (RO Restauración; la RO de PEG no lo define)
DIAS_AVISO_FALTANTES = 10   # naturales para notificar faltantes (RO PEG 10.1, fracc. VII)
DIAS_DICTAMEN = 45          # hábiles para dictaminar (Convocatoria PEG, Base QUINTA, fracc. II)


class Programa(models.Model):
    """Catálogo de los 6 programas. Los datos se cargan en la migración 0002."""

    clave = models.SlugField(max_length=30, unique=True)  # la usa el frontend: "plantaciones", "guardabosques"...
    siglas = models.CharField(max_length=10)               # prefijo del folio: PEG-2026-0001
    nombre = models.CharField(max_length=100)

    class Meta:
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class Convocatoria(models.Model):
    """HU-1.1-01 (la Dirección General la publica) y HU-1.1-02 (el público la consulta)."""

    programa = models.ForeignKey(Programa, on_delete=models.PROTECT, related_name='convocatorias')
    fecha_apertura = models.DateField()
    fecha_clausura = models.DateField()
    texto = models.TextField()
    reglas_operacion = models.FileField(upload_to='convocatorias/', blank=True)
    # timezone.localdate usa TIME_ZONE (Ciudad de México), no la hora UTC del contenedor
    fecha_publicacion = models.DateField(default=timezone.localdate)

    class Meta:
        ordering = ['-fecha_apertura']

    def __str__(self):
        return f'{self.programa} {self.ejercicio}'

    @property
    def ejercicio(self):
        """Ejercicio fiscal: el año en que abre la convocatoria."""
        return self.fecha_apertura.year

    @property
    def estado(self):
        """Servicio 1.1: 'proxima', 'abierta' o 'cerrada' según el periodo de registro."""
        hoy = timezone.localdate()
        if hoy < self.fecha_apertura:
            return 'proxima'
        if hoy > self.fecha_clausura:
            return 'cerrada'
        return 'abierta'

    def clean(self):
        if self.fecha_apertura and self.fecha_clausura and self.fecha_clausura < self.fecha_apertura:
            raise ValidationError({'fecha_clausura': 'La fecha de clausura debe ser posterior a la de apertura.'})


class Delegacion(models.TextChoices):
    """Delegaciones regionales forestales (ventanillas). El valor es el mismo texto que manda el frontend."""

    TOLUCA = 'Toluca'
    NAUCALPAN = 'Naucalpan'
    TEXCOCO = 'Texcoco'
    TEJUPILCO = 'Tejupilco'
    ATLACOMULCO = 'Atlacomulco'
    COATEPEC_HARINAS = 'Coatepec Harinas'
    VALLE_DE_BRAVO = 'Valle de Bravo'
    AMECAMECA = 'Amecameca'
    JILOTEPEC = 'Jilotepec'


class Solicitud(models.Model):
    """HU-1.2-01 (la registra el solicitante) y HU-1.2-02 (la registra o consulta la ventanilla)."""

    class Estado(models.TextChoices):
        # Mismos valores que ESTADOS en el frontend (src/datos/catalogos.js).
        # En el módulo 1 toda solicitud nace RECIBIDA; los demás los usa el módulo 2.
        RECIBIDA = 'RECIBIDA', 'Recibida en la delegación'
        SUBSANACION = 'SUBSANACION', 'Documentación incompleta, en plazo para subsanar'
        EN_DICTAMEN = 'EN_DICTAMEN', 'Documentación completa, en dictamen'
        JURIDICO_FAVORABLE = 'JURIDICO_FAVORABLE', 'Dictamen jurídico favorable'
        NO_FACTIBLE = 'NO_FACTIBLE', 'No factible'

    # Máquina de estados: desde cada estado, a cuáles se puede pasar.
    # Es como el switch de un reducer: cualquier otro cambio se rechaza.
    TRANSICIONES = {
        Estado.RECIBIDA: [Estado.EN_DICTAMEN, Estado.SUBSANACION],              # HU-2.1-01 cotejo
        Estado.SUBSANACION: [Estado.RECIBIDA],                                  # el solicitante reenvía
        Estado.EN_DICTAMEN: [Estado.JURIDICO_FAVORABLE, Estado.NO_FACTIBLE],    # HU-2.4-01 dictamen
    }

    # null=True solo mientras se guarda por primera vez: el folio necesita el id (ver save()).
    folio = models.CharField(max_length=20, unique=True, null=True, blank=True, editable=False)
    convocatoria = models.ForeignKey(Convocatoria, on_delete=models.PROTECT, related_name='solicitudes')

    # Datos generales de la persona solicitante (iguales en los 6 programas)
    tipo_persona = models.CharField(max_length=30)
    nombres = models.CharField(max_length=100)
    primer_apellido = models.CharField(max_length=100)
    segundo_apellido = models.CharField(max_length=100, blank=True)
    telefono = models.CharField(max_length=15)
    correo = models.EmailField()
    delegacion = models.CharField(max_length=30, choices=Delegacion.choices)

    # Predio
    municipio = models.CharField(max_length=100, blank=True)
    # PostGIS. Se llenan solos al subir el archivo SIG (HU-1.3-01); los usará el servicio 2.2.
    poligono = models.MultiPolygonField(srid=4326, null=True, blank=True)  # límites del predio
    ubicacion = models.PointField(srid=4326, null=True, blank=True)        # punto central del predio

    # Lo que cambia de un programa a otro (superficie, concepto, hectáreas, cobeneficiaria...).
    # En PostgreSQL es una columna JSONB: guarda un diccionario completo.
    datos_programa = models.JSONField(default=dict, blank=True)

    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.RECIBIDA)
    fecha_registro = models.DateField(default=timezone.localdate, editable=False)
    limite_subsanacion = models.DateField(null=True, blank=True)
    historial = models.JSONField(default=list, blank=True, editable=False)  # [{fecha, estado, nota}]

    class Meta:
        ordering = ['-fecha_registro', '-id']
        verbose_name_plural = 'solicitudes'  # si no, Django pondría "solicituds"

    def __str__(self):
        return self.folio or f'Solicitud sin folio ({self.nombres})'

    def clean(self):
        # Servicio 1.1: solo se registran solicitudes dentro del periodo de la convocatoria
        if self._state.adding and self.convocatoria_id and self.convocatoria.estado != 'abierta':
            c = self.convocatoria
            raise ValidationError(
                f'La convocatoria no está abierta. El registro es del {c.fecha_apertura:%d/%m/%Y} '
                f'al {c.fecha_clausura:%d/%m/%Y}.'
            )

    def save(self, *args, **kwargs):
        if self._state.adding and not self.historial:
            self.historial = [{
                'fecha': self.fecha_registro.isoformat(),
                'estado': self.Estado.RECIBIDA,
                'nota': 'Solicitud registrada.',
            }]
        super().save(*args, **kwargs)  # primer guardado: aquí la base le asigna el id
        if not self.folio:
            # Folio = siglas del programa + año + id con 4 dígitos. Ejemplo: PEG-2026-0001
            self.folio = f'{self.convocatoria.programa.siglas}-{self.convocatoria.ejercicio}-{self.pk:04d}'
            super().save(update_fields=['folio'])

    # ---------- Plazos (N5) ----------

    @property
    def limite_aviso_faltantes(self):
        """Fecha máxima para que la delegación notifique faltantes (10 días naturales)."""
        return self.fecha_registro + timedelta(days=DIAS_AVISO_FALTANTES)

    @property
    def fecha_limite_dictamen(self):
        """Fecha máxima para emitir los dictámenes técnico y jurídico (45 días hábiles)."""
        return sumar_dias_habiles(self.fecha_registro, DIAS_DICTAMEN)

    # ---------- Cambios de estado ----------

    def cambiar_estado(self, nuevo, nota):
        """Único camino para cambiar el estado: revisa la máquina de estados y anota el historial."""
        if nuevo not in self.TRANSICIONES.get(self.estado, []):
            raise ValidationError(
                f'La solicitud está "{self.get_estado_display()}" y no puede pasar a "{self.Estado(nuevo).label}".'
            )
        self.estado = nuevo
        self.historial = [*self.historial, {'fecha': timezone.localdate().isoformat(), 'estado': nuevo, 'nota': nota}]
        self.save(update_fields=['estado', 'historial', 'limite_subsanacion'])

    def aceptar_expediente(self):
        """HU-2.1-01: la delegación cotejó y el expediente está completo."""
        self.limite_subsanacion = None
        self.cambiar_estado(
            self.Estado.EN_DICTAMEN,
            'La delegación cotejó la documentación completa. Pasa a dictamen jurídico.',
        )

    def pedir_subsanacion(self, faltantes):
        """HU-2.1-01: la delegación avisa qué falta. El plazo no puede pasar del cierre de la convocatoria (RO RHF)."""
        faltantes = faltantes.strip()
        if not faltantes:
            raise ValidationError('Escribe qué documentos faltan o qué hay que corregir.')
        limite = min(sumar_dias_habiles(timezone.localdate(), DIAS_SUBSANACION), self.convocatoria.fecha_clausura)
        self.limite_subsanacion = limite
        self.cambiar_estado(
            self.Estado.SUBSANACION,
            f'Documentación incompleta: {faltantes} Tiene hasta el {limite:%d/%m/%Y} para subsanar.',
        )

    def reenviar_documentacion(self, archivos=None):
        """El solicitante atiende los faltantes dentro del plazo y la solicitud vuelve a cotejo.
        archivos = {tipo: [archivo, ...]}: cada tipo que llega sustituye a los documentos anteriores de ese tipo."""
        if self.estado != self.Estado.SUBSANACION:
            raise ValidationError('Solo se puede reenviar documentación cuando la delegación pidió subsanar.')
        if self.limite_subsanacion and timezone.localdate() > self.limite_subsanacion:
            raise ValidationError(
                f'El plazo para subsanar venció el {self.limite_subsanacion:%d/%m/%Y}. La solicitud ya no puede continuar.'
            )
        archivos = archivos or {}
        # atomic: si un archivo nuevo no sirve (por ejemplo un KML ilegible), no se borra ni se guarda nada
        with transaction.atomic():
            for tipo, lista in archivos.items():
                self.documentos.filter(tipo=tipo).delete()  # el archivo viejo queda en media/, solo se quita de la base
                for archivo in lista:
                    documento = Documento(solicitud=self, tipo=tipo, archivo=archivo)
                    documento.full_clean()  # ejecuta Documento.clean(): valida el polígono SIG
                    documento.save()
            total = sum(len(lista) for lista in archivos.values())
            nota = f'El solicitante reenvió su documentación ({total} archivo(s) nuevo(s)) para un nuevo cotejo.'
            self.limite_subsanacion = None
            self.cambiar_estado(self.Estado.RECIBIDA, nota)


class Documento(models.Model):
    """HU-1.2-01 y HU-1.3-01: archivos de la solicitud (requisitos y polígono SIG en KML o Shapefile)."""

    solicitud = models.ForeignKey(Solicitud, on_delete=models.CASCADE, related_name='documentos')
    tipo = models.CharField(max_length=50)  # id del campo en el formulario: 'curp', 'validacionSig'...
    archivo = models.FileField(upload_to='solicitudes/%Y/%m/')
    fecha_carga = models.DateTimeField(auto_now_add=True)

    TIPO_POLIGONO = 'validacionSig'  # id del campo "Validación de polígonos (SIG)" en React

    def __str__(self):
        return f'{self.tipo} · {self.solicitud}'

    def clean(self):
        # El expediente solo se modifica antes del cotejo o durante la subsanación;
        # ya en dictamen, los documentos quedan fijos.
        editables = [Solicitud.Estado.RECIBIDA, Solicitud.Estado.SUBSANACION]
        if self.solicitud_id and self._state.adding and self.solicitud.estado not in editables:
            raise ValidationError('El expediente ya pasó el cotejo: no se le pueden agregar documentos.')
        # HU-1.3-01: si es el polígono, se revisa que GDAL lo pueda leer ANTES de guardarlo
        if self.tipo == self.TIPO_POLIGONO and self.archivo and not self.archivo._committed:
            try:
                leer_poligono_subido(self.archivo.file)
            except ValueError as error:
                raise ValidationError({'archivo': str(error)})

    def save(self, *args, **kwargs):
        nuevo = self._state.adding
        super().save(*args, **kwargs)  # aquí Django guarda el archivo en media/
        if nuevo and self.tipo == self.TIPO_POLIGONO:
            # Se lee el archivo ya guardado y se copian los límites y el centro a la solicitud
            poligono = leer_poligono(self.archivo.path)
            self.solicitud.poligono = poligono
            self.solicitud.ubicacion = poligono.centroid
            self.solicitud.save(update_fields=['poligono', 'ubicacion'])
