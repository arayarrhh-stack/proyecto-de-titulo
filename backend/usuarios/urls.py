"""Rutas del módulo de identidad, registro y perfiles (M1)."""
from django.urls import path

from .views import PerfilUsuarioView, RegistroClienteView

urlpatterns = [
    path("registro/", RegistroClienteView.as_view(), name="usuario-registro"),
    path("perfil/", PerfilUsuarioView.as_view(), name="usuario-perfil"),
]