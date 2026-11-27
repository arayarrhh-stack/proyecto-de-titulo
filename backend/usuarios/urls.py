"""Rutas del módulo de identidad, registro y perfiles (M1)."""
from django.urls import path

from .views import CsrfView, LoginView, LogoutView, PerfilUsuarioView, RegistroClienteView, ReenviarVerificacionView, VerificarCorreoView, ClientesAdminListView, ClienteAdminDetalleView

urlpatterns = [
    path("csrf/", CsrfView.as_view(), name="usuario-csrf"),
    path("login/", LoginView.as_view(), name="usuario-login"),
    path("logout/", LogoutView.as_view(), name="usuario-logout"),
    path("registro/", RegistroClienteView.as_view(), name="usuario-registro"),
    path("verificar-correo/", VerificarCorreoView.as_view(), name="usuario-verificar-correo"),
    path("reenviar-verificacion/", ReenviarVerificacionView.as_view(), name="usuario-reenviar-verificacion"),
    path("perfil/", PerfilUsuarioView.as_view(), name="usuario-perfil"),
    path("clientes/", ClientesAdminListView.as_view(), name="usuario-clientes-admin"),
    path("clientes/<int:cliente_id>/", ClienteAdminDetalleView.as_view(), name="usuario-cliente-detalle"),
]