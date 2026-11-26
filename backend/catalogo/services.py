"""Lógica de negocio para administración del catálogo técnico y validación de fichas (M2)."""
from datetime import date
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction

from .models import EstadoValidacionFicha, ImagenProducto, Producto, Variante

ATRIBUTOS_CRITICOS = {
    "normativa",
    "clase_dielectrica",
    "tension_max_uso_v",
    "tension_ensayo_v",
}
MAX_PRODUCTOS_DESTACADOS = 8


def verificar_vigencia_fichas():
    """HU-13: pasa automáticamente a Vencida toda ficha cuya fecha de vigencia haya expirado."""
    hoy = date.today()
    return Producto.objects.filter(
        estado_validacion=EstadoValidacionFicha.VALIDADA,
        fecha_vigencia_ficha__lt=hoy,
    ).update(estado_validacion=EstadoValidacionFicha.VENCIDA)


@transaction.atomic
def registrar_producto(datos, variantes=None, imagenes=None):
    """HU-07 y RF-09: registra un producto en estado Borrador validando atributos dieléctricos."""
    categoria = datos.get("categoria")
    if categoria and categoria.es_proteccion_dielectrica:
        if (
            not str(datos.get("clase_dielectrica", "")).strip()
            or datos.get("tension_max_uso_v") is None
        ):
            raise ValidationError(
                "Los productos de protección dieléctrica exigen clase dieléctrica y tensión máxima de uso (HU-07)."
            )

    datos["estado_validacion"] = EstadoValidacionFicha.BORRADOR
    datos["destacado"] = False
    producto = Producto.objects.create(**datos)

    if variantes:
        for var in variantes:
            Variante.objects.create(
                producto=producto,
                talla=str(var.get("talla", "")).strip(),
                color=str(var.get("color", "")).strip(),
            )

    if imagenes:
        for idx, img in enumerate(imagenes, start=1):
            ImagenProducto.objects.create(
                producto=producto,
                url_imagen=str(img.get("url_imagen", "")).strip(),
                es_principal=bool(img.get("es_principal", idx == 1)),
                orden=int(img.get("orden", idx)),
            )

    return producto


@transaction.atomic
def actualizar_producto(producto, datos_nuevos):
    """HU-08 y RF-10: toda edición de un atributo crítico devuelve la ficha a estado Borrador."""
    cambio_critico = False
    for campo in ATRIBUTOS_CRITICOS:
        if campo in datos_nuevos and getattr(producto, campo) != datos_nuevos[campo]:
            cambio_critico = True
            break

    for campo, valor in datos_nuevos.items():
        setattr(producto, campo, valor)

    if cambio_critico:
        producto.estado_validacion = EstadoValidacionFicha.BORRADOR
        producto.destacado = False

    if not producto.activo:
        producto.destacado = False

    if producto.destacado:
        if (
            not producto.activo
            or producto.estado_validacion != EstadoValidacionFicha.VALIDADA
        ):
            raise ValidationError(
                "Solo se pueden destacar productos activos con ficha Validada (HU-14, RF-19)."
            )
        total_destacados = (
            Producto.objects.filter(destacado=True).exclude(id=producto.id).count()
        )
        if total_destacados >= MAX_PRODUCTOS_DESTACADOS:
            raise ValidationError(
                f"Se permite un máximo de {MAX_PRODUCTOS_DESTACADOS} productos destacados (HU-14)."
            )

    producto.save()
    return producto


@transaction.atomic
def validar_ficha_tecnica(
    producto,
    usuario_validador,
    nuevo_estado,
    fuente_ficha="",
    version_ficha="1.0",
    fecha_vigencia=None,
):
    """HU-13 y RF-17: aprueba o cambia el estado de una ficha exigiendo rol Validador técnico."""
    rol_usuario = getattr(usuario_validador, "rol", "")
    if rol_usuario != "validadora" and not getattr(
        usuario_validador, "is_superuser", False
    ):
        raise PermissionDenied(
            "La validación de fichas técnicas exige el rol Validador técnico (RF-04, HU-13)."
        )

    if nuevo_estado not in dict(EstadoValidacionFicha.choices):
        raise ValidationError("Estado de validación de ficha no reconocido.")

    if nuevo_estado == EstadoValidacionFicha.VALIDADA:
        if not str(fuente_ficha or producto.fuente_ficha).strip():
            raise ValidationError(
                "Debe indicar la fuente normativa para validar la ficha (RF-17)."
            )

    producto.estado_validacion = nuevo_estado
    if fuente_ficha:
        producto.fuente_ficha = fuente_ficha
    if version_ficha:
        producto.version_ficha = version_ficha
    if fecha_vigencia:
        producto.fecha_vigencia_ficha = fecha_vigencia
    producto.validada_por = usuario_validador
    producto.save()
    return producto