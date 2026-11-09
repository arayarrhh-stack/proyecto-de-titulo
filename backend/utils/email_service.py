"""Servicio desacoplado de correo transaccional con reintentos y modo degradado (RNF-17, RF-29)."""
import json
import os
from urllib import error, request

from .models import Notificacion

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"


def enviar_correo_transaccional(
    destinatario_email,
    asunto,
    contenido_texto,
    usuario_destinatario=None,
    tipo_notificacion="general",
    max_reintentos=2,
):
    """Envía un correo por API HTTPS con reintentos; ante fallo degrada sin bloquear (RNF-17)."""
    if usuario_destinatario and getattr(usuario_destinatario, "is_authenticated", False):
        Notificacion.objects.create(
            destinatario=usuario_destinatario,
            tipo=tipo_notificacion,
            mensaje=f"{asunto}: {contenido_texto}",
        )

    api_key = os.environ.get("BREVO_API_KEY", "").strip()
    remitente = os.environ.get("ACOMSE_EMAIL_SENDER", "notificaciones@acomse.cl")

    # Modo degradado local o sin cuota: registra la notificación sin detener la operación.
    if not api_key:
        return {"enviado": False, "modo": "degradado_local", "reintentos": 0}

    payload = {
        "sender": {"name": "ACOMSE SpA", "email": remitente},
        "to": [{"email": destinatario_email}],
        "subject": asunto,
        "textContent": contenido_texto,
    }
    body_bytes = json.dumps(payload).encode("utf-8")

    intentos = 0
    while intentos <= max_reintentos:
        intentos += 1
        req = request.Request(
            BREVO_API_URL,
            data=body_bytes,
            headers={
                "accept": "application/json",
                "api-key": api_key,
                "content-type": "application/json",
            },
            method="POST",
        )
        try:
            with request.urlopen(req, timeout=4.0) as resp:
                if 200 <= resp.status < 300:
                    return {"enviado": True, "modo": "brevo_api", "reintentos": intentos - 1}
        except (error.URLError, TimeoutError, ValueError):
            continue

    return {"enviado": False, "modo": "degradado_reintento_agotado", "reintentos": intentos}