"""Lógica de negocio para registro corporativo y anonimización de cuentas (HU-01, HU-06)."""
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import transaction

from .models import EmpresaCliente, RolUsuario

User = get_user_model()


@transaction.atomic
def registrar_empresa_y_usuario(data):
    """Registra una empresa cliente y su primer contacto corporativo (HU-01, RF-01)."""
    rut = str(data.get("rut_empresa", "")).strip()
    correo = str(data.get("correo", "")).strip().lower()

    if EmpresaCliente.objects.filter(rut=rut).exists():
        raise ValidationError("Ya existe una empresa registrada con este RUT.")

    if User.objects.filter(email=correo).exists():
        raise ValidationError("Ya existe un usuario registrado con este correo electrónico.")

    empresa = EmpresaCliente.objects.create(
        razon_social=str(data.get("razon_social", "")).strip(),
        rut=rut,
        telefono=str(data.get("telefono", "")).strip(),
        politica_privacidad_aceptada=True,
        politica_version="1.0",
    )

    usuario = User.objects.create_user(
        username=correo,
        email=correo,
        first_name=str(data.get("nombre_contacto", "")).strip(),
        password=data.get("password"),
        rol=RolUsuario.CLIENTE,
        empresa=empresa,
        cargo=str(data.get("cargo", "")).strip(),
        correo_verificado=False,  # Exige verificación posterior por RF-02
    )

    return usuario


@transaction.atomic
def anonimizar_cuenta_usuario(usuario):
    """Ejerce el derecho de supresión (Ley N° 21.719), anonimizando datos personales (HU-06, RNF-05)."""
    if usuario.eliminado_anonimizado:
        return usuario

    uid = str(usuario.id)
    usuario.first_name = "Usuario"
    usuario.last_name = "Eliminado"
    usuario.email = f"eliminado_{uid}@anonimo.local"
    usuario.username = f"eliminado_{uid}"
    usuario.cargo = "Anonimizado"
    usuario.set_unusable_password()
    usuario.eliminado_anonimizado = True
    usuario.is_active = False
    usuario.save(
        update_fields=[
            "first_name",
            "last_name",
            "email",
            "username",
            "cargo",
            "password",
            "eliminado_anonimizado",
            "is_active",
        ]
    )
    return usuario