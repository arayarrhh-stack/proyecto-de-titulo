"""Pruebas de publicación controlada, edición de atributos críticos y reserva de márgenes (M2, M3)."""
from django.contrib.auth import get_user_model
from django.core.exceptions import PermissionDenied
from django.test import TestCase

from .models import Categoria, EstadoValidacionFicha, Producto
from .serializers import CategoriaPublicaSerializer, ProductoSerializer
from .services import actualizar_producto, registrar_producto, validar_ficha_tecnica

User = get_user_model()


class CatalogoReglasYSeguridadTests(TestCase):
    """Verifica el cumplimiento de RF-09 a RF-23 y RNF-04 en el catálogo."""

    def setUp(self):
        self.validadora = User.objects.create_user(
            username="prevencionista",
            email="validadora@acomse.cl",
            password="PasswordSegura123",
            rol="validadora",
        )
        self.cliente = User.objects.create_user(
            username="cliente_test",
            email="cliente@empresa.cl",
            password="PasswordSegura123",
            rol="cliente",
        )
        self.categoria = Categoria.objects.create(
            nombre="Guantes Dieléctricos",
            orden_visualizacion=1,
            es_proteccion_dielectrica=True,
            margen_defecto="15.00",
        )

    def test_edicion_atributo_critico_devuelve_a_borrador(self):
        """HU-08 y RF-10: cambiar la clase o tensión regresa la ficha a Borrador."""
        prod = registrar_producto(
            {
                "codigo": "EPP-G0-01",
                "nombre": "Guante Clase 0",
                "categoria": self.categoria,
                "normativa": "IEC 60903",
                "clase_dielectrica": "0",
                "tension_max_uso_v": 1000,
                "activo": True,
            }
        )
        validar_ficha_tecnica(
            producto=prod,
            usuario_validador=self.validadora,
            nuevo_estado=EstadoValidacionFicha.VALIDADA,
            fuente_ficha="IEC 60903:2014",
        )
        self.assertEqual(prod.estado_validacion, EstadoValidacionFicha.VALIDADA)

        actualizar_producto(prod, {"tension_max_uso_v": 7500})
        self.assertEqual(prod.estado_validacion, EstadoValidacionFicha.BORRADOR)

    def test_solo_validadora_puede_validar_ficha(self):
        """RF-04 y HU-13: un cliente no puede validar una ficha técnica."""
        prod = Producto.objects.create(codigo="EPP-02", nombre="Casco Dieléctrico")
        with self.assertRaises(PermissionDenied):
            validar_ficha_tecnica(
                producto=prod,
                usuario_validador=self.cliente,
                nuevo_estado=EstadoValidacionFicha.VALIDADA,
                fuente_ficha="Norma",
            )

    def test_no_exposicion_margen_ni_costos_en_serializadores_publicos(self):
        """RNF-04 y RF-15: la categoría y el producto públicos no exponen márgenes ni proveedores."""
        datos_cat = CategoriaPublicaSerializer(self.categoria).data
        self.assertNotIn("margen_defecto", datos_cat)
        self.assertNotIn("recargo_certificacion_defecto", datos_cat)

        prod = Producto.objects.create(
            codigo="EPP-03",
            nombre="Manta Aislante",
            activo=True,
            estado_validacion=EstadoValidacionFicha.VALIDADA,
        )
        datos_prod = ProductoSerializer(prod).data
        self.assertNotIn("proveedor_habitual", datos_prod)
        self.assertNotIn("codigo_proveedor", datos_prod)