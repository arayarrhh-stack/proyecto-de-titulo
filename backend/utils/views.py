"""Vistas del Módulo M8 (Analítica del negocio: RF-56, RF-57) y Contacto Institucional (RF-24)."""
from decimal import Decimal
from django.db.models import Count, Sum
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.utils import timezone

from .models import MensajeContacto

from asistente_ia.models import Conversacion, SolicitudAsesoria
from cotizaciones.models import EstadoSolicitud, LineaSolicitud, Pedido, Solicitud
from .email_service import enviar_correo_transaccional


def _es_administradora(user):
    """Verifica que solo el rol Administrador acceda a indicadores y márgenes (RNF-04, HU-40)."""
    return bool(
        user
        and user.is_authenticated
        and (user.is_staff or getattr(user, "rol", "") == "administradora")
    )


class TableroComercialAnaliticaView(APIView):
    """HU-40 y RF-56: solicitudes por estado, conversión, margen, top productos y clientes."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not _es_administradora(request.user):
            return Response(
                {"detalle": "Acceso reservado al rol Administrador (RF-56, RNF-04)."},
                status=status.HTTP_403_FORBIDDEN,
            )

        por_estado = dict(
            Solicitud.objects.values_list("estado").annotate(total=Count("id"))
        )
        cotizaciones_enviadas = Solicitud.objects.filter(
            estado__in=[
                EstadoSolicitud.COTIZACION_ENVIADA,
                EstadoSolicitud.ACEPTADA,
                EstadoSolicitud.RECHAZADA,
                EstadoSolicitud.VENCIDA,
            ]
        ).count()
        cotizaciones_aceptadas = Solicitud.objects.filter(
            estado=EstadoSolicitud.ACEPTADA
        ).count()

        # IG-06: (Cotizaciones aceptadas / Cotizaciones enviadas) * 100
        tasa_conversion = (
            round((cotizaciones_aceptadas / cotizaciones_enviadas) * 100, 2)
            if cotizaciones_enviadas > 0
            else 0.0
        )

        resumen_pedidos = Pedido.objects.aggregate(
            total_pedidos=Count("id"),
            venta_neta_acumulada=Sum("venta_total_neta"),
            costo_neto_acumulado=Sum("costo_total_neto"),
            margen_real_acumulado=Sum("margen_real_neto"),
        )

        productos_mas_solicitados = list(
            LineaSolicitud.objects.values(
                "producto__codigo", "producto__nombre"
            )
            .annotate(unidades_solicitadas=Sum("cantidad"))
            .order_by("-unidades_solicitadas")[:5]
        )

        clientes_conteo = (
            Solicitud.objects.values("cliente_id")
            .annotate(num_solicitudes=Count("id"))
        )
        clientes_nuevos = sum(1 for c in clientes_conteo if c["num_solicitudes"] == 1)
        clientes_recurrentes = sum(1 for c in clientes_conteo if c["num_solicitudes"] > 1)

        return Response(
            {
                "solicitudes_por_estado": por_estado,
                "tasa_conversion_porcentaje": tasa_conversion,
                "pedidos": {
                    "total": resumen_pedidos["total_pedidos"] or 0,
                    "venta_neta_total": str(
                        resumen_pedidos["venta_neta_acumulada"] or Decimal("0.00")
                    ),
                    "costo_neto_total": str(
                        resumen_pedidos["costo_neto_acumulado"] or Decimal("0.00")
                    ),
                    "margen_real_total": str(
                        resumen_pedidos["margen_real_acumulado"] or Decimal("0.00")
                    ),
                },
                "productos_mas_solicitados": productos_mas_solicitados,
                "clientes": {
                    "nuevos": clientes_nuevos,
                    "recurrentes": clientes_recurrentes,
                },
            },
            status=status.HTTP_200_OK,
        )


class AnaliticaAsistenteView(APIView):
    """HU-41 y RF-57: temas y derivaciones más frecuentes a partir de la bitácora anonimizada."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not _es_administradora(request.user):
            return Response(status=status.HTTP_403_FORBIDDEN)

        total_conversaciones = Conversacion.objects.count()
        total_derivadas = Conversacion.objects.filter(derivado_a_asesora=True).count()
        tasa_derivacion = (
            round((total_derivadas / total_conversaciones) * 100, 2)
            if total_conversaciones > 0
            else 0.0
        )

        reglas_frecuentes = list(
            Conversacion.objects.exclude(regla_aplicada__isnull=True)
            .values("regla_aplicada__codigo", "regla_aplicada__resultado")
            .annotate(frecuencia=Count("id"))
            .order_by("-frecuencia")[:5]
        )

        motivos_derivacion = list(
            SolicitudAsesoria.objects.values("motivo_derivacion")
            .annotate(frecuencia=Count("id"))
            .order_by("-frecuencia")[:5]
        )

        return Response(
            {
                "total_conversaciones": total_conversaciones,
                "total_derivaciones": total_derivadas,
                "tasa_derivacion_porcentaje": tasa_derivacion,
                "reglas_mas_aplicadas": reglas_frecuentes,
                "motivos_derivacion_frecuentes": motivos_derivacion,
            },
            status=status.HTTP_200_OK,
        )


class ContactoInstitucionalView(APIView):
    """HU-18 y RF-24: datos institucionales (misión, visión) y formulario protegido contra bots."""

    permission_classes = [AllowAny]

    def get(self, request):
        return Response(
            {
                "empresa": "ACOMSE SpA",
                "rut": "77.878.856-K",
                "ubicacion": "Arica, Región de Arica y Parinacota",
                "mision": (
                    "Entregar soluciones integrales en seguridad, protección personal y "
                    "prevención de riesgos, proporcionando productos, servicios y "
                    "capacitaciones de calidad, con respaldo técnico y orientación "
                    "especializada, contribuyendo a proteger la vida y seguridad de los "
                    "trabajadores y al desarrollo de ambientes laborales más seguros."
                ),
                "vision": (
                    "Ser una empresa reconocida y referente en Chile en soluciones de "
                    "seguridad, protección personal y prevención de riesgos, comenzando "
                    "con un fuerte posicionamiento en Arica y la zona norte del país, "
                    "para luego alcanzar presencia a nivel nacional."
                ),
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        # RF-24: campo honeypot invisible ("website") para bloquear envíos automatizados de bots.
        if str(request.data.get("website", "")).strip():
            return Response(
                {"detalle": "Envío automatizado bloqueado."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        nombre = str(request.data.get("nombre", "")).strip()
        correo = str(request.data.get("correo") or request.data.get("email") or "").strip()
        mensaje = str(request.data.get("mensaje", "")).strip()

        if not nombre or "@" not in correo or not mensaje:
            return Response(
                {"detalle": "Debe indicar nombre, un correo válido y su mensaje."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        contacto = MensajeContacto.objects.create(
            nombre=nombre[:150],
            empresa=str(request.data.get("empresa", "")).strip()[:150],
            rut_empresa=str(request.data.get("rut_empresa", "")).strip()[:20],
            correo=correo[:254],
            asunto=str(request.data.get("asunto", "")).strip()[:100],
            sucursal=str(request.data.get("sucursal", "")).strip()[:100],
            mensaje=mensaje,
        )

        # El aviso por correo es complementario: si falla, la consulta igual queda guardada.
        modo_envio = "no_enviado"
        try:
            resultado = enviar_correo_transaccional(
                destinatario_email="contacto@acomse.cl",
                asunto=f"Consulta web de {contacto.nombre}",
                contenido_texto=(
                    f"Empresa: {contacto.empresa} ({contacto.rut_empresa})\n"
                    f"Correo: {contacto.correo}\nAsunto: {contacto.asunto}\n"
                    f"Sucursal: {contacto.sucursal}\nMensaje:\n{contacto.mensaje}"
                ),
            )
            modo_envio = resultado["modo"]
        except Exception:
            pass

        return Response(
            {"mensaje": "Consulta recibida correctamente.", "envio": modo_envio},
            status=status.HTTP_201_CREATED,
        )

def _serializar_mensaje(m):
    return {
        "id": m.id,
        "nombre": m.nombre,
        "empresa": m.empresa,
        "rutEmpresa": m.rut_empresa,
        "email": m.correo,
        "asunto": m.asunto,
        "sucursal": m.sucursal,
        "mensaje": m.mensaje,
        "leido": m.leido,
        "fecha": timezone.localtime(m.creado_en).strftime("%d-%m-%Y %H:%M"),
    }


class MensajesContactoAdminView(APIView):
    """RF 046: bandeja de consultas de contacto para la administradora."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not _es_administradora(request.user):
            return Response(
                {"detalle": "Solo administración puede ver las consultas."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return Response(
            [_serializar_mensaje(m) for m in MensajeContacto.objects.all()],
            status=status.HTTP_200_OK,
        )


class MensajeContactoDetalleView(APIView):
    """Marcar como atendido o eliminar una consulta."""

    permission_classes = [IsAuthenticated]

    def _obtener(self, request, mensaje_id):
        if not _es_administradora(request.user):
            return None
        return get_object_or_404(MensajeContacto, id=mensaje_id)

    def patch(self, request, mensaje_id):
        mensaje = self._obtener(request, mensaje_id)
        if mensaje is None:
            return Response({"detalle": "Sin permiso."}, status=status.HTTP_403_FORBIDDEN)
        mensaje.leido = bool(request.data.get("leido", mensaje.leido))
        mensaje.save(update_fields=["leido"])
        return Response(_serializar_mensaje(mensaje), status=status.HTTP_200_OK)

    def delete(self, request, mensaje_id):
        mensaje = self._obtener(request, mensaje_id)
        if mensaje is None:
            return Response({"detalle": "Sin permiso."}, status=status.HTTP_403_FORBIDDEN)
        mensaje.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)