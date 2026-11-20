"""Selecciona los datos de producto que se entregan al consultar y administrar el catálogo.

Base de HU-16: entregar información pública del producto sin mostrar precios.
views.py usa estos serializadores para preparar la respuesta en formato JSON.
La lista de productos (HU-15) y su pantalla de detalle (HU-16) usan ProductoSerializer,
mientras que la administración (M2) usa los serializadores administrativos reservados.
"""
from rest_framework import serializers

from .models import (
    Categoria,
    EstadoValidacionFicha,
    ImagenProducto,
    Producto,
    Proveedor,
    Variante,
)


class CategoriaPublicaSerializer(serializers.ModelSerializer):
    """Serializador público de categoría: omite estrictamente márgenes y recargos (RF-15, RNF-04)."""

    class Meta:
        model = Categoria
        fields = ["id", "nombre", "orden_visualizacion", "es_proteccion_dielectrica"]
        read_only_fields = fields


class VariantePublicaSerializer(serializers.ModelSerializer):
    """Variantes de talla y color disponibles para agregar al carrito (HU-16, RF-21)."""

    class Meta:
        model = Variante
        fields = ["id", "talla", "color"]
        read_only_fields = fields


class ImagenProductoSerializer(serializers.ModelSerializer):
    """Fotografías del producto para la vitrina y vista de detalle (HU-09, RF-11)."""

    class Meta:
        model = ImagenProducto
        fields = ["id", "url_imagen", "es_principal", "orden"]
        read_only_fields = fields


class ProductoSerializer(serializers.ModelSerializer):
    """Prepara la información pública a partir de un registro de Producto (sin precios ni costos)."""

    categoria_nombre = serializers.CharField(
        source="categoria.nombre", read_only=True, default=""
    )
    normativa = serializers.SerializerMethodField()
    variantes = VariantePublicaSerializer(many=True, read_only=True)
    imagenes = ImagenProductoSerializer(many=True, read_only=True)

    class Meta:
        # Toma los datos del modelo definido en models.py.
        model = Producto

        # Solo salen campos públicos técnicos; activo, estado_validacion y proveedor
        # quedan dentro del backend (HU-16, RF-21, RF-22, RNF-04).
        fields = [
            "id",
            "codigo",
            "nombre",
            "descripcion",
            "categoria",
            "categoria_nombre",
            "normativa",
            "clase_dielectrica",
            "tension_max_uso_v",
            "tension_ensayo_v",
            "destacado",
            "variantes",
            "imagenes",
        ]
        
        # AQUÍ AÑADIMOS LOS CAMPOS DE SOLO LECTURA PARA PROTEGER EL FLUJO DE VALIDACIÓN (RF-04 / HU-13)
        read_only_fields = [
            "estado_validacion", 
            "validada_por", 
            "version_ficha"
        ]
        # Estos campos se usan para consultar datos públicos, no para recibir cambios.
        read_only_fields = fields

    def get_normativa(self, obj):
        """RF-18: publica la normativa únicamente cuando el estado de la ficha es Validada."""
        if obj.estado_validacion == EstadoValidacionFicha.VALIDADA:
            return obj.normativa
        return ""


# --- SERIALIZADORES RESERVADOS AL ROL ADMINISTRADOR (M2) ---


class CategoriaAdminSerializer(serializers.ModelSerializer):
    """Incluye margen_defecto y recargos por defecto solo para administración (HU-11, RF-14)."""

    class Meta:
        model = Categoria
        fields = "__all__"


class ProveedorAdminSerializer(serializers.ModelSerializer):
    """Gestión administrativa de proveedores y sus condiciones (HU-11, RF-13)."""

    class Meta:
        model = Proveedor
        fields = "__all__"


class ProductoAdminSerializer(serializers.ModelSerializer):
    def create(self, validated_data):
        validated_data['activo'] = True
        validated_data['estado_validacion'] = 'validada'
        return super().create(validated_data)

    """Gestión completa de productos, proveedor habitual y estado de ficha (HU-07, HU-08, HU-13)."""

    variantes = VariantePublicaSerializer(many=True, read_only=True)
    imagenes = ImagenProductoSerializer(many=True, read_only=True)

    class Meta:
        model = Producto
        fields = "__all__"