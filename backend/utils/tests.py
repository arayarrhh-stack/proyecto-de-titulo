"""Pruebas de validación de RUT (Módulo 11), auditoría (RNF-09), PDF (RNF-04) y analítica (M8)."""
from datetime import date, timedelta
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from rest_framework.test import APIClient

from catalogo.models import Producto
from cotizaciones.models import EstadoSolicitud, Solicitud
from cotizaciones.services import emitir_cotizacion_cliente, registrar_cotizacion_proveedor
from .audit_service import registrar_auditoria
from .models import BitacoraAuditoria
from .pdf_service import generar_pdf_cotizacion_cliente
from .validators import validar_y_formatear_rut

User = get_user_model()


class UtilsYAnaliticaTests(TestCase):
    """Verifica las utilidades transversales y los indicadores del Módulo M8."""

    def setUp(self):
        self.admin = User.objects.create_user(
            username="admin_acomse",
            email="admin@acomse.cl",
            password="PasswordSegura123",
            rol="administradora",
            is_staff=True,
        )
        self.cliente = User.objects.create_user(
            username="cliente_acomse",
            email="cliente@minera.cl",
            password="PasswordSegura123",
            rol="cliente",
        )

    def test_validador_rut_chileno_modulo_11(self):
        """HU-01 y Tabla 1: valida el RUT real de ACOMSE (77.878.856-K) y rechaza inválidos."""
        rut_formateado = validar_y_formatear_rut("77.878.856-k")
        self.assertEqual(rut_formateado, "77878856-K")

        with self.assertRaises(ValidationError):
            validar_y_formatear_rut("77.878.856-0")

    def test_bitacora_auditoria_registra_accion(self):
        """RNF-09: registra usuario, acción, entidad y valores en la bitácora."""
        registrar_auditoria(
            accion="CAMBIO_MARGEN",
            entidad="Categoria",
            entidad_id="1",
            usuario=self.admin,
            valor_anterior={"margen": "13.33"},
            valor_nuevo={"margen": "15.00"},
        )
        self.assertEqual(BitacoraAuditoria.objects.count(), 1)

    def test_generacion_pdf_y_tablero_analitica_m8(self):
        """HU-37, HU-40 y RF-56: genera PDF de cotización y consulta analítica como admin."""
        prod = Producto.objects.create(
            codigo="EPP-G0-99",
            nombre="Guante Clase 0",
            activo=True,
            estado_validacion="validada",
        )
        sol = Solicitud.objects.create(
            folio="SOL-2026-PDF01",
            cliente=self.cliente,
            estado=EstadoSolicitud.RECIBIDA,
        )
        linea = sol.lineas.create(producto=prod, cantidad=3)
        cot_prov = registrar_cotizacion_proveedor(
            solicitud=sol,
            proveedor_nombre="Alta Pro",
            fecha_vigencia=date.today() + timedelta(days=5),
            costos_por_linea=[{"linea_solicitud_id": linea.id, "costo_unitario_neto": "10000.00"}],
        )
        cot_cli = emitir_cotizacion_cliente(
            solicitud=sol,
            cotizacion_proveedor=cot_prov,
            validez_hasta=date.today() + timedelta(days=5),
            parametros_lineas=[{"linea_solicitud_id": linea.id, "margen_porcentaje": "20.00"}],
        )
        ruta_pdf = generar_pdf_cotizacion_cliente(cot_cli)
        self.assertTrue(ruta_pdf.endswith(".pdf"))

        api = APIClient()
        api.force_authenticate(user=self.admin)
        resp = api.get("/api/analitica/comercial/")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("tasa_conversion_porcentaje", resp.data)