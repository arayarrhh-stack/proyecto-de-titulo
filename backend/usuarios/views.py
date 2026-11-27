"""Vistas API para registro corporativo y gestión de cuentas (M1)."""
import re

from django.db.models import Count, Q, Value
from django.db.models.functions import Replace
from django.contrib.auth import authenticate, get_user_model, login, logout
from django.core.exceptions import ValidationError
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie, csrf_exempt
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import SimpleRateThrottle
from .verificacion import enviar_correo_verificacion, usuario_desde_token
from .models import RolUsuario
from django.shortcuts import get_object_or_404

from .serializers import ActualizarPerfilSerializer, LoginSerializer, PerfilUsuarioSerializer, RegistroClienteSerializer
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
            mensaje = " ".join(getattr(exc, "messages", [str(exc)]))
            return Response({"detalle": mensaje}, status=status.HTTP_400_BAD_REQUEST)

        enviar_correo_verificacion(usuario)

        return Response(
            {
                "mensaje": "Registro exitoso. Te enviamos un correo para activar tu cuenta.",
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

    def patch(self, request):
        """Actualiza los datos de contacto y facturación del cliente (RF 004)."""
        serializer = ActualizarPerfilSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        datos = serializer.validated_data
        usuario = request.user
        empresa = usuario.empresa

        campos_empresa = {"razon_social", "direccion", "telefono"}
        if campos_empresa & datos.keys() and empresa is None:
            return Response(
                {"detalle": "Tu cuenta no tiene datos de facturación asociados."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if "nombre" in datos:
            usuario.first_name = datos["nombre"]
        if "cargo" in datos:
            usuario.cargo = datos["cargo"]
        usuario.save(update_fields=["first_name", "cargo"])

        if empresa is not None:
            for campo in campos_empresa:
                if campo in datos:
                    setattr(empresa, campo, datos[campo])
            empresa.save()

        return Response(PerfilUsuarioSerializer(usuario).data, status=status.HTTP_200_OK)

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


class LoginView(APIView):
    """Inicia sesión con correo y contraseña y devuelve el perfil con su rol."""

    permission_classes = [AllowAny]
    authentication_classes = []

    @method_decorator(csrf_exempt)
    def dispatch(self, request, *args, **kwargs):
        return super().dispatch(request, *args, **kwargs)

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        correo = serializer.validated_data["correo"].strip().lower()
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


class VerificarCorreoView(APIView):
    """Activa la cuenta con el enlace enviado por correo (HU-02, RF-02)."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        try:
            usuario = usuario_desde_token(request.data.get("token", ""))
        except ValueError as exc:
            return Response({"detalle": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        if not usuario.correo_verificado:
            usuario.correo_verificado = True
            usuario.save(update_fields=["correo_verificado"])
        return Response(
            {"mensaje": "Tu cuenta fue activada. Ya puedes iniciar sesión."},
            status=status.HTTP_200_OK,
        )


class LimiteReenvioThrottle(SimpleRateThrottle):
    """Evita el abuso del reenvío del correo de activación (por IP)."""

    scope = "reenvio"
    rate = "5/hour"

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


class ReenviarVerificacionView(APIView):
    """Reenvía el enlace de activación a una cuenta sin activar (HU-02)."""

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [LimiteReenvioThrottle]

    def post(self, request):
        correo = str(request.data.get("correo", "")).strip().lower()
        usuario = None
        if correo:
            usuario = User.objects.filter(
                email__iexact=correo, is_active=True, correo_verificado=False
            ).first()
        if usuario:
            enviar_correo_verificacion(usuario)
        return Response(
            {"mensaje": "Si el correo corresponde a una cuenta sin activar, te enviamos un nuevo enlace."},
            status=status.HTTP_200_OK,
        )


class ClientesAdminListView(APIView):
    """RF 035: la administradora lista los clientes y busca por empresa o RUT."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        usuario = request.user
        if not (usuario.is_staff or getattr(usuario, "rol", "") == RolUsuario.ADMINISTRADORA):
            return Response(
                {"detalle": "Solo administración puede ver el listado de clientes."},
                status=status.HTTP_403_FORBIDDEN,
            )

        clientes = (
            User.objects.filter(rol=RolUsuario.CLIENTE, eliminado_anonimizado=False)
            .select_related("empresa")
            .annotate(total_solicitudes=Count("solicitudes"))
            .order_by("empresa__razon_social", "first_name")
        )

        termino = request.query_params.get("q", "").strip()
        if termino:
            # El RUT se compara sin puntos, guion ni espacios: 76.123.456-7 = 761234567.
            rut_buscado = re.sub(r"[.\-\s]", "", termino)
            clientes = clientes.annotate(
                rut_limpio=Replace(
                    Replace("empresa__rut", Value("."), Value("")), Value("-"), Value("")
                )
            ).filter(
                Q(empresa__razon_social__icontains=termino)
                | Q(first_name__icontains=termino)
                | Q(email__icontains=termino)
                | (Q(rut_limpio__icontains=rut_buscado) if rut_buscado else Q())
            )

        datos = [
            {
                "id": c.id,
                "razon_social": c.empresa.razon_social if c.empresa else "",
                "rut": c.empresa.rut if c.empresa else "",
                "telefono": c.empresa.telefono if c.empresa else "",
                "contacto": c.first_name or c.username,
                "cargo": c.cargo,
                "correo": c.email,
                "correo_verificado": c.correo_verificado,
                "fecha_registro": c.date_joined.date().isoformat(),
                "total_solicitudes": c.total_solicitudes,
            }
            for c in clientes
        ]
        return Response(datos, status=status.HTTP_200_OK)


class ClienteAdminDetalleView(APIView):
    """RF 036: ficha de un cliente con el historial completo de sus solicitudes."""

    permission_classes = [IsAuthenticated]

    def get(self, request, cliente_id):
        usuario = request.user
        if not (usuario.is_staff or getattr(usuario, "rol", "") == RolUsuario.ADMINISTRADORA):
            return Response(
                {"detalle": "Solo administración puede ver la ficha de un cliente."},
                status=status.HTTP_403_FORBIDDEN,
            )

        cliente = get_object_or_404(
            User.objects.select_related("empresa"),
            id=cliente_id,
            rol=RolUsuario.CLIENTE,
            eliminado_anonimizado=False,
        )

        solicitudes = cliente.solicitudes.prefetch_related(
            "lineas__producto", "cotizaciones_cliente"
        ).order_by("-creado_en")

        historial = []
        for s in solicitudes:
            lineas = [
                {
                    "codigo": l.producto.codigo,
                    "producto": l.producto.nombre,
                    "talla": l.talla,
                    "color": l.color,
                    "cantidad": l.cantidad,
                }
                for l in s.lineas.all()
            ]
            ofertas = list(s.cotizaciones_cliente.all())
            oferta = max(ofertas, key=lambda o: o.id) if ofertas else None
            historial.append(
                {
                    "id": s.id,
                    "folio": s.folio,
                    "fecha": s.creado_en.date().isoformat(),
                    "estado": s.estado,
                    "estado_texto": s.get_estado_display(),
                    "canal": s.get_canal_origen_display(),
                    "observaciones": s.observaciones,
                    "unidades": sum(l["cantidad"] for l in lineas),
                    "lineas": lineas,
                    "oferta": (
                        {"folio": oferta.folio, "total": str(oferta.total)} if oferta else None
                    ),
                }
            )

        empresa = cliente.empresa
        return Response(
            {
                "id": cliente.id,
                "razon_social": empresa.razon_social if empresa else "",
                "rut": empresa.rut if empresa else "",
                "direccion": empresa.direccion if empresa else "",
                "telefono": empresa.telefono if empresa else "",
                "contacto": cliente.first_name or cliente.username,
                "cargo": cliente.cargo,
                "correo": cliente.email,
                "correo_verificado": cliente.correo_verificado,
                "fecha_registro": cliente.date_joined.date().isoformat(),
                "solicitudes": historial,
            },
            status=status.HTTP_200_OK,
        )