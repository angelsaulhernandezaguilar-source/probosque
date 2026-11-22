# Un serializer traduce entre JSON (lo que viaja por la API) y los modelos de Django.
# Es como el paso de validar req.body y armar la respuesta res.json() en Express, pero declarativo.
import os

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import Convocatoria, Documento, Programa, Solicitud
from .validadores import clabe_valida


class ReglasDelModeloMixin:
    """DRF no ejecuta Model.clean(). Este mixin lo llama para que las reglas vivan
    en un solo lugar (models.py) y apliquen igual en la API y en el admin."""

    def validate(self, attrs):
        attrs = super().validate(attrs)
        instancia = self.instance or self.Meta.model()  # objeto existente (PATCH) o uno nuevo (POST)
        for campo, valor in attrs.items():
            setattr(instancia, campo, valor)
        try:
            instancia.clean()
        except DjangoValidationError as error:
            # Se convierte el error de Django en un error 400 de la API
            raise serializers.ValidationError(
                getattr(error, 'message_dict', {'non_field_errors': error.messages})
            )
        return attrs


class ProgramaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Programa
        fields = ['id', 'clave', 'siglas', 'nombre']


class ConvocatoriaSerializer(ReglasDelModeloMixin, serializers.ModelSerializer):
    # El frontend manda el programa por su clave ("guardabosques"), no por su id
    programa = serializers.SlugRelatedField(slug_field='clave', queryset=Programa.objects.all())
    programa_nombre = serializers.CharField(source='programa.nombre', read_only=True)
    ejercicio = serializers.IntegerField(read_only=True)
    estado = serializers.CharField(read_only=True)  # proxima / abierta / cerrada (servicio 1.1)
    total_solicitudes = serializers.IntegerField(source='solicitudes.count', read_only=True)

    class Meta:
        model = Convocatoria
        fields = [
            'id', 'programa', 'programa_nombre', 'ejercicio', 'fecha_apertura', 'fecha_clausura',
            'texto', 'reglas_operacion', 'fecha_publicacion', 'estado', 'total_solicitudes',
        ]
        read_only_fields = ['fecha_publicacion']


class DocumentoSerializer(ReglasDelModeloMixin, serializers.ModelSerializer):
    # El mixin ejecuta Documento.clean(): ahí se valida que el polígono SIG se pueda leer
    nombre = serializers.SerializerMethodField()

    class Meta:
        model = Documento
        fields = ['id', 'solicitud', 'tipo', 'archivo', 'nombre', 'fecha_carga']

    def get_nombre(self, documento) -> str:
        """Solo el nombre del archivo, sin la carpeta: 'curp.pdf'."""
        return os.path.basename(documento.archivo.name)


class SolicitudSerializer(ReglasDelModeloMixin, serializers.ModelSerializer):
    programa = serializers.CharField(source='convocatoria.programa.clave', read_only=True)
    documentos = DocumentoSerializer(many=True, read_only=True)  # los archivos ya cargados
    limite_aviso_faltantes = serializers.DateField(read_only=True)  # propiedades del modelo (plazos)
    fecha_limite_dictamen = serializers.DateField(read_only=True)

    class Meta:
        model = Solicitud
        fields = [
            'id', 'folio', 'convocatoria', 'programa',
            'tipo_persona', 'nombres', 'primer_apellido', 'segundo_apellido',
            'telefono', 'correo', 'delegacion', 'municipio', 'poligono', 'ubicacion',
            'datos_programa', 'estado', 'fecha_registro', 'limite_subsanacion',
            'limite_aviso_faltantes', 'fecha_limite_dictamen', 'historial', 'documentos',
        ]
        # El estado solo cambia con las acciones (aceptar, rechazar, dictaminar...), nunca editándolo directo.
        # El polígono se llena al subir el archivo SIG.
        read_only_fields = ['estado', 'limite_subsanacion', 'poligono']

    def validate_datos_programa(self, datos):
        if not isinstance(datos, dict):
            raise serializers.ValidationError('Debe ser un objeto JSON, por ejemplo {"superficie": 12}.')
        # N22: si el formulario trae CLABE se revisa aquí también. El backend nunca confía solo en el frontend.
        clabe = datos.get('clabe')
        if clabe and not clabe_valida(str(clabe)):
            raise serializers.ValidationError({'clabe': 'La CLABE debe tener 18 dígitos y un dígito de control válido.'})
        return datos
