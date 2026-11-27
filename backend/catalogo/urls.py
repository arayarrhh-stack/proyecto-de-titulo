"""Conecta las direcciones del catálogo con las consultas de views.py.

HU-15: /api/catalogo/productos/ devuelve la lista de productos.
HU-16: /api/catalogo/productos/{id}/ devuelve un producto; {id} se reemplaza
por su identificador, por ejemplo /api/catalogo/productos/1/.

configuracion/urls.py añade el inicio /api/catalogo/ a estas direcciones.
La interfaz usará estas direcciones para pedir la lista, el detalle y la administración.
"""
from django.urls import path
from rest_framework.routers import SimpleRouter

from .views import (
    CategoriaAdminListCreateView,
    CategoriaPublicaListView,
    ProductoAdminDetailView,
    ProductoAdminListCreateView,
    ProductoViewSet,
    ProveedorAdminListCreateView,
    ValidarFichaTecnicaView,
    ProductoAdminImagenesView,
    ProductoAdminImagenDetalleView,
)

# Agrupa los nombres de estas rutas bajo "catalogo" para distinguirlas
# de las rutas de otros módulos al ensamblar el backend.
app_name = "catalogo"

# SimpleRouter genera las rutas de lista y detalle de la vista pública.
router = SimpleRouter()
# Asocia la dirección "productos" con ProductoViewSet de views.py.
router.register("productos", ProductoViewSet, basename="producto")

# Django lee esta lista para dirigir cada consulta a la vista correspondiente.
urlpatterns = [
    path("categorias/", CategoriaPublicaListView.as_view(), name="categorias-publicas"),
    path(
        "admin/categorias/",
        CategoriaAdminListCreateView.as_view(),
        name="admin-categorias",
    ),
    path(
        "admin/proveedores/",
        ProveedorAdminListCreateView.as_view(),
        name="admin-proveedores",
    ),
    path(
        "admin/productos/",
        ProductoAdminListCreateView.as_view(),
        name="admin-productos",
    ),
    path(
        "admin/productos/<int:producto_id>/",
        ProductoAdminDetailView.as_view(),
        name="admin-producto-detalle",
    ),
    path(
        "admin/productos/<int:producto_id>/validar-ficha/",
        ValidarFichaTecnicaView.as_view(),
        name="admin-producto-validar-ficha",
    ),
        path(
        "admin/productos/<int:producto_id>/imagenes/",
        ProductoAdminImagenesView.as_view(),
        name="admin-producto-imagenes",
    ),
    path(
        "admin/productos/<int:producto_id>/imagenes/<int:imagen_id>/",
        ProductoAdminImagenDetalleView.as_view(),
        name="admin-producto-imagen-detalle",
    ),
] + router.urls