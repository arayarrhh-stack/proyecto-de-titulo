"""Define los datos básicos que se guardan de cada producto en la base de datos.

Base de HU-07 (identificar productos), HU-12 (desactivarlos) y HU-13
(registrar el estado de revisión de sus fichas técnicas).

Conexiones: views.py consulta estos datos para mostrar el catálogo.
La administración de productos usará este modelo para crear y editar registros.
El módulo de fichas técnicas usará estado_validacion para registrar su revisión.
"""

from django.db import models


class Producto(models.Model):
    """Cada registro de este modelo representa un producto del catálogo."""

    # HU-07: el código es la referencia del producto y no puede repetirse.
    # Dos productos pueden tener el mismo nombre, pero deben tener códigos distintos.
    codigo = models.CharField(max_length=40, unique=True)

    # Nombre y descripción son los textos que recibirá la interfaz del catálogo.
    nombre = models.CharField(max_length=120)
    # blank=True permite guardar un producto con la descripción vacía.
    descripcion = models.TextField(blank=True)

    # HU-12: permite desactivar el producto sin borrar su registro.
    # Un producto nuevo empieza inactivo. Para mostrarse, views.py exige
    # que esté activo y que el estado de su ficha sea "validada".
    activo = models.BooleanField(default=False)

    # HU-13: guarda la etapa de revisión de la ficha; empieza en "borrador".
    # El módulo de fichas técnicas usará este campo para registrar su revisión.
    # Este campo almacena el estado; no comprueba por sí solo el contenido técnico.
    estado_validacion = models.CharField(
        max_length=8,
        default="borrador",
        choices=[
            ("borrador", "Borrador"),
            ("revision", "En revisión"),
            ("validada", "Validada"),
            ("vencida", "Vencida"),
        ],
    )

    class Meta:
        # Ordena por nombre. Si los nombres coinciden, usa el id para desempatar.
        # Así las páginas del catálogo mantienen el orden con los mismos datos.
        ordering = ["nombre", "id"]

    def __str__(self):
        """Muestra el nombre cuando Django representa el producto como texto."""
        return self.nombre
