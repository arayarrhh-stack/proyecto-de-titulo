"""Vistas API con autorización por objeto y serialización diferenciada por rol (M4, M5, M7)."""
from pathlib import Path
from django.http import HttpResponse
from datetime import date
from django.core.exceptions import ValidationError
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from django.conf import settings
from django.http import FileResponse
from utils.pdf_service import generar_pdf_cotizacion_cliente, generar_pdf_oc_proveedor, generar_pdf_solicitud
from django.utils.dateparse import parse_date
import logging

from django.contrib.auth import get_user_model

from utils.email_service import enviar_correo_transaccional

from .models import (
    CanalOrigen,
    CotizacionCliente,
    CotizacionProveedor,
    EstadoSolicitud,
    Pedido,
    Solicitud,
    EstadoPedido,
)
from .serializers import (
    CotizacionClienteAdminSerializer,
    CotizacionClientePublicaSerializer,
    CotizacionProveedorAdminSerializer,
    PedidoAdminSerializer,
    PedidoClienteSerializer,
    SolicitudSerializer,
)
from .services import (
    aceptar_cotizacion_cliente,
    cambiar_estado_solicitud,
    crear_solicitud_cotizacion,
    emitir_cotizacion_cliente,
    registrar_cotizacion_proveedor,
    generar_orden_compra_proveedor,
    registrar_despacho_y_entrega,
)


def _es_administradora(user):
    """Verifica si el usuario autenticado posee rol de administración."""
    return bool(
        user
        and user.is_authenticated
        and (user.is_staff or getattr(user, "rol", "") == "administradora")
    )

logger = logging.getLogger(__name__)


def _avisar_admin_nueva_solicitud(solicitud):
    """RF 023: avisa por correo (y notificación interna) a cada administradora de una nueva solicitud.

    Nunca interrumpe la creación de la solicitud: si algo falla, solo se registra en el log.
    """
    try:
        User = get_user_model()
        admins = User.objects.filter(rol="administradora", is_active=True).exclude(email="")
        cliente = solicitud.cliente
        empresa = getattr(cliente, "empresa", None)
        nombre_cliente = empresa.razon_social if empresa else (cliente.first_name or cliente.email)

        lineas = []
        for linea in solicitud.lineas.select_related("producto").all():
            variante = " / ".join(x for x in [linea.talla, linea.color] if x)
            detalle = f"- {linea.producto.nombre} x{linea.cantidad}"
            if variante:
                detalle += f" ({variante})"
            lineas.append(detalle)

        texto = (
            f"Se recibió una nueva solicitud de cotización.\n\n"
            f"Folio: {solicitud.folio}\n"
            f"Cliente: {nombre_cliente}\n"
            f"Contacto: {cliente.first_name} <{cliente.email}>\n\n"
            f"Productos solicitados:\n" + "\n".join(lineas)
        )
        if solicitud.observaciones:
            texto += f"\n\nObservaciones: {solicitud.observaciones}"
        texto += "\n\nRevísala en el panel de administración de ACOMSE."

        for admin in admins:
            enviar_correo_transaccional(
                destinatario_email=admin.email,
                asunto=f"Nueva solicitud {solicitud.folio}",
                contenido_texto=texto,
                usuario_destinatario=admin,
                tipo_notificacion="nueva_solicitud",
            )
    except Exception:  # el aviso nunca debe romper la creación de la solicitud
        logger.exception("No se pudo avisar a la administradora de la solicitud %s", solicitud.folio)

class SolicitudListCreateView(APIView):
    """Lista las solicitudes propias del cliente (o todas para admin) y crea nuevas (HU-20, HU-39)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """RNF-07: cada cliente visualiza únicamente sus propias solicitudes."""
        if _es_administradora(request.user):
            queryset = Solicitud.objects.select_related("cliente__empresa").prefetch_related("lineas__producto").all()
        else:
            queryset = Solicitud.objects.select_related("cliente__empresa").prefetch_related("lineas__producto").filter(
                cliente=request.user
            )
        serializer = SolicitudSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        """Envía el carrito como solicitud formal con folio único (RF-26 a RF-28)."""
        items = request.data.get("items", [])
        observaciones = request.data.get("observaciones", "")
        canal = request.data.get("canal_origen", CanalOrigen.PORTAL)

        try:
            solicitud = crear_solicitud_cotizacion(
                cliente=request.user,
                items=items,
                observaciones=observaciones,
                canal_origen=canal,
            )
        except (ValidationError, ValueError, TypeError) as exc:
            return Response({"detalle": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        
        _avisar_admin_nueva_solicitud(solicitud)
        
        serializer = SolicitudSerializer(solicitud)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class CotizacionProveedorCreateView(APIView):
    """Registra la cotización recibida del proveedor; exclusivo para administración (HU-23, RF-31)."""

    permission_classes = [IsAdminUser]
    
    def get(self, request):
        """Lista las cotizaciones de proveedor de una solicitud (?solicitud_id=); solo administración."""
        solicitud_id = request.query_params.get("solicitud_id", "").strip()
        queryset = CotizacionProveedor.objects.prefetch_related("lineas_costo")
        if solicitud_id.isdigit():
            queryset = queryset.filter(solicitud_id=int(solicitud_id))
        serializer = CotizacionProveedorAdminSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def post(self, request):
        """Asocia los costos unitarios netos del proveedor a una solicitud."""
        solicitud = get_object_or_404(Solicitud, id=request.data.get("solicitud_id"))
        try:
            fecha_vigencia = date.fromisoformat(str(request.data.get("fecha_vigencia")))
            cot_prov = registrar_cotizacion_proveedor(
                solicitud=solicitud,
                proveedor_nombre=str(request.data.get("proveedor_nombre", "")).strip(),
                proveedor_rut=str(request.data.get("proveedor_rut", "")).strip(),
                plazo_entrega_dias=int(request.data.get("plazo_entrega_dias", 7)),
                fecha_vigencia=fecha_vigencia,
                costos_por_linea=request.data.get("costos_por_linea", []),
                documento_respaldo=str(request.data.get("documento_respaldo", "")).strip(),
            )
        except (ValidationError, ValueError, KeyError, TypeError) as exc:
            return Response({"detalle": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        serializer = CotizacionProveedorAdminSerializer(cot_prov)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class CotizacionClienteListCreateView(APIView):
    """Consulta cotizaciones emitidas y permite a administración emitir nuevas (HU-37, HU-39)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """RNF-04 y RNF-07: serializa sin costos ni márgenes cuando consulta un cliente."""
        if _es_administradora(request.user):
            queryset = CotizacionCliente.objects.prefetch_related("lineas_oferta").all()
            serializer = CotizacionClienteAdminSerializer(queryset, many=True)
        else:
            queryset = CotizacionCliente.objects.prefetch_related(
                "lineas_oferta__linea_solicitud__producto"
            ).filter(solicitud__cliente=request.user)
            serializer = CotizacionClientePublicaSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        """Calcula en servidor el precio con margen y emite la cotización al cliente (RF-53)."""
        if not _es_administradora(request.user):
            return Response(
                {"detalle": "Solo administración puede emitir cotizaciones."},
                status=status.HTTP_403_FORBIDDEN,
            )

        solicitud = get_object_or_404(Solicitud, id=request.data.get("solicitud_id"))
        cot_prov = get_object_or_404(
            CotizacionProveedor,
            id=request.data.get("cotizacion_proveedor_id"),
            solicitud=solicitud,
        )

        try:
            validez_hasta = date.fromisoformat(str(request.data.get("validez_hasta")))
            cot_cliente = emitir_cotizacion_cliente(
                solicitud=solicitud,
                cotizacion_proveedor=cot_prov,
                validez_hasta=validez_hasta,
                parametros_lineas=request.data.get("parametros_lineas", []),
                plazo_entrega_dias=int(request.data.get("plazo_entrega_dias", 7)),
                condiciones_comerciales=str(
                    request.data.get("condiciones_comerciales", "Pago contra factura.")
                ),
            )
        except (ValidationError, ValueError, KeyError, TypeError) as exc:
            return Response({"detalle": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        serializer = CotizacionClienteAdminSerializer(cot_cliente)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AceptarRechazarCotizacionView(APIView):
    """Permite al cliente propietario aceptar con su OC o rechazar una cotización (HU-24, RF-33)."""

    permission_classes = [IsAuthenticated]

    def post(self, request, cotizacion_id):
        """Valida propiedad del objeto y vigencia antes de crear el pedido."""
        if _es_administradora(request.user):
            cot_cliente = get_object_or_404(CotizacionCliente, id=cotizacion_id)
        else:
            cot_cliente = get_object_or_404(
                CotizacionCliente,
                id=cotizacion_id,
                solicitud__cliente=request.user,
            )

        accion = str(request.data.get("accion", "aceptar")).strip().lower()
        try:
            if accion == "rechazar":
                cambiar_estado_solicitud(cot_cliente.solicitud, EstadoSolicitud.RECHAZADA)
                return Response(
                    {"estado_solicitud": EstadoSolicitud.RECHAZADA},
                    status=status.HTTP_200_OK,
                )

            pedido = aceptar_cotizacion_cliente(
                cotizacion_cliente=cot_cliente,
                oc_cliente_numero=request.data.get("oc_cliente_numero", ""),
                canal=request.data.get("canal_aceptacion", CanalOrigen.PORTAL),
            )
        except ValidationError as exc:
            return Response({"detalle": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        serializer = PedidoClienteSerializer(pedido)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class PedidoListView(APIView):
    """Lista pedidos ocultando costos y margen real a usuarios no administradores (RNF-04, RNF-07)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Retorna el seguimiento de pedidos según el rol del usuario."""
        if _es_administradora(request.user):
            queryset = Pedido.objects.select_related("cotizacion", "despacho").all()
            serializer = PedidoAdminSerializer(queryset, many=True)
        else:
            queryset = Pedido.objects.select_related("cotizacion", "despacho").filter(
                cotizacion__solicitud__cliente=request.user
            )
            serializer = PedidoClienteSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)



class CotizacionClientePdfView(APIView):
    """Entrega el PDF oficial de una cotización, sin costos ni márgenes (RF-53, RF-55, RNF-04)."""

    permission_classes = [IsAuthenticated]

    def get(self, request, cotizacion_id):
        if _es_administradora(request.user):
            cot_cliente = get_object_or_404(CotizacionCliente, id=cotizacion_id)
        else:
            cot_cliente = get_object_or_404(
                CotizacionCliente,
                id=cotizacion_id,
                solicitud__cliente=request.user,
            )

        ruta_relativa = generar_pdf_cotizacion_cliente(cot_cliente)
        if cot_cliente.pdf_generado != ruta_relativa:
            cot_cliente.pdf_generado = ruta_relativa
            cot_cliente.save(update_fields=["pdf_generado"])

        archivo = Path(settings.BASE_DIR) / ruta_relativa
        respuesta = FileResponse(open(archivo, "rb"), content_type="application/pdf")
        respuesta["Content-Disposition"] = f'inline; filename="{cot_cliente.folio}.pdf"'
        return respuesta


def _fecha_opcional(valor):
    """Convierte AAAA-MM-DD a fecha; vacío devuelve None."""
    texto = str(valor or "").strip()
    if not texto:
        return None
    try:
        fecha = parse_date(texto)
    except ValueError:
        fecha = None
    if fecha is None:
        raise ValidationError("Fecha inválida, use el formato AAAA-MM-DD.")
    return fecha


class PedidoOrdenCompraView(APIView):
    """La administradora emite la OC al proveedor y genera su PDF (HU-25, RF-35)."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pedido_id):
        if not _es_administradora(request.user):
            return Response(
                {"detalle": "Solo administración puede emitir órdenes de compra."},
                status=status.HTTP_403_FORBIDDEN,
            )
        pedido = get_object_or_404(Pedido, id=pedido_id)
        if pedido.estado != EstadoPedido.ACEPTADO:
            return Response(
                {"detalle": "Solo se puede emitir la OC de un pedido en estado Aceptado."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        proveedor = str(request.data.get("proveedor_nombre", "")).strip()
        direccion = str(request.data.get("direccion_despacho", "")).strip()
        if not proveedor or not direccion:
            return Response(
                {"detalle": "Indique el proveedor y la dirección de despacho."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        oc = generar_orden_compra_proveedor(pedido, proveedor, direccion)
        oc.pdf_generado = generar_pdf_oc_proveedor(oc)
        oc.save(update_fields=["pdf_generado"])
        return Response(PedidoAdminSerializer(pedido).data, status=status.HTTP_201_CREATED)


class PedidoDespachoView(APIView):
    """La administradora registra despacho y entrega del pedido (HU-26, RF-36)."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pedido_id):
        if not _es_administradora(request.user):
            return Response(
                {"detalle": "Solo administración puede registrar despachos."},
                status=status.HTTP_403_FORBIDDEN,
            )
        pedido = get_object_or_404(Pedido, id=pedido_id)
        if pedido.estado not in (EstadoPedido.COMPRADO_PROVEEDOR, EstadoPedido.DESPACHADO):
            return Response(
                {"detalle": "El pedido debe tener la OC al proveedor emitida y no estar entregado."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        transportista = str(request.data.get("transportista", "")).strip()
        seguimiento = str(request.data.get("numero_seguimiento", "")).strip()
        receptor = str(request.data.get("nombre_receptor", "")).strip()
        if not transportista or not seguimiento:
            return Response(
                {"detalle": "Indique el transportista y el número de seguimiento."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            fecha_estimada = _fecha_opcional(request.data.get("fecha_estimada"))
            fecha_entrega = _fecha_opcional(request.data.get("fecha_entrega"))
            if bool(fecha_entrega) != bool(receptor):
                raise ValidationError(
                    "Para registrar la entrega indique la fecha de entrega y quién recibió."
                )
        except ValidationError as exc:
            return Response({"detalle": exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)

        registrar_despacho_y_entrega(
            pedido,
            transportista=transportista,
            numero_seguimiento=seguimiento,
            fecha_estimada=fecha_estimada,
            fecha_entrega=fecha_entrega,
            nombre_receptor=receptor,
        )
        return Response(PedidoAdminSerializer(pedido).data, status=status.HTTP_200_OK)



class SolicitudPdfView(APIView):
    """RF 038: PDF de la solicitud del cliente para pedir cotización al proveedor."""

    permission_classes = [IsAuthenticated]

    def get(self, request, solicitud_id):
        if not _es_administradora(request.user):
            return Response(
                {"detalle": "Solo administración puede generar este documento."},
                status=status.HTTP_403_FORBIDDEN,
            )
        solicitud = get_object_or_404(Solicitud, id=solicitud_id)
        contenido = generar_pdf_solicitud(solicitud)
        respuesta = HttpResponse(contenido, content_type="application/pdf")
        respuesta["Content-Disposition"] = f'inline; filename="{solicitud.folio}.pdf"'
        return respuesta