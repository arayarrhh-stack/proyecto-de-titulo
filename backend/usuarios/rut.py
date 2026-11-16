"""Validación y normalización de RUT chileno con dígito verificador (módulo 11)."""
import re


def normalizar_rut(valor):
    """Devuelve el RUT como '12345678-5' (sin puntos, con K mayúscula) o '' si es muy corto."""
    limpio = re.sub(r"[^0-9kK]", "", str(valor or "")).upper()
    if len(limpio) < 2:
        return ""
    return f"{limpio[:-1]}-{limpio[-1]}"


def validar_rut(valor):
    """Comprueba el formato y el dígito verificador por módulo 11 (HU-01)."""
    rut = normalizar_rut(valor)
    if not rut:
        return False
    cuerpo, dv = rut.split("-")
    if not cuerpo.isdigit() or not 7 <= len(cuerpo) <= 8:
        return False
    suma, factor = 0, 2
    for digito in reversed(cuerpo):
        suma += int(digito) * factor
        factor = 2 if factor == 7 else factor + 1
    resto = 11 - (suma % 11)
    esperado = "0" if resto == 11 else "K" if resto == 10 else str(resto)
    return dv == esperado