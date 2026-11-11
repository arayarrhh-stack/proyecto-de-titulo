"""Serializadores para registro corporativo, autenticación y perfiles (M1)."""
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
    """Valida el registro conjunto de empresa y usuario administrador inicial (HU-01, RF-01)."""

    razon_social = serializers.CharField(max_length=150)
    rut_empresa = serializers.CharField(max_length=12)
    nombre_contacto = serializers.CharField(max_length=150)
    cargo = serializers.CharField(max_length=100, required=False, allow_blank=True)
    correo = serializers.EmailField()
    telefono = serializers.CharField(max_length=30, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=8)
    acepta_politica = serializers.BooleanField()

    def validate_acepta_politica(self, value):
        """Exige la aceptación explícita de la política de privacidad por la Ley N° 21.719."""
        if not value:
            raise serializers.ValidationError(
                "Debe aceptar la política de privacidad para registrarse (Ley N° 21.719)."
            )
        return value


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