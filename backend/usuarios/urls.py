"""Rutas del módulo de identidad, registro y perfiles (M1)."""
from django.urls import path

from .views import CsrfView, LoginView, LogoutView, PerfilUsuarioView, RegistroClienteView

urlpatterns = [
    path("csrf/", CsrfView.as_view(), name="usuario-csrf"),
    path("login/", LoginView.as_view(), name="usuario-login"),
    path("logout/", LogoutView.as_view(), name="usuario-logout"),
    path("registro/", RegistroClienteView.as_view(), name="usuario-registro"),
    path("perfil/", PerfilUsuarioView.as_view(), name="usuario-perfil"),
]