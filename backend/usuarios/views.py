"""Vistas API para registro corporativo y gestión de cuentas (M1)."""
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import PerfilUsuarioSerializer, RegistroClienteSerializer
from .services import anonimizar_cuenta_usuario, registrar_empresa_y_usuario

User = get_user_model()


class RegistroClienteView(APIView):
    """Punto de acceso público para el registro corporativo de empresas (HU-01, RF-01)."""

    permission_classes = [AllowAny]

    def post(self, request):
        """Procesa los datos de la empresa y del contacto principal."""
        serializer = RegistroClienteSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            usuario = registrar_empresa_y_usuario(serializer.validated_data)
        except (ValidationError, ValueError) as exc:
            return Response({"detalle": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {
                "mensaje": "Registro exitoso. Se ha enviado un correo de verificación.",
                "correo": usuario.email,
            },
            status=status.HTTP_201_CREATED,
        )


class PerfilUsuarioView(APIView):
    """Permite consultar, actualizar y eliminar el perfil del usuario actual (HU-05, HU-06)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Retorna los datos del perfil del usuario autenticado."""
        serializer = PerfilUsuarioSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request):
        """Ejecuta la supresión y anonimización de datos por la Ley N° 21.719 (HU-06)."""
        anonimizar_cuenta_usuario(request.user)
        return Response(
            {"mensaje": "Cuenta anonimizada y datos personales eliminados correctamente."},
            status=status.HTTP_200_OK,
        )