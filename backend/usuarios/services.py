"""Lógica de negocio para registro corporativo y anonimización de cuentas (HU-01, HU-06)."""
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import transaction
from .rut import normalizar_rut
from .models import EmpresaCliente, RolUsuario


User = get_user_model()


@transaction.atomic
def registrar_empresa_y_usuario(data):
    """Registra una empresa o persona natural y su contacto principal (HU-01, RF-01)."""
    tipo = str(data.get("tipo_cliente", "empresa")).strip()
    rut = normalizar_rut(data.get("rut_empresa", ""))
    correo = str(data.get("correo", "")).strip().lower()
    nombre = str(data.get("nombre_contacto", "")).strip()
    # Una persona natural queda registrada con su propio nombre en lugar de razón social.
    razon_social = nombre if tipo == "persona" else str(data.get("razon_social", "")).strip()

    if not rut:
        raise ValidationError("El RUT no es válido.")

    if EmpresaCliente.objects.filter(rut=rut).exists():
        raise ValidationError("Ya existe una cuenta registrada con este RUT.")

    if User.objects.filter(email=correo).exists():
        raise ValidationError("Ya existe un usuario registrado con este correo electrónico.")

    empresa = EmpresaCliente.objects.create(
        razon_social=razon_social,
        rut=rut,
        telefono=str(data.get("telefono", "")).strip(),
        politica_privacidad_aceptada=True,
        politica_version="1.0",
    )

    usuario = User.objects.create_user(
        username=correo,
        email=correo,
        first_name=nombre,
        password=data.get("password"),
        rol=RolUsuario.CLIENTE,
        empresa=empresa,
        cargo="" if tipo == "persona" else str(data.get("cargo", "")).strip(),
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