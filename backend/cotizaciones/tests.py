"""Pruebas unitarias de cálculo decimal, estados y confidencialidad de márgenes (RNF-04, RNF-06)."""
from datetime import date, timedelta
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase

from catalogo.models import Producto
from .models import EstadoSolicitud, Solicitud
from .serializers import CotizacionClientePublicaSerializer, PedidoClienteSerializer
from .services import (
    aceptar_cotizacion_cliente,
    calcular_precio_unitario_venta,
    cambiar_estado_solicitud,
    emitir_cotizacion_cliente,
    registrar_cotizacion_proveedor,
)

User = get_user_model()


class CotizacionesSeguridadYCalculoTests(TestCase):
    """Verifica las reglas críticas de negocio y seguridad de los módulos M4, M5 y M7."""

    def setUp(self):
        self.cliente = User.objects.create_user(
            username="cliente_empresa",
            email="contacto@empresa.cl",
            password="PasswordSegura123",
        )
        self.producto = Producto.objects.create(
            codigo="EPP-G00-01",
            nombre="Guante Dieléctrico Clase 00",
            descripcion="Guante aislante hasta 500 V AC.",
            activo=True,
            estado_validacion="validada",
        )
        self.solicitud = Solicitud.objects.create(
            folio="SOL-2026-TEST01",
            cliente=self.cliente,
            estado=EstadoSolicitud.RECIBIDA,
        )
        self.linea_sol = self.solicitud.lineas.create(
            producto=self.producto,
            talla="9",
            color="Beige",
            cantidad=2,
        )

    def test_calculo_decimal_exacto_caso_informe(self):
        """Tabla 58 y EV4: costo $1.500 con margen 13,33% calcula $1.699,95 exactos en Decimal (RNF-06)."""
        precio = calcular_precio_unitario_venta(
            costo_unitario=Decimal("1500.00"),
            margen_porcentaje=Decimal("13.33"),
            recargo_unitario=Decimal("0.00"),
        )
        self.assertEqual(precio, Decimal("1699.95"))

    def test_rechazo_transicion_estado_invalida(self):
        """RNF-06 y RF-52: impide pasar directamente de Recibida a Aceptada."""
        with self.assertRaises(ValidationError):
            cambiar_estado_solicitud(self.solicitud, EstadoSolicitud.ACEPTADA)

    def test_impedir_emitir_con_cotizacion_proveedor_vencida(self):
        """RF-32: bloquea la emisión al cliente si la oferta del proveedor expiró."""
        ayer = date.today() - timedelta(days=1)
        cot_prov = registrar_cotizacion_proveedor(
            solicitud=self.solicitud,
            proveedor_nombre="Alta Pro",
            fecha_vigencia=ayer,
            costos_por_linea=[
                {"linea_solicitud_id": self.linea_sol.id, "costo_unitario_neto": "1500.00"}
            ],
        )
        with self.assertRaises(ValidationError):
            emitir_cotizacion_cliente(
                solicitud=self.solicitud,
                cotizacion_proveedor=cot_prov,
                validez_hasta=date.today() + timedelta(days=7),
                parametros_lineas=[
                    {"linea_solicitud_id": self.linea_sol.id, "margen_porcentaje": "13.33"}
                ],
            )

    def test_no_exposicion_de_costos_ni_margenes_a_cliente(self):
        """RNF-04 y Tabla 43: el JSON público jamás incluye costos ni márgenes."""
        manana = date.today() + timedelta(days=5)
        cot_prov = registrar_cotizacion_proveedor(
            solicitud=self.solicitud,
            proveedor_nombre="Alta Pro",
            fecha_vigencia=manana,
            costos_por_linea=[
                {"linea_solicitud_id": self.linea_sol.id, "costo_unitario_neto": "10000.00"}
            ],
        )
        cot_cliente = emitir_cotizacion_cliente(
            solicitud=self.solicitud,
            cotizacion_proveedor=cot_prov,
            validez_hasta=manana,
            parametros_lineas=[
                {
                    "linea_solicitud_id": self.linea_sol.id,
                    "margen_porcentaje": "20.00",
                    "recargo_unitario_neto": "500.00",
                }
            ],
        )

        datos_cotizacion = CotizacionClientePublicaSerializer(cot_cliente).data
        linea_json = datos_cotizacion["lineas_oferta"][0]
        self.assertNotIn("costo_unitario_neto", linea_json)
        self.assertNotIn("margen_porcentaje", linea_json)
        self.assertNotIn("recargo_unitario_neto", linea_json)
        self.assertEqual(Decimal(linea_json["precio_unitario_venta"]), Decimal("12500.00"))

        pedido = aceptar_cotizacion_cliente(cot_cliente, oc_cliente_numero="OC-9988")
        datos_pedido = PedidoClienteSerializer(pedido).data
        self.assertNotIn("costo_total_neto", datos_pedido)
        self.assertNotIn("margen_real_neto", datos_pedido)