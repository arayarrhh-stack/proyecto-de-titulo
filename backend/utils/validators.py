"""Validación y normalización de RUT chileno mediante algoritmo Módulo 11 (HU-01, RF-01)."""
import re
from django.core.exceptions import ValidationError


def limpiar_rut(rut_raw):
    """Elimina puntos, espacios y guiones, dejando cuerpo y dígito verificador en mayúscula."""
    if not rut_raw:
        return ""
    limpio = re.sub(r"[^0-9kK]", "", str(rut_raw)).upper()
    return limpio


def calcular_dv_modulo_11(cuerpo_numerico):
    """Calcula el dígito verificador oficial chileno (0-9 o K) usando Módulo 11."""
    suma = 0
    multiplicador = 2
    for digito in reversed(str(cuerpo_numerico)):
        suma += int(digito) * multiplicador
        multiplicador = 2 if multiplicador == 7 else multiplicador + 1

    resto = 11 - (suma % 11)
    if resto == 11:
        return "0"
    if resto == 10:
        return "K"
    return str(resto)


def validar_y_formatear_rut(rut_raw):
    """Verifica el dígito verificador de un RUT y retorna el formato estándar XXXXXXXX-X."""
    limpio = limpiar_rut(rut_raw)
    if len(limpio) < 2:
        raise ValidationError("El RUT ingresado es demasiado corto.")

    cuerpo, dv_ingresado = limpio[:-1], limpio[-1]
    if not cuerpo.isdigit() or int(cuerpo) < 100000:
        raise ValidationError("El cuerpo del RUT debe ser numérico y válido.")

    dv_calculado = calcular_dv_modulo_11(cuerpo)
    if dv_ingresado != dv_calculado:
        raise ValidationError("El RUT ingresado tiene un dígito verificador inválido.")

    return f"{int(cuerpo)}-{dv_calculado}"