"""Serializadores diferenciados por rol para proteger costos y márgenes (RNF-04, RNF-07)."""
from rest_framework import serializers

from .models import (
    CotizacionCliente,
    CotizacionProveedor,
    Despacho,
    LineaCotizacionCliente,
    LineaCotizacionProveedor,
    LineaSolicitud,
    OrdenCompraProveedor,
    Pago,
    Pedido,
    Solicitud,
)


class LineaSolicitudSerializer(serializers.ModelSerializer):
    """Línea del carrito o solicitud sin precios (HU-19, RF-25)."""

    producto_codigo = serializers.CharField(source="producto.codigo", read_only=True)
    producto_nombre = serializers.CharField(source="producto.nombre", read_only=True)

    class Meta:
        model = LineaSolicitud
        fields = [
            "id",
            "producto",
            "producto_codigo",
            "producto_nombre",
            "talla",
            "color",
            "cantidad",
        ]


class SolicitudSerializer(serializers.ModelSerializer):
    """Solicitud de cotización con sus líneas, estado actual y datos del cliente (HU-20, HU-39)."""

    lineas = LineaSolicitudSerializer(many=True, read_only=True)
    cliente_nombre = serializers.CharField(source="cliente.first_name", read_only=True)
    cliente_correo = serializers.EmailField(source="cliente.email", read_only=True)
    empresa_nombre = serializers.SerializerMethodField()

    class Meta:
        model = Solicitud
        fields = [
            "id",
            "folio",
            "canal_origen",
            "estado",
            "observaciones",
            "direccion_despacho",
            "creado_en",
            "actualizado_en",
            "cliente_nombre",
            "cliente_correo",
            "empresa_nombre",
            "lineas",
        ]
        read_only_fields = ["folio", "estado", "creado_en", "actualizado_en"]

    def get_empresa_nombre(self, obj):
        empresa = obj.cliente.empresa
        return empresa.razon_social if empresa else ""

# --- SERIALIZADORES EXCLUSIVOS PARA CLIENTE (Ocultan costos y márgenes: RNF-04) ---


class LineaCotizacionClientePublicaSerializer(serializers.ModelSerializer):
    """Excluye costo_unitario_neto, margen_porcentaje y recargo_unitario_neto (RNF-04)."""

    producto_codigo = serializers.CharField(
        source="linea_solicitud.producto.codigo", read_only=True
    )
    producto_nombre = serializers.CharField(
        source="linea_solicitud.producto.nombre", read_only=True
    )
    talla = serializers.CharField(source="linea_solicitud.talla", read_only=True)
    color = serializers.CharField(source="linea_solicitud.color", read_only=True)
    cantidad = serializers.IntegerField(source="linea_solicitud.cantidad", read_only=True)

    class Meta:
        model = LineaCotizacionCliente
        fields = [
            "id",
            "producto_codigo",
            "producto_nombre",
            "talla",
            "color",
            "cantidad",
            "precio_unitario_venta",
            "subtotal_neto",
        ]


class CotizacionClientePublicaSerializer(serializers.ModelSerializer):
    """Vista de la oferta formal para la zona privada del cliente (HU-24, HU-39)."""

    lineas_oferta = LineaCotizacionClientePublicaSerializer(many=True, read_only=True)
    solicitud_folio = serializers.CharField(source="solicitud.folio", read_only=True)

    class Meta:
        model = CotizacionCliente
        fields = [
            "id",
            "folio",
            "solicitud_folio",
            "validez_hasta",
            "plazo_entrega_dias",
            "condiciones_comerciales",
            "neto",
            "iva",
            "total",
            "pdf_generado",
            "emitida_en",
            "lineas_oferta",
        ]


class DespachoSerializer(serializers.ModelSerializer):
    """Datos de seguimiento logístico del pedido (HU-26, RF-36)."""

    class Meta:
        model = Despacho
        fields = [
            "transportista",
            "numero_seguimiento",
            "fecha_estimada",
            "fecha_entrega",
            "nombre_receptor",
        ]


class PedidoClienteSerializer(serializers.ModelSerializer):
    """Vista del pedido para el cliente: omite costo_total_neto y margen_real_neto (RNF-04)."""

    cotizacion_folio = serializers.CharField(source="cotizacion.folio", read_only=True)
    despacho = DespachoSerializer(read_only=True)

    class Meta:
        model = Pedido
        fields = [
            "id",
            "folio",
            "cotizacion_folio",
            "oc_cliente_numero",
            "estado",
            "venta_total_neta",
            "despacho",
            "creado_en",
        ]


# --- SERIALIZADORES EXCLUSIVOS PARA ADMINISTRACIÓN (Incluyen costos y márgenes) ---


class LineaCotizacionProveedorAdminSerializer(serializers.ModelSerializer):
    """Costo unitario neto por línea registrado por la administradora (HU-23, RF-31)."""

    class Meta:
        model = LineaCotizacionProveedor
        fields = ["id", "linea_solicitud", "costo_unitario_neto"]


class CotizacionProveedorAdminSerializer(serializers.ModelSerializer):
    """Cotización completa del proveedor reservada a administración (HU-23, RNF-04)."""

    lineas_costo = LineaCotizacionProveedorAdminSerializer(many=True, read_only=True)

    class Meta:
        model = CotizacionProveedor
        fields = [
            "id",
            "solicitud",
            "proveedor_nombre",
            "proveedor_rut",
            "plazo_entrega_dias",
            "fecha_vigencia",
            "documento_respaldo",
            "creado_en",
            "lineas_costo",
        ]


class LineaCotizacionClienteAdminSerializer(serializers.ModelSerializer):
    """Incluye el desglose reservado de costo, margen y recargo para administración (HU-37)."""

    class Meta:
        model = LineaCotizacionCliente
        fields = [
            "id",
            "linea_solicitud",
            "costo_unitario_neto",
            "margen_porcentaje",
            "recargo_unitario_neto",
            "precio_unitario_venta",
            "subtotal_neto",
        ]


class CotizacionClienteAdminSerializer(serializers.ModelSerializer):
    """Vista administrativa completa de la cotización emitida al cliente."""

    lineas_oferta = LineaCotizacionClienteAdminSerializer(many=True, read_only=True)

    class Meta:
        model = CotizacionCliente
        fields = "__all__"


class OrdenCompraProveedorAdminSerializer(serializers.ModelSerializer):
    """Orden de compra al proveedor con costos congelados y sin precios de venta (HU-25, RF-35)."""

    class Meta:
        model = OrdenCompraProveedor
        fields = "__all__"


class PagoAdminSerializer(serializers.ModelSerializer):
    """Registro administrativo de pagos de cliente y a proveedor (HU-27, RF-37)."""

    class Meta:
        model = Pago
        fields = "__all__"


class PedidoAdminSerializer(serializers.ModelSerializer):
    """Incluye costo_total_neto y margen_real_neto solo para el rol Administrador (HU-27, RF-38)."""

    despacho = DespachoSerializer(read_only=True)
    direccion_despacho_cliente = serializers.CharField(
        source="cotizacion.solicitud.direccion_despacho", read_only=True
    )
    pagos = PagoAdminSerializer(many=True, read_only=True)
    ordenes_compra_proveedor = OrdenCompraProveedorAdminSerializer(many=True, read_only=True)

    class Meta:
        model = Pedido
        fields = "__all__"