"""Agrupa las rutas de la API por módulo."""
from django.urls import include, path

urlpatterns = [path("api/catalogo/", include("catalogo.urls"))]
