# ACOMSE

Plataforma B2B para ACOMSE, desarrollada a partir de los requisitos del informe del proyecto.

## Estado actual

El backend permite consultar la lista de productos y el detalle de cada uno. El catálogo muestra productos activos con ficha validada, en páginas de 24 resultados y sin precios públicos.

La API utiliza Django, Django REST Framework y SQLite para el desarrollo local. La interfaz con React y Tailwind CSS todavía no está implementada.

## Organización

```text
proyecto-ACOMSE/
├── backend/          # API, modelos y migraciones
├── frontend/         # Interfaz web
├── documentacion/    # Alcance y avances
├── .gitignore
└── README.md
```

## Instalación

Se necesita Python 3.13. La [guía del backend](backend/README.md) incluye los comandos para instalar las dependencias, crear la base local y ejecutar el servidor.

Una instalación nueva no contiene productos. El catálogo devuelve una lista vacía hasta que existan registros activos con ficha validada.

## Documentación

- [Alcance y reglas del catálogo](documentacion/README.md).
- [Avances del proyecto](documentacion/registro_desarrollo.md).
