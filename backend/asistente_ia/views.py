"""Punto de entrada HTTP para consultas al asistente controlado (RF 024 - RF 034)."""
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from .services import procesar_consulta_normativa


class LimiteConsultasAsistenteThrottle(AnonRateThrottle):
    """Limita la frecuencia de consultas por IP para proteger la cuota."""

    rate = "20/minute"


class ConsultarOrientadorView(APIView):
    """Recibe antecedentes y opcionalmente el historial de sesión (RF 033)."""

    permission_classes = [AllowAny]
    throttle_classes = [LimiteConsultasAsistenteThrottle]

    def post(self, request):
        consulta = str(request.data.get("consulta", ""))[:500].strip()

        voltaje_raw = request.data.get("tension_maxima", request.data.get("voltaje_ac"))
        tension_maxima = None
        if voltaje_raw is not None and str(voltaje_raw).strip() != "":
            try:
                tension_maxima = int(voltaje_raw)
            except (ValueError, TypeError):
                return Response(
                    {"detalle": "La tensión máxima debe ser un número entero en voltios."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        antecedentes = {
            "tarea": str(request.data.get("tarea", "")).strip(),
            "entorno": str(request.data.get("entorno", "")).strip(),
            "tension_maxima": tension_maxima,
            "tipo_corriente": str(request.data.get("tipo_corriente", "ca")).strip().lower(),
            "riesgo_arco": bool(request.data.get("riesgo_arco", False)),
            "fuera_de_dominio": bool(request.data.get("fuera_de_dominio", False)),
        }

        historial_raw = request.data.get("historial", [])
        historial = []
        if isinstance(historial_raw, list):
            for item in historial_raw[-10:]:
                if isinstance(item, dict):
                    rol = "usuario" if item.get("rol") == "usuario" else "asistente"
                    texto = str(item.get("texto", "")).strip()[:500]
                    if texto:
                        historial.append({"rol": rol, "texto": texto})

        identificador_sesion = (
            request.session.session_key
            or request.META.get("REMOTE_ADDR")
            or "anonimo"
        )

        resultado = procesar_consulta_normativa(
            consulta_usuario=consulta,
            antecedentes=antecedentes,
            identificador_sesion=identificador_sesion,
            historial=historial,
        )
        return Response(resultado, status=status.HTTP_200_OK)
