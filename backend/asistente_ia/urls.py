"""Rutas públicas del módulo de orientación normativa con IA (M6)."""
from django.urls import path

from .views import ConsultarOrientadorView

urlpatterns = [
    path("consultar/", ConsultarOrientadorView.as_view(), name="consultar-orientador"),
]