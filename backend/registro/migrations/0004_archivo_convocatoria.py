# Generated for the convocatoria announcement upload.
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('registro', '0003_poligono_del_predio'),
    ]

    operations = [
        migrations.AlterField(
            model_name='convocatoria',
            name='texto',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='convocatoria',
            name='archivo_convocatoria',
            field=models.FileField(blank=True, upload_to='convocatorias/archivos/'),
        ),
    ]
