# Filtros por parámetros de la URL, por ejemplo /api/solicitudes/?folio=PEG-2026-0001
# django-filter los valida (responde 400 si el valor no sirve) y Swagger los documenta solo.
import django_filters

from .models import Convocatoria, Solicitud


class ConvocatoriaFiltro(django_filters.FilterSet):
    programa = django_filters.CharFilter(field_name='programa__clave')  # ?programa=guardabosques

    class Meta:
        model = Convocatoria
        fields = ['programa']


class SolicitudFiltro(django_filters.FilterSet):
    folio = django_filters.CharFilter(lookup_expr='iexact')  # sin importar mayúsculas
    programa = django_filters.CharFilter(field_name='convocatoria__programa__clave')

    class Meta:
        model = Solicitud
        fields = ['folio', 'estado', 'delegacion', 'convocatoria', 'programa']
