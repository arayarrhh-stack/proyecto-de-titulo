"""Orquestador del asistente controlado, bitácora anonimizada y derivaciones (M6)."""
import hashlib
import time

from catalogo.models import Producto
from .models import Conversacion, Regla, SolicitudAsesoria
from .motor_deterministico import AVISO_PRELIMINAR, evaluar_antecedentes
from .orientador_normativo import generar_orientacion


def anonimizar_sesion(identificador_raw):
    """Genera un hash irreversible para registrar la sesión sin datos personales."""
    base = str(identificador_raw or "anonimo").encode("utf-8")
    return hashlib.sha256(base).hexdigest()[:32]


def buscar_productos_validados(clase_recomendada):
    """Selecciona únicamente productos activos del catálogo para la clase recomendada."""
    clase_limpia = clase_recomendada.replace("Clase", "").strip()

    queryset = Producto.objects.filter(
        activo=True,
        clase_dielectrica=clase_limpia,
    )[:5]

    return list(queryset.values("id", "codigo", "nombre", "descripcion"))


def procesar_consulta_normativa(
    consulta_usuario,
    antecedentes,
    identificador_sesion="anonimo",
    historial=None,
):
    """Ejecuta el flujo del asistente controlado con soporte de memoria de sesión (RF 033)."""
    inicio = time.monotonic()
    resultado_motor = evaluar_antecedentes(antecedentes)

    productos_sugeridos = []
    if resultado_motor.get("es_valido"):
        clase = resultado_motor["clase_recomendada"]
        productos_sugeridos = buscar_productos_validados(clase)

    orientacion = generar_orientacion(
        consulta_usuario=consulta_usuario,
        resultado_motor=resultado_motor,
        productos_sugeridos=productos_sugeridos,
        historial=historial,
    )

    tiempo_ms = int((time.monotonic() - inicio) * 1000)
    codigo_regla = resultado_motor.get("regla_aplicada", "")
    regla_bd = Regla.objects.filter(codigo=codigo_regla).first()

    conversacion = Conversacion.objects.create(
        sesion_anonima=anonimizar_sesion(identificador_sesion),
        antecedentes=antecedentes,
        regla=regla_bd,
        regla_codigo=codigo_regla,
        decision=resultado_motor.get("accion", "abstener"),
        productos_sugeridos=[p["codigo"] for p in productos_sugeridos],
        derivacion=bool(resultado_motor.get("derivar", False)),
        tiempo_respuesta_ms=tiempo_ms,
    )

    solicitud_asesoria_id = None
    if resultado_motor.get("derivar") and not historial:
        motivo = resultado_motor.get(
            "motivo_derivacion",
            resultado_motor.get("mensaje", "Derivación automática por regla de seguridad."),
        )
        asesoria = SolicitudAsesoria.objects.create(
            conversacion=conversacion,
            motivo=motivo,
        )
        solicitud_asesoria_id = asesoria.id

    return {
        "aviso_preliminar": AVISO_PRELIMINAR,
        "validacion_tecnica": resultado_motor,
        "orientacion": orientacion,
        "productos_sugeridos": productos_sugeridos,
        "derivada_a_asesora": bool(resultado_motor.get("derivar", False)),
        "solicitud_asesoria_id": solicitud_asesoria_id,
    }
