import { pedir } from './api'

function unicos(lista) {
  return [...new Set(lista.filter(Boolean))]
}

export function adaptarProducto(p) {
  const principal = p.imagenes?.find((i) => i.es_principal) ?? p.imagenes?.[0]
  return {
    id: p.id,
    codigo: p.codigo,
    nombre: p.nombre,
    categoria: p.categoria_nombre ?? '',
    imagen: principal?.url_imagen ?? null,
    tallas: unicos((p.variantes ?? []).map((v) => v.talla)),
    colores: unicos((p.variantes ?? []).map((v) => v.color)),
    ficha: {
      descripcion: p.descripcion,
      normativa: p.normativa,
      claseDielectrica: p.clase_dielectrica,
      tensionMaxUso: p.tension_max_uso_v,
      tensionEnsayo: p.tension_ensayo_v,
    },
  }
}

export async function listarProductos({ busqueda = '', categoria = '', pagina = 1 } = {}) {
  const params = new URLSearchParams()
  if (busqueda) params.set('busqueda', busqueda)
  if (categoria) params.set('categoria', categoria)
  params.set('page', pagina)
  const datos = await pedir(`/api/catalogo/productos/?${params}`)
  return { total: datos.count, productos: datos.results.map(adaptarProducto) }
}

export async function listarCategorias() {
  return pedir('/api/catalogo/categorias/')
}