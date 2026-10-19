"""Selecciona los datos de producto que se entregan al consultar el catálogo.

Base de HU-16: entregar información pública del producto sin mostrar precios.
views.py usa este serializador para preparar la respuesta en formato JSON,
un formato de datos que la interfaz puede leer.
La lista de productos (HU-15) y su pantalla de detalle (HU-16) usarán esa respuesta.
"""

from rest_framework import serializers

from .models import Producto


class ProductoSerializer(serializers.ModelSerializer):
    """Prepara la información pública a partir de un registro de Producto."""

    class Meta:
        # Toma los datos del modelo definido en models.py.
        model = Producto

        # Solo estos cuatro campos salen en la respuesta.
        # id identifica el registro; codigo es la referencia del producto.
        # Los controles activo y estado_validacion quedan dentro del backend.
        fields = ["id", "codigo", "nombre", "descripcion"]

        # Estos campos se usan para consultar datos, no para recibir cambios.
        # La creación y edición se conectarán con la administración de productos.
        read_only_fields = fields
