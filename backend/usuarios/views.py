"""Vistas API para registro corporativo y gestión de cuentas (M1)."""
from django.contrib.auth import authenticate, get_user_model, login, logout
from django.core.exceptions import ValidationError
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import LoginSerializer, PerfilUsuarioSerializer, RegistroClienteSerializer
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


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfView(APIView):
    """Entrega la cookie CSRF que el frontend necesita antes de iniciar sesión."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response({"mensaje": "ok"})


@method_decorator(csrf_protect, name="dispatch")
class LoginView(APIView):
    """Inicia sesión con correo y contraseña y devuelve el perfil con su rol."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        correo = serializer.validated_data["correo"].strip().lower()
        # El registro usa el correo como username, pero las cuentas creadas
        # por consola (admin) pueden tener otro username: se busca por correo.
        existente = User.objects.filter(email__iexact=correo).first()
        username = existente.username if existente else correo

        usuario = authenticate(
            request, username=username, password=serializer.validated_data["password"]
        )
        if usuario is None:
            return Response(
                {"detalle": "Correo o contraseña incorrectos."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        login(request, usuario)
        return Response(PerfilUsuarioSerializer(usuario).data, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """Cierra la sesión actual."""

    permission_classes = [AllowAny]

    def post(self, request):
        logout(request)
        return Response({"mensaje": "Sesión cerrada."}, status=status.HTTP_200_OK)