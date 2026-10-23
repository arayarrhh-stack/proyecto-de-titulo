"""Punto de entrada HTTP para consultas al asistente controlado (HU-28 a HU-31)."""
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from .services import procesar_consulta_normativa


class LimiteConsultasAsistenteThrottle(AnonRateThrottle):
    """Limita la frecuencia de consultas por IP para proteger la cuota (HU-31, RF-46, RNF-08)."""

    rate = "20/minute"


class ConsultarOrientadorView(APIView):
    """Recibe los antecedentes del trabajo y retorna orientación normativa controlada."""

    permission_classes = [AllowAny]
    throttle_classes = [LimiteConsultasAsistenteThrottle]

    def post(self, request):
        """Valida los antecedentes de entrada (RF-40, RF-41) y ejecuta el orquestador."""
        consulta = str(request.data.get("consulta", ""))[:500].strip()

        # Se acepta 'tension_maxima' (nombre en el informe) o 'voltaje_ac' por compatibilidad.
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

        identificador_sesion = (
            request.session.session_key
            or request.META.get("REMOTE_ADDR")
            or "anonimo"
        )

        resultado = procesar_consulta_normativa(
            consulta_usuario=consulta,
            antecedentes=antecedentes,
            identificador_sesion=identificador_sesion,
        )
        return Response(resultado, status=status.HTTP_200_OK)