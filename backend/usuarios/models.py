"""Modelos de usuarios corporativos y control de acceso por roles (Anexo I, Fig. 7 y 8)."""
from django.contrib.auth.models import AbstractUser
from django.db import models


class RolUsuario(models.TextChoices):
    """Roles definidos en la arquitectura para el control de acceso (apartado 5.1.1)."""

    CLIENTE = "cliente", "Cliente corporativo"
    ADMINISTRADORA = "administradora", "Administradora"
    VALIDADORA = "validadora", "Validadora técnica"


class EmpresaCliente(models.Model):
    """Organización cliente B2B registrada en la plataforma (HU-01, RF-01)."""

    razon_social = models.CharField(max_length=150)
    rut = models.CharField(max_length=12, unique=True, db_index=True)
    direccion = models.CharField(max_length=255, blank=True, default="")
    telefono = models.CharField(max_length=30, blank=True, default="")
    politica_privacidad_aceptada = models.BooleanField(default=False)
    politica_version = models.CharField(max_length=20, default="1.0")
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["razon_social"]

    def __str__(self):
        return f"{self.razon_social} ({self.rut})"


class Usuario(AbstractUser):
    """Modelo personalizado de usuario con soporte de roles y empresa asociada (HU-01, HU-03)."""

    rol = models.CharField(
        max_length=30,
        choices=RolUsuario.choices,
        default=RolUsuario.CLIENTE,
    )
    empresa = models.ForeignKey(
        EmpresaCliente,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="contactos",
    )
    cargo = models.CharField(max_length=100, blank=True, default="")
    correo_verificado = models.BooleanField(default=False)
    eliminado_anonimizado = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.username} ({self.rol})"