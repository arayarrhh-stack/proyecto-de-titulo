"""Configuración de la aplicación transversal de utilidades, auditoría y analítica (M8)."""
from django.apps import AppConfig


class UtilsConfig(AppConfig):
    """Registro del módulo de soporte, bitácora de auditoría y analítica en Django."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "utils"
    verbose_name = "Utilidades, Auditoría y Analítica"