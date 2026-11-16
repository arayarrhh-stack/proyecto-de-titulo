"""Serializadores para registro corporativo, autenticación y perfiles (M1)."""
import re

from .rut import normalizar_rut, validar_rut
from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import EmpresaCliente

User = get_user_model()


class EmpresaClienteSerializer(serializers.ModelSerializer):
    """Serializador para los datos de la empresa cliente B2B."""

    class Meta:
        model = EmpresaCliente
        fields = [
            "id",
            "razon_social",
            "rut",
            "direccion",
            "telefono",
            "politica_privacidad_aceptada",
        ]


class RegistroClienteSerializer(serializers.Serializer):
    """Valida el registro de una empresa o de una persona natural (HU-01, RF-01)."""

    tipo_cliente = serializers.ChoiceField(choices=["empresa", "persona"], default="empresa")
    razon_social = serializers.CharField(max_length=150, required=False, allow_blank=True)
    # RUT de la empresa o, para una persona natural, el RUT de la persona.
    rut_empresa = serializers.CharField(max_length=14)
    nombre_contacto = serializers.CharField(max_length=150)
    cargo = serializers.CharField(max_length=100, required=False, allow_blank=True)
    correo = serializers.EmailField()
    telefono = serializers.CharField(max_length=30, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=8)
    acepta_politica = serializers.BooleanField()

    def validate_rut_empresa(self, value):
        if not validar_rut(value):
            raise serializers.ValidationError("El RUT no es válido.")
        return normalizar_rut(value)

    def validate_password(self, value):
        if not re.search(r"[A-Z]", value) or not re.search(r"\d", value):
            raise serializers.ValidationError(
                "La contraseña debe tener al menos una mayúscula y un número."
            )
        return value

    def validate_acepta_politica(self, value):
        """Exige la aceptación explícita de la política de privacidad por la Ley N° 21.719."""
        if not value:
            raise serializers.ValidationError(
                "Debe aceptar la política de privacidad para registrarse (Ley N° 21.719)."
            )
        return value

    def validate(self, attrs):
        if attrs["tipo_cliente"] == "empresa" and not attrs.get("razon_social", "").strip():
            raise serializers.ValidationError(
                {"razon_social": "La razón social es obligatoria para empresas."}
            )
        return attrs


class PerfilUsuarioSerializer(serializers.ModelSerializer):
    """Serializador para consultar y actualizar el perfil del usuario autenticado (HU-05)."""

    empresa = EmpresaClienteSerializer(read_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "cargo", "empresa", "correo_verificado", "rol"]
        read_only_fields = ["username", "email", "correo_verificado", "rol"]


class LoginSerializer(serializers.Serializer):
    """Valida las credenciales de inicio de sesión (correo y contraseña)."""

    correo = serializers.EmailField()
    password = serializers.CharField(write_only=True)