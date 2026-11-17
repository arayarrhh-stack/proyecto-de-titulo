"""Orquestador del asistente controlado, bitácora anonimizada y derivaciones (M6)."""
import hashlib
import time
from django.db.models import Q

from catalogo.models import Producto
from .models import Conversacion, Regla, SolicitudAsesoria
from .motor_deterministico import AVISO_PRELIMINAR, evaluar_antecedentes
from .orientador_normativo import generar_orientacion


def anonimizar_sesion(identificador_raw):
    """Genera un hash irreversible para registrar la sesión sin datos personales (RNF-05, RNF-10)."""
    base = str(identificador_raw or "anonimo").encode("utf-8")
    return hashlib.sha256(base).hexdigest()[:32]


def buscar_productos_validados(clase_recomendada):
    """RG-14 y RF-43: selecciona únicamente productos activos con ficha en estado Validada."""
    # Extraemos limpiamente el identificador de la clase (ej: "Clase 0" -> "0", "Clase 00" -> "00")
    clase_limpia = clase_recomendada.replace("Clase", "").strip()

    queryset = Producto.objects.filter(
        activo=True,
        estado_validacion="validada",
        clase_dielectrica=clase_limpia
    )[:5]

    # RNF-04: jamás se incluyen costos ni márgenes en el contexto del asistente.
    return list(queryset.values("id", "codigo", "nombre", "descripcion"))


def procesar_consulta_normativa(consulta_usuario, antecedentes, identificador_sesion="anonimo"):
    """Ejecuta el flujo de 8 pasos del asistente controlado (apartado 7.1 del informe)."""
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
    )

    tiempo_ms = int((time.monotonic() - inicio) * 1000)
    codigo_regla = resultado_motor.get("regla_aplicada", "")
    regla_bd = Regla.objects.filter(codigo=codigo_regla).first()

    # RF-49 y RNF-10: registro en bitácora anonimizada con regla aplicada y tiempo.
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

    # RF-45 y HU-30: si corresponde derivar, se crea la solicitud de asesoría para el panel.
    solicitud_asesoria_id = None
    if resultado_motor.get("derivar"):
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