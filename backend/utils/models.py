"""Entidades de soporte transversal: Notificación y Bitácora de auditoría (Anexo I, pág. 77)."""
from django.conf import settings
from django.db import models


class BitacoraAuditoria(models.Model):
    """Registro inmutable de acciones críticas con valor anterior y nuevo (RNF-09, Tabla 43)."""

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="acciones_auditadas",
    )
    accion = models.CharField(max_length=100, db_index=True)
    entidad = models.CharField(max_length=100, db_index=True)
    entidad_id = models.CharField(max_length=60, blank=True, default="")
    valor_anterior = models.JSONField(default=dict, blank=True)
    valor_nuevo = models.JSONField(default=dict, blank=True)
    fecha = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-fecha", "-id"]

    def __str__(self):
        return f"[{self.fecha:%Y-%m-%d %H:%M}] {self.accion} en {self.entidad}"


class Notificacion(models.Model):
    """Notificaciones internas del sistema con control de lectura (Anexo I, pág. 77)."""

    destinatario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notificaciones",
    )
    tipo = models.CharField(max_length=50, db_index=True)
    mensaje = models.TextField()
    leida = models.BooleanField(default=False)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-creado_en", "-id"]

    def __str__(self):
        return f"Para {self.destinatario_id}: {self.tipo}"