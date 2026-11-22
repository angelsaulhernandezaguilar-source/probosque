# Migración de datos: carga el catálogo de los 6 programas.
# Es como un "seed" en Node: corre una sola vez, cuando se aplica la migración.

from django.db import migrations

# (clave que usa el frontend, siglas del folio, nombre)
PROGRAMAS = [
    ('plantaciones', 'PS', 'Plantaciones Sustentables'),
    ('restauracion', 'RHF', 'Restauración Hidrológico-Forestal'),
    ('servicios-ambientales', 'PSAH', 'Pago por Servicios Ambientales Hidrológicos'),
    ('manejo-forestal', 'MFS', 'Manejo Forestal Sustentable'),
    ('capturando-carbono', 'CC', 'Capturando Carbono'),
    ('guardabosques', 'PEG', 'Guardabosques'),
]


def cargar(apps, schema_editor):
    # apps.get_model da la versión del modelo de ESTA migración (no la de models.py),
    # así la migración sigue funcionando aunque el modelo cambie después.
    Programa = apps.get_model('registro', 'Programa')
    for clave, siglas, nombre in PROGRAMAS:
        Programa.objects.get_or_create(clave=clave, defaults={'siglas': siglas, 'nombre': nombre})


def borrar(apps, schema_editor):
    # Se ejecuta si deshaces la migración (migrate registro 0001)
    Programa = apps.get_model('registro', 'Programa')
    Programa.objects.filter(clave__in=[clave for clave, _, _ in PROGRAMAS]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('registro', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(cargar, borrar),
    ]
