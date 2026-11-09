"""Configuración de la aplicación de cotizaciones e intermediación (M4, M5, M7)."""
from django.apps import AppConfig


class CotizacionesConfig(AppConfig):
    """Registro del módulo comercial y de intermediación en Django."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "cotizaciones"
    verbose_name = "Cotizaciones e Intermediación"