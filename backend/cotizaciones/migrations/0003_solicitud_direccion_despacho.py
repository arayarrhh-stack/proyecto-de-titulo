from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("cotizaciones", "0002_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="solicitud",
            name="direccion_despacho",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
    ]