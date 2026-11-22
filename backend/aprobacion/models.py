# Módulo 2 · Aprobación (servicios 2.1 a 2.9)
# Por ahora: HU-2.4-01 (dictamen jurídico). La HU-2.1-01 (cotejo) usa los métodos de Solicitud.
from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.utils import timezone

from registro.models import Solicitud


class Dictamen(models.Model):
    """N11 y N14: dictamen técnico (HU-2.3-01, pendiente) y jurídico (HU-2.4-01)."""

    class Tipo(models.TextChoices):
        TECNICO = 'TECNICO', 'Técnico'
        JURIDICO = 'JURIDICO', 'Jurídico'

    class Resultado(models.TextChoices):
        FAVORABLE = 'FAVORABLE', 'Favorable (procedente)'
        DESFAVORABLE = 'DESFAVORABLE', 'Desfavorable (no procedente)'

    # PROTECT: una solicitud con dictamen no se puede borrar
    solicitud = models.ForeignKey(Solicitud, on_delete=models.PROTECT, related_name='dictamenes')
    tipo = models.CharField(max_length=10, choices=Tipo.choices, default=Tipo.JURIDICO)
    resultado = models.CharField(max_length=12, choices=Resultado.choices)
    observaciones = models.TextField(blank=True)  # fundamento: escrituras, actas, requisitos legales
    fecha = models.DateField(default=timezone.localdate, editable=False)

    class Meta:
        ordering = ['-fecha', '-id']
        verbose_name = 'dictamen'
        verbose_name_plural = 'dictámenes'

    def __str__(self):
        return f'{self.get_tipo_display()} {self.get_resultado_display().lower()} · {self.solicitud}'

    def clean(self):
        if self.tipo == self.Tipo.TECNICO:
            raise ValidationError({'tipo': 'El dictamen técnico llega con la HU-2.3-01; por ahora solo se emite el jurídico.'})
        if self.solicitud_id and self.solicitud.estado != Solicitud.Estado.EN_DICTAMEN:
            raise ValidationError(
                f'Solo se dictaminan expedientes completos. La solicitud {self.solicitud.folio} '
                f'está "{self.solicitud.get_estado_display()}".'
            )
        if self.resultado == self.Resultado.DESFAVORABLE and not self.observaciones.strip():
            raise ValidationError({'observaciones': 'Un dictamen desfavorable debe explicar el motivo.'})

    def save(self, *args, **kwargs):
        nuevo = self._state.adding
        # atomic: o se guardan el dictamen Y el cambio de estado, o ninguno de los dos
        with transaction.atomic():
            super().save(*args, **kwargs)
            if nuevo:
                observaciones = f' Observaciones: {self.observaciones.strip()}' if self.observaciones.strip() else ''
                if self.resultado == self.Resultado.FAVORABLE:
                    self.solicitud.cambiar_estado(
                        Solicitud.Estado.JURIDICO_FAVORABLE,
                        f'La Unidad Jurídica emitió dictamen favorable.{observaciones}',
                    )
                else:
                    self.solicitud.cambiar_estado(
                        Solicitud.Estado.NO_FACTIBLE,
                        f'La Unidad Jurídica emitió dictamen desfavorable.{observaciones} Pasa al listado de no factibles.',
                    )
