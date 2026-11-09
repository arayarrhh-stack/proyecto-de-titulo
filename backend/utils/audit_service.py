"""Servicio para registrar acciones críticas en la bitácora de auditoría (RNF-09)."""
from .models import BitacoraAuditoria


def registrar_auditoria(
    accion,
    entidad,
    entidad_id="",
    usuario=None,
    valor_anterior=None,
    valor_nuevo=None,
):
    """Crea un registro de auditoría con usuario, fecha, valor anterior y nuevo."""
    user_obj = usuario if (usuario and getattr(usuario, "is_authenticated", False)) else None
    return BitacoraAuditoria.objects.create(
        usuario=user_obj,
        accion=str(accion)[:100],
        entidad=str(entidad)[:100],
        entidad_id=str(entidad_id)[:60],
        valor_anterior=valor_anterior or {},
        valor_nuevo=valor_nuevo or {},
    )