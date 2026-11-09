"""Define los datos de cada producto, categoría, proveedor, variante y ficha en la base de datos.

Base de HU-07 (identificar productos y variantes), HU-08 (edición controlada),
HU-09 (fotografías), HU-10 (categorías), HU-11 (proveedores y márgenes reservados),
HU-12 (desactivar productos), HU-13 (estado de revisión de fichas técnicas) y
HU-14 (productos destacados).

Conexiones: views.py consulta estos datos para mostrar el catálogo público y el
panel administrativo; services.py aplica las reglas de negocio sobre estas tablas.
"""
from decimal import Decimal
from django.conf import settings
from django.db import models


class EstadoValidacionFicha(models.TextChoices):
    """Estados del ciclo de revisión de una ficha técnica (HU-13, RF-17)."""

    BORRADOR = "borrador", "Borrador"
    REVISION = "revision", "En revisión"
    VALIDADA = "validada", "Validada"
    VENCIDA = "vencida", "Vencida"


class Categoria(models.Model):
    """Categoría del catálogo con margen y recargos reservados en servidor (HU-10, HU-11, RNF-04)."""

    nombre = models.CharField(max_length=100, unique=True)
    orden_visualizacion = models.PositiveIntegerField(default=1)
    es_proteccion_dielectrica = models.BooleanField(default=False)

    # HU-11 / RF-14 / RF-15: margen y recargos por defecto reservados al rol Administrador.
    margen_defecto = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal("13.33")
    )
    recargo_certificacion_defecto = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0.00")
    )
    recargo_envio_defecto = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0.00")
    )

    class Meta:
        ordering = ["orden_visualizacion", "nombre"]

    def __str__(self):
        return self.nombre


class Proveedor(models.Model):
    """Proveedor de EPP registrado para intermediación a pedido (HU-11, RF-13)."""

    razon_social = models.CharField(max_length=150)
    rut = models.CharField(max_length=15, unique=True)
    contacto_nombre = models.CharField(max_length=120, blank=True, default="")
    contacto_correo = models.EmailField(blank=True, default="")
    contacto_telefono = models.CharField(max_length=30, blank=True, default="")
    condiciones_despacho = models.TextField(blank=True, default="")
    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ["razon_social"]

    def __str__(self):
        return f"{self.razon_social} ({self.rut})"


class Producto(models.Model):
    """Cada registro de este modelo representa un producto del catálogo."""

    # HU-07: el código es la referencia del producto y no puede repetirse.
    # Dos productos pueden tener el mismo nombre, pero deben tener códigos distintos.
    codigo = models.CharField(max_length=40, unique=True, db_index=True)

    # Nombre y descripción son los textos que recibirá la interfaz del catálogo.
    nombre = models.CharField(max_length=120)
    # blank=True permite guardar un producto con la descripción vacía.
    descripcion = models.TextField(blank=True, default="")

    # HU-12: permite desactivar el producto sin borrar su registro.
    # Un producto nuevo empieza inactivo. Para mostrarse, views.py exige
    # que esté activo y que el estado de su ficha sea "validada".
    activo = models.BooleanField(default=False)

    # HU-13: guarda la etapa de revisión de la ficha; empieza en "borrador".
    # El módulo de fichas técnicas usa este campo para registrar su revisión.
    estado_validacion = models.CharField(
        max_length=8,
        default=EstadoValidacionFicha.BORRADOR,
        choices=EstadoValidacionFicha.choices,
    )

    # HU-10 / HU-11: relaciones con categoría y proveedor habitual (RF-12, RF-13).
    categoria = models.ForeignKey(
        Categoria,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="productos",
    )
    proveedor_habitual = models.ForeignKey(
        Proveedor,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="productos_habituales",
    )
    codigo_proveedor = models.CharField(max_length=60, blank=True, default="")

    # HU-07 / RF-09: atributos críticos de seguridad eléctrica (Tabla 7).
    normativa = models.CharField(max_length=200, blank=True, default="")
    clase_dielectrica = models.CharField(max_length=10, blank=True, default="")
    tension_max_uso_v = models.PositiveIntegerField(null=True, blank=True)
    tension_ensayo_v = models.PositiveIntegerField(null=True, blank=True)

    # HU-13 / RF-17 / RF-18: metadatos de gobernanza de la ficha técnica.
    fuente_ficha = models.CharField(max_length=200, blank=True, default="")
    version_ficha = models.CharField(max_length=20, default="1.0")
    fecha_vigencia_ficha = models.DateField(null=True, blank=True)
    validada_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="fichas_producto_validadas",
    )

    # HU-14 / RF-19: producto destacado en la página de inicio.
    destacado = models.BooleanField(default=False)

    class Meta:
        # Ordena por nombre. Si los nombres coinciden, usa el id para desempatar.
        # Así las páginas del catálogo mantienen el orden con los mismos datos.
        ordering = ["nombre", "id"]

    def __str__(self):
        """Muestra el nombre cuando Django representa el producto como texto."""
        return self.nombre


class Variante(models.Model):
    """Variante de talla y color de un producto del catálogo (HU-07, HU-16, RF-09, RF-21)."""

    producto = models.ForeignKey(
        Producto,
        on_delete=models.CASCADE,
        related_name="variantes",
    )
    talla = models.CharField(max_length=30, blank=True, default="")
    color = models.CharField(max_length=30, blank=True, default="")
    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ["talla", "color", "id"]

    def __str__(self):
        return f"{self.producto.codigo} ({self.talla} {self.color})".strip()


class ImagenProducto(models.Model):
    """Fotografía asociada a un producto con indicador de imagen principal (HU-09, RF-11)."""

    producto = models.ForeignKey(
        Producto,
        on_delete=models.CASCADE,
        related_name="imagenes",
    )
    url_imagen = models.CharField(max_length=255)
    es_principal = models.BooleanField(default=False)
    orden = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ["-es_principal", "orden", "id"]