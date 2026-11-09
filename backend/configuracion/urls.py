"""Agrupa las rutas de la API REST por módulo (M1 a M7)."""
from django.urls import include, path

urlpatterns = [
    path("api/catalogo/", include("catalogo.urls")),
    path("api/usuarios/", include("usuarios.urls")),
    path("api/cotizaciones/", include("cotizaciones.urls")),
    path("api/asistente/", include("asistente_ia.urls")),
]