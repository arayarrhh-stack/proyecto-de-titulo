"""Rutas del Módulo M8 (Analítica del negocio) e información institucional (M3)."""
from django.urls import path

from .views import (
    AnaliticaAsistenteView,
    ContactoInstitucionalView,
    TableroComercialAnaliticaView,
)

urlpatterns = [
    path("comercial/", TableroComercialAnaliticaView.as_view(), name="analitica-comercial"),
    path("asistente/", AnaliticaAsistenteView.as_view(), name="analitica-asistente"),
    path("institucional/", ContactoInstitucionalView.as_view(), name="contacto-institucional"),
]