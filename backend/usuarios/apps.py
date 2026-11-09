"""Configuración de la aplicación de usuarios y gestión de identidad (M1)."""
from django.apps import AppConfig


class UsuariosConfig(AppConfig):
    """Registro del módulo M1 de identidad y accesos en Django."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "usuarios"
    verbose_name = "Gestión de Identidad y Acceso"