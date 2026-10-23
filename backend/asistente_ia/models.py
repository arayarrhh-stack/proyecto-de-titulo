"""Modelos de datos para reglas determinísticas, bitácora y derivaciones (M6)."""
from django.conf import settings
from django.db import models


class EstadoValidacionRegla(models.TextChoices):
    """Ciclo de vida de validación técnica de las reglas (apartado 7.2)."""

    BORRADOR = "borrador", "Borrador"
    EN_REVISION = "en_revision", "En revisión"
    VALIDADA = "validada", "Validada"
    VENCIDA = "vencida", "Vencida"


class EstadoSolicitudAsesoria(models.TextChoices):
    """Estados de atención para consultas derivadas a una asesora."""

    PENDIENTE = "pendiente", "Pendiente"
    EN_GESTION = "en_gestion", "En gestión"
    RESUELTA = "resuelta", "Resuelta"


class Regla(models.Model):
    """Regla determinística validada por una persona competente (HU-29, RF-42)."""

    codigo = models.CharField(max_length=10, unique=True)  # Ej: RG-01 a RG-14.
    condicion = models.TextField()
    resultado = models.TextField()
    clase_recomendada = models.CharField(max_length=20, blank=True, default="")
    fuente = models.CharField(max_length=150)
    version = models.CharField(max_length=20, default="0.1")
    vigencia = models.DateField(null=True, blank=True)
    estado = models.CharField(
        max_length=20,
        choices=EstadoValidacionRegla.choices,
        default=EstadoValidacionRegla.BORRADOR,
    )
    validada_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reglas_validadas",
    )
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["codigo"]

    def __str__(self):
        return f"{self.codigo} ({self.estado})"


class Conversacion(models.Model):
    """Bitácora anonimizada de interacciones con el asistente (HU-33, RF-49, RNF-10)."""

    sesion_anonima = models.CharField(max_length=64, db_index=True)
    antecedentes = models.JSONField(default=dict)
    regla = models.ForeignKey(
        Regla,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="conversaciones",
    )
    regla_codigo = models.CharField(max_length=10, blank=True, default="")
    decision = models.CharField(max_length=30)  # orientar, abstener, derivar, declinar.
    productos_sugeridos = models.JSONField(default=list)
    derivacion = models.BooleanField(default=False)
    tiempo_respuesta_ms = models.PositiveIntegerField(default=0)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-creado_en"]

    def __str__(self):
        return f"Sesión {self.sesion_anonima[:8]} - {self.regla_codigo}"


class SolicitudAsesoria(models.Model):
    """Derivación creada cuando el asistente se abstiene o supera un umbral (HU-30, RF-45)."""

    conversacion = models.OneToOneField(
        Conversacion,
        on_delete=models.CASCADE,
        related_name="solicitud_asesoria",
    )
    motivo = models.TextField()
    estado = models.CharField(
        max_length=20,
        choices=EstadoSolicitudAsesoria.choices,
        default=EstadoSolicitudAsesoria.PENDIENTE,
    )
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-creado_en"]

    def __str__(self):
        return f"Asesoría #{self.id} - {self.estado}"
