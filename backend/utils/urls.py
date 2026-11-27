"""Rutas del Módulo M8 (Analítica del negocio) e información institucional (M3)."""
from django.urls import path

from .views import (
    AnaliticaAsistenteView,
    ContactoInstitucionalView,
    TableroComercialAnaliticaView,
    MensajesContactoAdminView,
    MensajeContactoDetalleView
)

urlpatterns = [
    path("comercial/", TableroComercialAnaliticaView.as_view(), name="analitica-comercial"),
    path("asistente/", AnaliticaAsistenteView.as_view(), name="analitica-asistente"),
    path("institucional/", ContactoInstitucionalView.as_view(), name="contacto-institucional"),
    path("mensajes/", MensajesContactoAdminView.as_view(), name="mensajes-contacto"),
    path("mensajes/<int:mensaje_id>/", MensajeContactoDetalleView.as_view(), name="mensaje-contacto-detalle"),
]