# Backend

API del catálogo de ACOMSE. Utiliza Django, Django REST Framework y una base SQLite local.

## Instalación

Requisitos: Python 3.13 y PowerShell. Desde la carpeta raíz del repositorio:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe manage.py migrate
```

Estos pasos crean el entorno de Python, instalan las dependencias y generan las tablas de la base de datos.

## Ejecutar el servidor

Desde `backend`:

```powershell
.\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000 --noreload
```

La API queda disponible en `http://127.0.0.1:8000/api/catalogo/productos/`.

Para detenerla, pulsa `Ctrl+C`. Después de modificar el código, vuelve a iniciar el servidor.

## Consultas

| Método | Ruta | Resultado |
| --- | --- | --- |
| GET | `/api/catalogo/productos/` | Lista paginada de productos. |
| GET | `/api/catalogo/productos/{id}/` | Detalle del producto indicado. |

Las consultas son públicas, de solo lectura y responden en JSON. Cada producto incluye `id`, `codigo`, `nombre` y `descripcion`.

La lista entrega hasta 24 productos por página. Para consultar otra página, utiliza `?page=2` o la dirección del campo `next` de la respuesta.

Solo se muestran registros con `activo=True` y `estado_validacion="validada"`. Los demás quedan fuera de la lista y su consulta individual devuelve 404. Una base nueva devuelve una lista vacía.

El estado de validación se almacena como dato; este módulo no realiza una revisión técnica de la ficha. Las respuestas públicas no incluyen precios, costos ni márgenes.

## Organización del módulo

- `catalogo/models.py`: datos del producto y estados de publicación.
- `catalogo/serializers.py`: campos incluidos en las respuestas.
- `catalogo/views.py`: consultas y filtro de productos publicados.
- `catalogo/urls.py`: direcciones de la API.
- `catalogo/migrations/`: estructura de las tablas.

Cada integrante genera su propio entorno y base local. `.venv/`, `db.sqlite3` y `__pycache__/` quedan fuera de Git. Las migraciones sí forman parte del repositorio.
