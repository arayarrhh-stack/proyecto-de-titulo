"""Atiende las consultas de lista y detalle del catálogo público.

Base de HU-15 (lista de productos) y HU-16 (detalle de un producto).
HU-17 añade la búsqueda por nombre o código mediante ?busqueda=texto.
urls.py dirige aquí las consultas. Esta vista busca los datos en models.py
y usa serializers.py para preparar la respuesta.
Catalogo.jsx enviará el texto del buscador a esta API y mostrará sus resultados.
El filtro por categoría (HU-10 / HU-17) se conectará a la misma consulta.
"""

# HU-17: Q permite unir las condiciones de búsqueda por nombre y por código.
from django.db.models import Q
# HU-15 / HU-16: AllowAny permite que un visitante consulte sin iniciar sesión.
from rest_framework.permissions import AllowAny
# HU-15 / HU-16: esta clase proporciona las consultas de lista y detalle.
from rest_framework.viewsets import ReadOnlyModelViewSet

# HU-07 / HU-17: importa el modelo que guarda el nombre y el código del producto.
from .models import Producto
# HU-15 / HU-16: importa la conversión de productos a los campos públicos del JSON.
from .serializers import ProductoSerializer


# HU-15 / HU-16 / HU-17: reúne la lista, el detalle y la búsqueda del catálogo.
class ProductoViewSet(ReadOnlyModelViewSet):
    """Permite consultar la lista y un producto concreto, sin modificar datos."""

    # HU-12 / HU-13: muestra solo productos activos con su ficha validada.
    # Los demás se omiten de la lista. Si se consulta su detalle, responde
    # 404 ("no encontrado"). La regla se aplica a ambas formas de consulta.
    queryset = Producto.objects.filter(activo=True, estado_validacion="validada")

    # HU-15 / HU-16: prepara los campos públicos mediante ProductoSerializer.
    serializer_class = ProductoSerializer

    # HU-15 / HU-16: cualquier visitante puede consultar sin iniciar sesión.
    # ReadOnlyModelViewSet permite leer; no ofrece crear, editar ni borrar.
    # Esas operaciones se conectarán con la administración de productos.
    permission_classes = [AllowAny]

    # HU-17: prepara los productos que responderán a cada consulta del catálogo.
    def get_queryset(self):
        # HU-12 / HU-13 / HU-17: parte del filtro de productos activos y validados.
        productos = super().get_queryset()
        # HU-16 / HU-17: aplica la búsqueda solo a la lista, no al detalle por id.
        if self.action != "list":
            # HU-16: el detalle conserva las reglas de publicación del catálogo.
            return productos
        # HU-17: lee ?busqueda=texto; si no existe usa vacío y quita espacios externos.
        busqueda = self.request.query_params.get("busqueda", "").strip()
        # HU-17: solo filtra cuando el visitante ha escrito algún texto.
        if busqueda:
            # HU-17: busca una coincidencia parcial en nombre O código; | significa «o».
            # icontains ignora mayúsculas ASCII; en SQLite no elimina tildes.
            coincidencias = Q(nombre__icontains=busqueda) | Q(codigo__icontains=busqueda)
            # HU-17: añade la búsqueda sin quitar el filtro de productos publicados.
            productos = productos.filter(coincidencias)
        # HU-15 / HU-17: entrega la consulta para paginarla en grupos de 24 productos.
        return productos
