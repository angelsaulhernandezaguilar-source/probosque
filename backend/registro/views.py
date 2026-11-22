# Un ViewSet agrupa en una clase las rutas de un recurso. Es como un router de Express con
# router.get('/'), router.get('/:id'), router.post('/')... pero DRF las arma solo.
from django.core.exceptions import ValidationError as DjangoValidationError
from drf_spectacular.utils import extend_schema
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from .filtros import ConvocatoriaFiltro, SolicitudFiltro
from .models import Convocatoria, Documento, Programa, Solicitud
from .serializers import ConvocatoriaSerializer, DocumentoSerializer, ProgramaSerializer, SolicitudSerializer


def aplicar_regla(request, solicitud, regla, *args):
    """Ejecuta un método del modelo (aceptar, rechazar...) y responde con la solicitud actualizada.
    Si la regla no se cumple, el ValidationError de Django se convierte en un 400 de la API."""
    try:
        regla(*args)
    except DjangoValidationError as error:
        raise ValidationError({'non_field_errors': error.messages})
    # Se vuelve a leer de la base: el prefetch_related guardó la lista de documentos de ANTES del cambio
    solicitud = Solicitud.objects.prefetch_related('documentos').get(pk=solicitud.pk)
    return Response(SolicitudSerializer(solicitud, context={'request': request}).data)


class ProgramaViewSet(viewsets.ReadOnlyModelViewSet):
    """Catálogo de los 6 programas (solo lectura)."""
    queryset = Programa.objects.all()
    serializer_class = ProgramaSerializer


class ConvocatoriaViewSet(viewsets.ModelViewSet):
    """HU-1.1-01: la Dirección General publica (POST). HU-1.1-02: el público consulta (GET)."""
    queryset = Convocatoria.objects.select_related('programa')
    serializer_class = ConvocatoriaSerializer
    filterset_class = ConvocatoriaFiltro
    http_method_names = ['get', 'post', 'patch', 'head', 'options']  # sin DELETE: lo publicado no se borra


class SolicitudViewSet(viewsets.ModelViewSet):
    """HU-1.2-01: el solicitante registra (POST). HU-1.2-02: la ventanilla consulta (GET)."""
    # select_related y prefetch_related traen convocatoria, programa y documentos en pocas consultas
    queryset = Solicitud.objects.select_related('convocatoria__programa').prefetch_related('documentos')
    serializer_class = SolicitudSerializer
    filterset_class = SolicitudFiltro
    http_method_names = ['get', 'post', 'head', 'options']  # el estado cambia solo con las acciones

    @extend_schema(request=None, responses=SolicitudSerializer)
    @action(detail=True, methods=['post'])
    def reenviar(self, request, pk=None):
        """POST /api/solicitudes/<id>/reenviar/ · el solicitante atiende los faltantes dentro del plazo.
        Multipart opcional: cada campo es el tipo de documento (curp, validacionSig...) y trae sus archivos nuevos."""
        solicitud = self.get_object()
        # request.FILES es como req.files de multer: getlist() da todos los archivos de un mismo campo
        archivos = {tipo: request.FILES.getlist(tipo) for tipo in request.FILES}
        return aplicar_regla(request, solicitud, solicitud.reenviar_documentacion, archivos)


class DocumentoViewSet(viewsets.ModelViewSet):
    """HU-1.2-01 y HU-1.3-01: carga de documentos y polígono SIG (multipart/form-data)."""
    queryset = Documento.objects.all()
    serializer_class = DocumentoSerializer
    filterset_fields = ['solicitud', 'tipo']
    http_method_names = ['get', 'post', 'head', 'options']
