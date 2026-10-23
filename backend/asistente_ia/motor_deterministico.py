"""Motor de reglas determinísticas para orientación en EPP eléctrico (Anexo G)."""

# Tabla 7 y Tabla 55 (RG-02 a RG-07): tramos en corriente alterna según IEC 60903 / ASTM D120-22.
TRAMOS_DIELECTRICOS_CA = [
    {"regla": "RG-02", "clase": "Clase 00", "voltaje_max": 500, "ensayo": 2500, "etiqueta": "Beige"},
    {"regla": "RG-03", "clase": "Clase 0", "voltaje_max": 1000, "ensayo": 5000, "etiqueta": "Rojo"},
    {"regla": "RG-04", "clase": "Clase 1", "voltaje_max": 7500, "ensayo": 10000, "etiqueta": "Blanco"},
    {"regla": "RG-05", "clase": "Clase 2", "voltaje_max": 17000, "ensayo": 20000, "etiqueta": "Amarillo"},
    {"regla": "RG-06", "clase": "Clase 3", "voltaje_max": 26500, "ensayo": 30000, "etiqueta": "Verde"},
    {"regla": "RG-07", "clase": "Clase 4", "voltaje_max": 36000, "ensayo": 40000, "etiqueta": "Naranja"},
]

AVISO_PRELIMINAR = (
    "Orientación técnica preliminar. No sustituye la evaluación de riesgos "
    "de un prevencionista ni constituye autorización para ejecutar el trabajo."
)


def _hay_contradiccion(tarea, tension_max):
    """Detecta contradicciones entre la descripción de la tarea y la tensión (RG-11)."""
    if not tarea or tension_max is None:
        return False
    texto = tarea.lower()
    if "baja tensi" in texto and tension_max > 1000:
        return True
    if ("alta tensi" in texto or "media tensi" in texto) and tension_max <= 500:
        return True
    return False


def evaluar_antecedentes(antecedentes):
    """Evalúa los antecedentes estructurados aplicando las reglas RG-01 a RG-13 (RF-42, RF-44)."""
    fuera_dominio = bool(antecedentes.get("fuera_de_dominio", False))
    tarea = str(antecedentes.get("tarea") or "").strip()
    entorno = str(antecedentes.get("entorno") or "").strip().lower()
    tension_max = antecedentes.get("tension_maxima")
    tipo_corriente = str(antecedentes.get("tipo_corriente") or "ca").strip().lower()
    riesgo_arco = bool(antecedentes.get("riesgo_arco", False))

    # RG-12: Consulta fuera del dominio de EPP para riesgo eléctrico.
    if fuera_dominio:
        return {
            "es_valido": False,
            "accion": "declinar",
            "derivar": False,
            "regla_aplicada": "RG-12",
            "fuente": "Diseño del sistema",
            "mensaje": (
                "El asistente está especializado únicamente en elementos de protección "
                "personal para riesgo eléctrico. Para otros artículos, utilice el formulario de contacto."
            ),
            "aviso_preliminar": AVISO_PRELIMINAR,
        }

    # RG-10: Riesgo de arco eléctrico declarado o implícito en la tarea (NFPA 70E).
    if riesgo_arco or "arco" in tarea.lower():
        return {
            "es_valido": False,
            "accion": "derivar",
            "derivar": True,
            "regla_aplicada": "RG-10",
            "fuente": "NFPA 70E",
            "motivo_derivacion": "Riesgo de arco eléctrico requiere cálculo de energía incidente.",
            "mensaje": (
                "Derivación obligatoria (NFPA 70E): ante riesgo de arco eléctrico, la selección "
                "del equipo exige conocer la energía incidente calculada por un prevencionista. "
                "Se ha generado una solicitud de asesoría para nuestro equipo técnico."
            ),
            "aviso_preliminar": AVISO_PRELIMINAR,
        }

    # RG-09: Corriente continua declarada.
    if tipo_corriente in ("cc", "dc", "continua", "corriente continua"):
        return {
            "es_valido": False,
            "accion": "derivar",
            "derivar": True,
            "regla_aplicada": "RG-09",
            "fuente": "Diseño del sistema",
            "motivo_derivacion": "Exposición en corriente continua (CC) requiere evaluación específica.",
            "mensaje": (
                "Derivación obligatoria: las clases dieléctricas se aplican con criterios distintos "
                "en corriente continua. Una asesora técnica revisará su requerimiento."
            ),
            "aviso_preliminar": AVISO_PRELIMINAR,
        }

    # RG-01: Tensión máxima de uso no declarada o inválida.
    if tension_max is None or tension_max <= 0:
        return {
            "es_valido": False,
            "accion": "abstener",
            "derivar": False,
            "regla_aplicada": "RG-01",
            "fuente": "Diseño del sistema",
            "mensaje": (
                "Abstención preventiva: antes de orientar, indique la tensión máxima de exposición "
                "(en voltios), la tarea a realizar, el entorno, el tipo de corriente y si existe riesgo de arco."
            ),
            "aviso_preliminar": AVISO_PRELIMINAR,
        }

    # RG-11: Antecedentes contradictorios (ej. declara baja tensión con 20.000 V).
    if _hay_contradiccion(tarea, tension_max):
        return {
            "es_valido": False,
            "accion": "abstener",
            "derivar": True,
            "regla_aplicada": "RG-11",
            "fuente": "Diseño del sistema",
            "motivo_derivacion": f"Contradicción entre tarea ('{tarea}') y tensión ({tension_max} V).",
            "mensaje": (
                f"Los antecedentes presentan una contradicción entre la tarea descrita y la tensión "
                f"declarada ({tension_max} V). Por seguridad, aclararemos el caso con una asesora."
            ),
            "aviso_preliminar": AVISO_PRELIMINAR,
        }

    # RG-08: Tensión sobre el umbral máximo de Clase 4 (mayor a 36.000 V).
    if tension_max > 36000:
        return {
            "es_valido": False,
            "accion": "derivar",
            "derivar": True,
            "regla_aplicada": "RG-08",
            "fuente": "Diseño del sistema",
            "motivo_derivacion": f"Tensión declarada ({tension_max} V) supera el umbral de 36.000 V.",
            "mensaje": (
                f"Derivación obligatoria: la tensión indicada ({tension_max} V AC) supera el límite "
                "máximo de 36.000 V AC (Clase 4). Se ha derivado su caso a una asesora técnica."
            ),
            "aviso_preliminar": AVISO_PRELIMINAR,
        }

    # RG-13: Advertencia adicional si declara ambiente húmedo o exterior (no altera la clase).
    advertencia_entorno = ""
    if any(palabra in entorno for palabra in ("humed", "húmed", "lluvia", "agua", "exterior", "intemperie")):
        advertencia_entorno = (
            "Advertencia (RG-13): en ambiente húmedo o exterior extreme la inspección previa "
            "del elemento aislante y verifique las condiciones de uso de la ficha técnica."
        )

    # RG-02 a RG-07: Selección determinística por tramo de tensión en corriente alterna.
    for tramo in TRAMOS_DIELECTRICOS_CA:
        if tension_max <= tramo["voltaje_max"]:
            return {
                "es_valido": True,
                "accion": "orientar",
                "derivar": False,
                "regla_aplicada": tramo["regla"],
                "fuente": "IEC 60903; ASTM D120-22",
                "voltaje_consultado": tension_max,
                "clase_recomendada": tramo["clase"],
                "voltaje_maximo": tramo["voltaje_max"],
                "tension_ensayo": tramo["ensayo"],
                "color_etiqueta": tramo["etiqueta"],
                "advertencia_entorno": advertencia_entorno,
                "aviso_preliminar": AVISO_PRELIMINAR,
            }


def evaluar_voltaje(voltaje_ac):
    """Atajo compatible para evaluar directamente un voltaje en corriente alterna."""
    return evaluar_antecedentes({"tension_maxima": voltaje_ac, "tipo_corriente": "ca"})