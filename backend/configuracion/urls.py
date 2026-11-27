"""Agrupa las rutas de la API REST por módulo (M1 a M7)."""
from django.conf import settings
from django.urls import include, path, re_path
from django.views.static import serve

urlpatterns = [
    path("api/catalogo/", include("catalogo.urls")),
    path("api/usuarios/", include("usuarios.urls")),
    path("api/cotizaciones/", include("cotizaciones.urls")),
    path("api/asistente/", include("asistente_ia.urls")),
    path("api/analitica/", include("utils.urls")),
    # Fotos de productos. Con Docker o en producción las servirá el servidor web (nginx).
    re_path(r"^media/(?P<path>.*)$", serve, {"document_root": settings.MEDIA_ROOT}),
]