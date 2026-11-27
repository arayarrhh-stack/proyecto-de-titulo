"""Lógica de negocio de intermediación, máquina de estados y cálculo decimal (M4, M5, M7)."""
import uuid
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Sum

from catalogo.models import Producto
from .models import (
    CanalOrigen,
    CotizacionCliente,
    CotizacionProveedor,
    Despacho,
    EstadoPedido,
    EstadoSolicitud,
    LineaCotizacionCliente,
    LineaCotizacionProveedor,
    LineaSolicitud,
    OrdenCompraProveedor,
    Pago,
    Pedido,
    Solicitud,
)

TASA_IVA = Decimal("0.19")
CIEN = Decimal("100")
DOS_DECIMALES = Decimal("0.01")

# Figura 5 y RF-52: transiciones válidas permitidas para la máquina de estados de Solicitud.
TRANSICIONES_SOLICITUD = {
    EstadoSolicitud.RECIBIDA: {
        EstadoSolicitud.EN_COTIZACION,
        EstadoSolicitud.RECHAZADA,
    },
    EstadoSolicitud.EN_COTIZACION: {
        EstadoSolicitud.COTIZACION_ENVIADA,
        EstadoSolicitud.RECHAZADA,
    },
    EstadoSolicitud.COTIZACION_ENVIADA: {
        EstadoSolicitud.ACEPTADA,
        EstadoSolicitud.RECHAZADA,
        EstadoSolicitud.VENCIDA,
    },
    EstadoSolicitud.ACEPTADA: set(),
    EstadoSolicitud.RECHAZADA: set(),
    EstadoSolicitud.VENCIDA: set(),
}


def redondear_moneda(valor):
    """Redondea montos con aritmética decimal exacta comercial (RNF-06)."""
    return Decimal(valor).quantize(DOS_DECIMALES, rounding=ROUND_HALF_UP)


def generar_folio(prefijo):
    """Genera un folio único no secuencial para documentos comerciales (RF-28, RNF-07)."""
    anio = date.today().year
    codigo = uuid.uuid4().hex[:6].upper()
    return f"{prefijo}-{anio}-{codigo}"


def cambiar_estado_solicitud(solicitud, nuevo_estado):
    """Valida y ejecuta la transición de estado de una solicitud (HU-36, RF-52, RNF-06)."""
    permitidos = TRANSICIONES_SOLICITUD.get(solicitud.estado, set())
    if nuevo_estado not in permitidos:
        raise ValidationError(
            f"Transición inválida: no se puede pasar de '{solicitud.estado}' a '{nuevo_estado}'."
        )
    solicitud.estado = nuevo_estado
    solicitud.save(update_fields=["estado", "actualizado_en"])
    return solicitud


def calcular_precio_unitario_venta(costo_unitario, margen_porcentaje, recargo_unitario=Decimal("0.00")):
    """Calcula en servidor: costo + margen (%) + recargo unitario (HU-37, RF-53, RNF-06)."""
    costo = Decimal(str(costo_unitario))
    margen = Decimal(str(margen_porcentaje))
    recargo = Decimal(str(recargo_unitario))

    if costo < Decimal("0") or margen < Decimal("0") or recargo < Decimal("0"):
        raise ValidationError("El costo, el margen y los recargos no pueden ser negativos.")

    factor_margen = Decimal("1") + (margen / CIEN)
    precio_con_margen = costo * factor_margen
    return redondear_moneda(precio_con_margen + recargo)


@transaction.atomic
def crear_solicitud_cotizacion(cliente, items, observaciones="", canal_origen=CanalOrigen.PORTAL, direccion_despacho=""):
    """Crea una solicitud con folio único y estado inicial Recibida (HU-20, HU-22, RF-28)."""
    if not items:
        raise ValidationError("La solicitud debe contener al menos un producto.")

    solicitud = Solicitud.objects.create(
        folio=generar_folio("SOL"),
        cliente=cliente,
        canal_origen=canal_origen,
        estado=EstadoSolicitud.RECIBIDA,
        observaciones=str(observaciones)[:1000].strip(),
        direccion_despacho=str(direccion_despacho)[:255].strip(),
    )

    for item in items:
        producto = Producto.objects.filter(id=item.get("producto_id"), activo=True).first()
        if not producto:
            raise ValidationError("Uno de los productos seleccionados no está activo o no existe.")

        cantidad = int(item.get("cantidad", 1))
        if cantidad <= 0:
            raise ValidationError("La cantidad por línea debe ser mayor a cero.")

        LineaSolicitud.objects.create(
            solicitud=solicitud,
            producto=producto,
            talla=str(item.get("talla", "")).strip(),
            color=str(item.get("color", "")).strip(),
            cantidad=cantidad,
        )

    return solicitud


@transaction.atomic
def registrar_cotizacion_proveedor(
    solicitud,
    proveedor_nombre,
    fecha_vigencia,
    costos_por_linea,
    proveedor_rut="",
    plazo_entrega_dias=7,
    documento_respaldo="",
):
    """Registra los costos del proveedor y avanza la solicitud (HU-23, RF-31)."""
    cot_prov = CotizacionProveedor.objects.create(
        solicitud=solicitud,
        proveedor_nombre=proveedor_nombre,
        proveedor_rut=proveedor_rut,
        plazo_entrega_dias=plazo_entrega_dias,
        fecha_vigencia=fecha_vigencia,
        documento_respaldo=documento_respaldo,
    )

    for item in costos_por_linea:
        linea_sol = LineaSolicitud.objects.get(
            id=item["linea_solicitud_id"], solicitud=solicitud
        )
        LineaCotizacionProveedor.objects.create(
            cotizacion_proveedor=cot_prov,
            linea_solicitud=linea_sol,
            costo_unitario_neto=redondear_moneda(item["costo_unitario_neto"]),
        )

    if solicitud.estado == EstadoSolicitud.RECIBIDA:
        cambiar_estado_solicitud(solicitud, EstadoSolicitud.EN_COTIZACION)

    return cot_prov


@transaction.atomic
def emitir_cotizacion_cliente(
    solicitud,
    cotizacion_proveedor,
    validez_hasta,
    parametros_lineas,
    plazo_entrega_dias=7,
    condiciones_comerciales="Pago contra factura.",
):
    """Genera la cotización al cliente congelando montos y validando vigencia (HU-37, RF-32, RF-53)."""
    # RF-32: impedir emisión basada en una cotización de proveedor vencida.
    if cotizacion_proveedor.fecha_vigencia < date.today():
        raise ValidationError(
            "No es posible emitir la oferta: la cotización del proveedor se encuentra vencida (RF-32)."
        )

    cot_cliente = CotizacionCliente.objects.create(
        folio=generar_folio("COT"),
        solicitud=solicitud,
        validez_hasta=validez_hasta,
        plazo_entrega_dias=plazo_entrega_dias,
        condiciones_comerciales=condiciones_comerciales,
    )

    acumulado_neto = Decimal("0.00")

    for param in parametros_lineas:
        linea_sol = LineaSolicitud.objects.get(
            id=param["linea_solicitud_id"], solicitud=solicitud
        )
        costo_prov = LineaCotizacionProveedor.objects.get(
            cotizacion_proveedor=cotizacion_proveedor,
            linea_solicitud=linea_sol,
        )

        margen_pct = Decimal(str(param.get("margen_porcentaje", "13.33")))
        recargo_unit = Decimal(str(param.get("recargo_unitario_neto", "0.00")))

        precio_venta = calcular_precio_unitario_venta(
            costo_unitario=costo_prov.costo_unitario_neto,
            margen_porcentaje=margen_pct,
            recargo_unitario=recargo_unit,
        )
        subtotal = redondear_moneda(precio_venta * Decimal(linea_sol.cantidad))
        acumulado_neto += subtotal

        LineaCotizacionCliente.objects.create(
            cotizacion=cot_cliente,
            linea_solicitud=linea_sol,
            costo_unitario_neto=costo_prov.costo_unitario_neto,
            margen_porcentaje=margen_pct,
            recargo_unitario_neto=recargo_unit,
            precio_unitario_venta=precio_venta,
            subtotal_neto=subtotal,
        )

    # RNF-06 y RF-53: cálculo en servidor de neto, IVA (19%) y total congelados.
    cot_cliente.neto = redondear_moneda(acumulado_neto)
    cot_cliente.iva = redondear_moneda(cot_cliente.neto * TASA_IVA)
    cot_cliente.total = redondear_moneda(cot_cliente.neto + cot_cliente.iva)
    cot_cliente.save(update_fields=["neto", "iva", "total"])

    if solicitud.estado == EstadoSolicitud.EN_COTIZACION:
        cambiar_estado_solicitud(solicitud, EstadoSolicitud.COTIZACION_ENVIADA)

    return cot_cliente


@transaction.atomic
def aceptar_cotizacion_cliente(cotizacion_cliente, oc_cliente_numero, canal=CanalOrigen.PORTAL):
    """Acepta una cotización vigente, congela el margen esperado y crea el pedido (HU-24, RF-33)."""
    solicitud = cotizacion_cliente.solicitud

    if solicitud.estado != EstadoSolicitud.COTIZACION_ENVIADA:
        raise ValidationError("Solo se puede aceptar una cotización en estado 'Cotización enviada'.")

    if cotizacion_cliente.validez_hasta < date.today():
        cambiar_estado_solicitud(solicitud, EstadoSolicitud.VENCIDA)
        raise ValidationError("La cotización ha expirado y pasó a estado Vencida.")

    if not str(oc_cliente_numero).strip():
        raise ValidationError("Debe indicar el número de Orden de Compra del cliente (RF-33).")

    cambiar_estado_solicitud(solicitud, EstadoSolicitud.ACEPTADA)

    costo_total = Decimal("0.00")
    for linea in cotizacion_cliente.lineas_oferta.select_related("linea_solicitud"):
        cantidad = Decimal(linea.linea_solicitud.cantidad)
        costo_total += redondear_moneda(linea.costo_unitario_neto * cantidad)

    venta_neta = cotizacion_cliente.neto
    margen_real = redondear_moneda(venta_neta - costo_total)

    pedido = Pedido.objects.create(
        folio=generar_folio("PED"),
        cotizacion=cotizacion_cliente,
        oc_cliente_numero=str(oc_cliente_numero).strip(),
        canal_aceptacion=canal,
        estado=EstadoPedido.ACEPTADO,
        costo_total_neto=costo_total,
        venta_total_neta=venta_neta,
        margen_real_neto=margen_real,
    )
    return pedido


@transaction.atomic
def generar_orden_compra_proveedor(pedido, proveedor_nombre, direccion_despacho):
    """Emite la OC al proveedor con costos congelados y sin precios de venta (HU-25, RF-35)."""
    oc_prov = OrdenCompraProveedor.objects.create(
        folio=generar_folio("OCP"),
        pedido=pedido,
        proveedor_nombre=proveedor_nombre,
        direccion_despacho=direccion_despacho,
        total_costo_neto=pedido.costo_total_neto,
    )
    pedido.estado = EstadoPedido.COMPRADO_PROVEEDOR
    pedido.save(update_fields=["estado"])
    return oc_prov


@transaction.atomic
def registrar_despacho_y_entrega(
    pedido,
    transportista,
    numero_seguimiento,
    fecha_estimada=None,
    fecha_entrega=None,
    nombre_receptor="",
):
    """Registra el despacho o la recepción conforme del pedido (HU-26, RF-36)."""
    despacho, _ = Despacho.objects.update_or_create(
        pedido=pedido,
        defaults={
            "transportista": transportista,
            "numero_seguimiento": numero_seguimiento,
            "fecha_estimada": fecha_estimada,
            "fecha_entrega": fecha_entrega,
            "nombre_receptor": nombre_receptor,
        },
    )
    if fecha_entrega and nombre_receptor:
        pedido.estado = EstadoPedido.ENTREGADO
    else:
        pedido.estado = EstadoPedido.DESPACHADO
    pedido.save(update_fields=["estado"])
    return despacho


@transaction.atomic
def registrar_pago_pedido(pedido, tipo, fecha_pago, monto, medio="transferencia", referencia=""):
    """Registra pagos y cierra el pedido cuando está entregado y pagado (HU-27, RF-37, RF-38)."""
    pago = Pago.objects.create(
        pedido=pedido,
        tipo=tipo,
        fecha_pago=fecha_pago,
        monto=redondear_moneda(monto),
        medio=medio,
        referencia=referencia,
    )

    total_pagado_cliente = (
        pedido.pagos.filter(tipo="cliente").aggregate(total=Sum("monto"))["total"]
        or Decimal("0.00")
    )

    # Si los pagos del cliente cubren el total con IVA de la cotización:
    if total_pagado_cliente >= pedido.cotizacion.total:
        if pedido.estado == EstadoPedido.ENTREGADO:
            pedido.estado = EstadoPedido.CERRADO
        else:
            pedido.estado = EstadoPedido.PAGADO
        pedido.save(update_fields=["estado"])

    return pago