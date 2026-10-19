"""Conecta las direcciones del catálogo con las consultas de views.py.

HU-15: /api/catalogo/productos/ devuelve la lista de productos.
HU-16: /api/catalogo/productos/{id}/ devuelve un producto; {id} se reemplaza
por su identificador, por ejemplo /api/catalogo/productos/1/.

configuracion/urls.py añade el inicio /api/catalogo/ a estas direcciones.
La interfaz usará estas direcciones para pedir la lista y el detalle.
"""

from rest_framework.routers import SimpleRouter

from .views import ProductoViewSet

# Agrupa los nombres de estas rutas bajo "catalogo" para distinguirlas
# de las rutas de otros módulos al ensamblar el backend.
app_name = "catalogo"

# SimpleRouter genera las rutas de lista y detalle de la vista.
router = SimpleRouter()
# Asocia la dirección "productos" con ProductoViewSet de views.py.
router.register("productos", ProductoViewSet, basename="producto")
# Django lee esta lista para dirigir cada consulta a la vista correspondiente.
urlpatterns = router.urls
