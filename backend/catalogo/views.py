"""Atiende las consultas de lista y detalle del catálogo público.

Base de HU-15 (lista de productos) y HU-16 (detalle de un producto).
urls.py dirige aquí las consultas. Esta vista busca los datos en models.py
y usa serializers.py para preparar la respuesta.
La interfaz del catálogo usará esa respuesta para mostrar sus pantallas.
"""

from rest_framework.permissions import AllowAny
from rest_framework.viewsets import ReadOnlyModelViewSet

from .models import Producto
from .serializers import ProductoSerializer


class ProductoViewSet(ReadOnlyModelViewSet):
    """Permite consultar la lista y un producto concreto, sin modificar datos."""

    # HU-12 / HU-13: muestra solo productos activos con su ficha validada.
    # Los demás se omiten de la lista. Si se consulta su detalle, responde
    # 404 ("no encontrado"). La regla se aplica a ambas formas de consulta.
    queryset = Producto.objects.filter(activo=True, estado_validacion="validada")

    # ProductoSerializer prepara los campos públicos definidos en serializers.py.
    serializer_class = ProductoSerializer

    # HU-15 / HU-16: cualquier visitante puede consultar sin iniciar sesión.
    # ReadOnlyModelViewSet permite leer; no ofrece crear, editar ni borrar.
    # Esas operaciones se conectarán con la administración de productos.
    permission_classes = [AllowAny]
