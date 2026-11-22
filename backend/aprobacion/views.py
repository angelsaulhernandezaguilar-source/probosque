from drf_spectacular.utils import extend_schema
from rest_framework import viewsets
from rest_framework.decorators import action

from registro.models import Solicitud
from registro.serializers import SolicitudSerializer
from registro.views import aplicar_regla

from .models import Dictamen
from .serializers import DictamenSerializer, FaltantesSerializer


class ExpedienteViewSet(viewsets.GenericViewSet):
    """HU-2.1-01: la Delegación Regional coteja el expediente.
    No tiene lista propia: solo las dos acciones sobre una solicitud."""
    queryset = Solicitud.objects.select_related('convocatoria__programa').prefetch_related('documentos')
    serializer_class = SolicitudSerializer

    @extend_schema(request=None, responses=SolicitudSerializer)
    @action(detail=True, methods=['post'])
    def aceptar(self, request, pk=None):
        """POST /api/expedientes/<id>/aceptar/ · expediente completo: pasa a dictamen."""
        solicitud = self.get_object()
        return aplicar_regla(request, solicitud, solicitud.aceptar_expediente)

    @extend_schema(request=FaltantesSerializer, responses=SolicitudSerializer)
    @action(detail=True, methods=['post'])
    def rechazar(self, request, pk=None):
        """POST /api/expedientes/<id>/rechazar/ · con faltantes: el solicitante tiene plazo para subsanar."""
        datos = FaltantesSerializer(data=request.data)
        datos.is_valid(raise_exception=True)
        solicitud = self.get_object()
        return aplicar_regla(request, solicitud, solicitud.pedir_subsanacion, datos.validated_data['faltantes'])


class DictamenViewSet(viewsets.ModelViewSet):
    """HU-2.4-01: la Unidad Jurídica emite el dictamen (POST) y consulta los emitidos (GET)."""
    queryset = Dictamen.objects.select_related('solicitud')
    serializer_class = DictamenSerializer
    filterset_fields = ['solicitud', 'tipo', 'resultado']
    http_method_names = ['get', 'post', 'head', 'options']  # un dictamen emitido no se edita ni se borra
