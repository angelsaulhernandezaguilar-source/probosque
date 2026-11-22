# Pantallas provisionales en /admin/ para Dirección General y ventanilla (HU-1.2-02),
# mientras React cubre las pantallas principales.
from django.contrib import admin
from django.contrib.gis.admin import GISModelAdmin

from .models import Convocatoria, Documento, Programa, Solicitud


@admin.register(Programa)
class ProgramaAdmin(admin.ModelAdmin):
    list_display = ['clave', 'siglas', 'nombre']


@admin.register(Convocatoria)
class ConvocatoriaAdmin(admin.ModelAdmin):
    list_display = ['programa', 'fecha_apertura', 'fecha_clausura', 'estado']
    list_filter = ['programa']


class DocumentoInline(admin.TabularInline):
    """Muestra los documentos dentro de la pantalla de cada solicitud."""
    model = Documento
    extra = 0


@admin.register(Solicitud)
class SolicitudAdmin(GISModelAdmin):  # GISModelAdmin dibuja un mapa para el campo ubicacion
    list_display = ['folio', 'nombres', 'primer_apellido', 'convocatoria', 'delegacion', 'estado', 'fecha_registro']
    list_filter = ['estado', 'delegacion', 'convocatoria__programa']
    search_fields = ['folio', 'nombres', 'primer_apellido']
    readonly_fields = ['folio', 'fecha_registro', 'historial']
    inlines = [DocumentoInline]
