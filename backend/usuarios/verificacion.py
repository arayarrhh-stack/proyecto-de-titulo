"""Activación de cuenta por correo con enlace firmado y de vigencia limitada (HU-02, RF-02)."""
import os

from django.contrib.auth import get_user_model
from django.core import signing

from utils.email_service import enviar_correo_transaccional

SAL = "acomse-verificacion-correo"
VIGENCIA_SEGUNDOS = 48 * 60 * 60  # el enlace caduca a las 48 horas (HU-02)


def generar_token(usuario):
    return signing.dumps({"uid": usuario.pk, "email": usuario.email}, salt=SAL)


def usuario_desde_token(token):
    """Devuelve el usuario del enlace o lanza ValueError con un mensaje para mostrar."""
    try:
        datos = signing.loads(str(token), salt=SAL, max_age=VIGENCIA_SEGUNDOS)
    except signing.SignatureExpired:
        raise ValueError("El enlace de activación venció. Solicita uno nuevo.")
    except signing.BadSignature:
        raise ValueError("El enlace de activación no es válido.")

    usuario = (
        get_user_model()
        .objects.filter(pk=datos.get("uid"), email=datos.get("email"))
        .first()
    )
    if usuario is None:
        raise ValueError("El enlace de activación no es válido.")
    return usuario


def enviar_correo_verificacion(usuario):
    """Envía el enlace de activación. En modo local (sin clave de correo) lo imprime en consola."""
    frontend = os.environ.get("ACOMSE_FRONTEND_URL", "http://localhost:5173").rstrip("/")
    enlace = f"{frontend}/verificar-correo?token={generar_token(usuario)}"
    contenido = (
        f"Hola {usuario.first_name},\n\n"
        "Para activar tu cuenta en ACOMSE ingresa al siguiente enlace (vence en 48 horas):\n"
        f"{enlace}\n\n"
        "Si no creaste esta cuenta, ignora este correo."
    )
    # No se asocia el usuario para no guardar el enlace en la tabla de notificaciones.
    resultado = enviar_correo_transaccional(
        destinatario_email=usuario.email,
        asunto="Activa tu cuenta en ACOMSE",
        contenido_texto=contenido,
        tipo_notificacion="verificacion_correo",
    )
    if not os.environ.get("BREVO_API_KEY"):
        print(f"[ACOMSE] Enlace de activación para {usuario.email}: {enlace}")
    return resultado