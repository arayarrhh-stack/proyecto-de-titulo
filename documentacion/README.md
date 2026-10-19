# Documentación

Los requisitos y las historias de usuario se consultan en el informe `Informe_ACOMSE-2.pdf`.

- [Instalación y consultas de la API](../backend/README.md).
- [Avances del proyecto](registro_desarrollo.md).

## Alcance del catálogo

La implementación actual incluye los datos básicos del producto y las consultas públicas de lista y detalle. Usa como referencia HU-07, HU-12, HU-13, HU-15 y HU-16; estas historias también contienen criterios que van más allá de esta entrega.

## Reglas de publicación

- El código del producto es único.
- Un producto nuevo empieza inactivo y con su ficha en estado `borrador`.
- Para aparecer en el catálogo debe estar activo y tener la ficha en estado `validada`.
- Guardar el estado de una ficha no realiza una validación técnica automática.
- Las páginas muestran hasta 24 productos.
- El catálogo público no expone precios, costos ni márgenes. Los importes corresponden al módulo de cotizaciones.
