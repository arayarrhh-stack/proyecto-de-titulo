"""Configuración de la aplicación de catálogo técnico y proveedores (M2, M3)."""
from django.apps import AppConfig


class CatalogoConfig(AppConfig):
    """Registro de los módulos M2 y M3 en el proyecto Django."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "catalogo"
    verbose_name = "Catálogo Técnico y Proveedores"