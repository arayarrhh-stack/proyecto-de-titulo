"""Modelos del ciclo de intermediación: solicitudes, cotizaciones y pedidos (Anexo I, Fig. 7)."""
from decimal import Decimal
from django.conf import settings
from django.db import models


class CanalOrigen(models.TextChoices):
    """Canales de ingreso de solicitudes y aceptaciones (HU-20, HU-22, HU-24)."""

    PORTAL = "portal", "Portal web"
    WHATSAPP = "whatsapp", "WhatsApp"
    CORREO = "correo", "Correo electrónico"
    TELEFONO = "telefono", "Teléfono"
    PRESENCIAL = "presencial", "Visita presencial"


class EstadoSolicitud(models.TextChoices):
    """Máquina de estados de la solicitud y cotización (Figura 5, RF-52)."""

    RECIBIDA = "recibida", "Recibida"
    EN_COTIZACION = "en_cotizacion_proveedor", "En cotización con proveedor"
    COTIZACION_ENVIADA = "cotizacion_enviada", "Cotización enviada"
    ACEPTADA = "aceptada", "Aceptada"
    RECHAZADA = "rechazada", "Rechazada"
    VENCIDA = "vencida", "Vencida"


class EstadoPedido(models.TextChoices):
    """Máquina de estados del pedido en firme (Figura 5, M5)."""

    ACEPTADO = "aceptado", "Aceptado"
    COMPRADO_PROVEEDOR = "comprado_proveedor", "Comprado al proveedor"
    DESPACHADO = "despachado", "Despachado"
    ENTREGADO = "entregado", "Entregado"
    PAGADO = "pagado", "Pagado"
    CERRADO = "cerrado", "Cerrado"


class Solicitud(models.Model):
    """Solicitud formal de cotización con folio único (HU-20, HU-22, RF-28, RF-30)."""

    folio = models.CharField(max_length=30, unique=True, db_index=True)
    cliente = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="solicitudes",
    )
    canal_origen = models.CharField(
        max_length=20,
        choices=CanalOrigen.choices,
        default=CanalOrigen.PORTAL,
    )
    estado = models.CharField(
        max_length=30,
        choices=EstadoSolicitud.choices,
        default=EstadoSolicitud.RECIBIDA,
    )
    observaciones = models.TextField(max_length=1000, blank=True, default="")
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-creado_en"]

    def __str__(self):
        return f"{self.folio} ({self.estado})"


class LineaSolicitud(models.Model):
    """Detalle de productos y variantes solicitados sin exhibir precios (HU-19, RF-25)."""

    solicitud = models.ForeignKey(
        Solicitud,
        on_delete=models.CASCADE,
        related_name="lineas",
    )
    producto = models.ForeignKey(
        "catalogo.Producto",
        on_delete=models.PROTECT,
        related_name="lineas_solicitud",
    )
    talla = models.CharField(max_length=30, blank=True, default="")
    color = models.CharField(max_length=30, blank=True, default="")
    cantidad = models.PositiveIntegerField(default=1)

    def __str__(self):
        return f"{self.solicitud.folio} - {self.producto.codigo} x {self.cantidad}"


class CotizacionProveedor(models.Model):
    """Oferta recibida del proveedor con costos reservados (HU-23, RF-31, RNF-04)."""

    solicitud = models.ForeignKey(
        Solicitud,
        on_delete=models.CASCADE,
        related_name="cotizaciones_proveedor",
    )
    proveedor_nombre = models.CharField(max_length=150)
    proveedor_rut = models.CharField(max_length=15, blank=True, default="")
    plazo_entrega_dias = models.PositiveIntegerField(default=7)
    fecha_vigencia = models.DateField()
    documento_respaldo = models.CharField(max_length=255, blank=True, default="")
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-creado_en"]

    def __str__(self):
        return f"Prov: {self.proveedor_nombre} ({self.solicitud.folio})"


class LineaCotizacionProveedor(models.Model):
    """Costo unitario neto informado por el proveedor para cada línea (HU-23, RF-31)."""

    cotizacion_proveedor = models.ForeignKey(
        CotizacionProveedor,
        on_delete=models.CASCADE,
        related_name="lineas_costo",
    )
    linea_solicitud = models.ForeignKey(
        LineaSolicitud,
        on_delete=models.CASCADE,
        related_name="costos_proveedor",
    )
    costo_unitario_neto = models.DecimalField(max_digits=12, decimal_places=2)


class CotizacionCliente(models.Model):
    """Oferta formal emitida al cliente con montos congelados (HU-37, RF-53, RNF-06)."""

    folio = models.CharField(max_length=30, unique=True, db_index=True)
    solicitud = models.ForeignKey(
        Solicitud,
        on_delete=models.PROTECT,
        related_name="cotizaciones_cliente",
    )
    validez_hasta = models.DateField()
    plazo_entrega_dias = models.PositiveIntegerField(default=7)
    condiciones_comerciales = models.TextField(blank=True, default="Pago contra factura.")
    neto = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    iva = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    total = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    pdf_generado = models.CharField(max_length=255, blank=True, default="")
    emitida_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-emitida_en"]

    def __str__(self):
        return f"Cotización {self.folio}"


class LineaCotizacionCliente(models.Model):
    """Línea de recotización con costo y margen reservados en servidor (HU-37, RNF-04, RNF-06)."""

    cotizacion = models.ForeignKey(
        CotizacionCliente,
        on_delete=models.CASCADE,
        related_name="lineas_oferta",
    )
    linea_solicitud = models.ForeignKey(
        LineaSolicitud,
        on_delete=models.PROTECT,
        related_name="ofertas_cliente",
    )
    # Campos reservados exclusivamente al rol Administrador (jamás se serializan al cliente).
    costo_unitario_neto = models.DecimalField(max_digits=12, decimal_places=2)
    margen_porcentaje = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("13.33"))
    recargo_unitario_neto = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    # Campos visibles en la oferta y PDF del cliente.
    precio_unitario_venta = models.DecimalField(max_digits=12, decimal_places=2)
    subtotal_neto = models.DecimalField(max_digits=14, decimal_places=2)


class Pedido(models.Model):
    """Operación aceptada que vincula orden de compra, despacho y pagos (HU-24 a HU-27)."""

    folio = models.CharField(max_length=30, unique=True, db_index=True)
    cotizacion = models.OneToOneField(
        CotizacionCliente,
        on_delete=models.PROTECT,
        related_name="pedido",
    )
    oc_cliente_numero = models.CharField(max_length=60)
    canal_aceptacion = models.CharField(
        max_length=20,
        choices=CanalOrigen.choices,
        default=CanalOrigen.PORTAL,
    )
    estado = models.CharField(
        max_length=30,
        choices=EstadoPedido.choices,
        default=EstadoPedido.ACEPTADO,
    )
    # Costo total congelado para calcular el margen real (HU-27, RF-38).
    costo_total_neto = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    venta_total_neta = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    margen_real_neto = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-creado_en"]

    def __str__(self):
        return f"Pedido {self.folio} ({self.estado})"


class OrdenCompraProveedor(models.Model):
    """Orden de compra emitida al proveedor sin precios de venta (HU-25, RF-35, RNF-04)."""

    folio = models.CharField(max_length=30, unique=True)
    pedido = models.ForeignKey(
        Pedido,
        on_delete=models.CASCADE,
        related_name="ordenes_compra_proveedor",
    )
    proveedor_nombre = models.CharField(max_length=150)
    direccion_despacho = models.CharField(max_length=255)
    total_costo_neto = models.DecimalField(max_digits=14, decimal_places=2)
    pdf_generado = models.CharField(max_length=255, blank=True, default="")
    emitida_en = models.DateTimeField(auto_now_add=True)


class Despacho(models.Model):
    """Seguimiento logístico del pedido hacia el cliente (HU-26, RF-36)."""

    pedido = models.OneToOneField(
        Pedido,
        on_delete=models.CASCADE,
        related_name="despacho",
    )
    transportista = models.CharField(max_length=100)
    numero_seguimiento = models.CharField(max_length=100)
    fecha_estimada = models.DateField(null=True, blank=True)
    fecha_entrega = models.DateField(null=True, blank=True)
    nombre_receptor = models.CharField(max_length=150, blank=True, default="")


class Pago(models.Model):
    """Registro de pagos de cliente y a proveedor por transferencia o depósito (HU-27, RF-37)."""

    TIPO_PAGO = [
        ("cliente", "Cobro a cliente"),
        ("proveedor", "Pago a proveedor"),
    ]

    pedido = models.ForeignKey(
        Pedido,
        on_delete=models.CASCADE,
        related_name="pagos",
    )
    tipo = models.CharField(max_length=15, choices=TIPO_PAGO)
    fecha_pago = models.DateField()
    monto = models.DecimalField(max_digits=14, decimal_places=2)
    medio = models.CharField(max_length=50, default="transferencia")
    referencia = models.CharField(max_length=100)