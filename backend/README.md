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
| GET | `/api/catalogo/productos/?busqueda=guante` | Busca por parte del nombre o del código. |
| GET | `/api/catalogo/productos/{id}/` | Detalle del producto indicado. |

Las consultas son públicas, de solo lectura y responden en JSON. Cada producto incluye `id`, `codigo`, `nombre` y `descripcion`.

La lista entrega hasta 24 productos por página. Para consultar otra página, utiliza `?page=2` o la dirección del campo `next` de la respuesta.

Solo se muestran registros con `activo=True` y `estado_validacion="validada"`. Los demás quedan fuera de la lista y su consulta individual devuelve 404. Una base nueva devuelve una lista vacía.

El estado de validación se almacena como dato; este módulo no realiza una revisión técnica de la ficha. Las respuestas públicas no incluyen precios, costos ni márgenes.

## Búsqueda por nombre o código (HU-17)

El parámetro `busqueda` compara el texto completo con cualquier parte del nombre o del código interno. Por ejemplo, `?busqueda=guante` busca ese texto en ambos campos y `?busqueda=GUA-01` permite buscar por código. La descripción no interviene en la búsqueda.

Se quitan los espacios al principio y al final. Si el parámetro se omite, está vacío o solo tiene espacios, se devuelve el catálogo publicado. Si no hay coincidencias, la respuesta conserva el formato paginado con `count: 0` y `results: []`.

La consulta usa `icontains` de Django. Con SQLite no distingue mayúsculas ASCII (`GUA` y `gua`), pero no elimina tildes ni garantiza equivalencia entre mayúsculas y minúsculas acentuadas. El buscador de la interfaz en `testing` sí elimina tildes; ambas búsquedas tienen esa diferencia.

La búsqueda mantiene las reglas de publicación y las 24 entradas por página. Para avanzar se usa el enlace `next`, que conserva el texto buscado, o `?busqueda=guante&page=2`. El parámetro no modifica la consulta de detalle por id.

`Catalogo.jsx` en `testing` trabaja con productos de ejemplo. La conexión con esta API usará `busqueda` y los campos `count`, `next`, `previous` y `results` de la respuesta. Esta entrega cubre la búsqueda del backend; el filtro por categoría y el mensaje de la interfaz con acceso al asistente y al contacto completarán los demás criterios de HU-17.

## Organización del módulo

- `catalogo/models.py`: datos del producto y estados de publicación.
- `catalogo/serializers.py`: campos incluidos en las respuestas.
- `catalogo/views.py`: consultas, filtro de productos publicados y búsqueda por nombre o código.
- `catalogo/urls.py`: direcciones de la API.
- `catalogo/migrations/`: estructura de las tablas.

Cada integrante genera su propio entorno y base local. `.venv/`, `db.sqlite3` y `__pycache__/` quedan fuera de Git. Las migraciones sí forman parte del repositorio.
