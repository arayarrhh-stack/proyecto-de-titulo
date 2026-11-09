"""Rutas del módulo de solicitudes, cotizaciones e intermediación (M4, M5, M7)."""
from django.urls import path

from .views import (
    AceptarRechazarCotizacionView,
    CotizacionClienteListCreateView,
    CotizacionProveedorCreateView,
    PedidoListView,
    SolicitudListCreateView,
)

urlpatterns = [
    path("solicitudes/", SolicitudListCreateView.as_view(), name="solicitudes-list-create"),
    path(
        "proveedor/registrar/",
        CotizacionProveedorCreateView.as_view(),
        name="cotizacion-proveedor-create",
    ),
    path(
        "ofertas/",
        CotizacionClienteListCreateView.as_view(),
        name="cotizaciones-cliente-list-create",
    ),
    path(
        "ofertas/<int:cotizacion_id>/responder/",
        AceptarRechazarCotizacionView.as_view(),
        name="cotizacion-cliente-responder",
    ),
    path("pedidos/", PedidoListView.as_view(), name="pedidos-list"),
]