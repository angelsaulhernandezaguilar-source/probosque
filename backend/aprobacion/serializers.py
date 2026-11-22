from rest_framework import serializers

from registro.serializers import ReglasDelModeloMixin

from .models import Dictamen


class FaltantesSerializer(serializers.Serializer):
    """Cuerpo de POST /api/expedientes/<id>/rechazar/ (HU-2.1-01: aviso de faltantes)."""
    faltantes = serializers.CharField(help_text='Qué documentos faltan o qué hay que corregir.')


class DictamenSerializer(ReglasDelModeloMixin, serializers.ModelSerializer):
    folio = serializers.CharField(source='solicitud.folio', read_only=True)

    class Meta:
        model = Dictamen
        fields = ['id', 'solicitud', 'folio', 'tipo', 'resultado', 'observaciones', 'fecha']
