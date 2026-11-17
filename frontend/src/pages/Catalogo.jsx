import { useEffect, useRef, useState } from 'react'
import ProductoCard from '../components/ProductoCard'
import { listarProductos, listarCategorias } from '../services/catalogo'

const POR_PAGINA = 24

export default function Catalogo() {
  const [texto, setTexto] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('')
  const [pagina, setPagina] = useState(1)
  const [categorias, setCategorias] = useState([])
  const [datos, setDatos] = useState({ total: 0, productos: [] })
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [intento, setIntento] = useState(0)
  const ultima = useRef(0)

  useEffect(() => {
    listarCategorias().then(setCategorias).catch(() => {})
  }, [])

  // Espera 400 ms después de escribir antes de buscar
  useEffect(() => {
    const t = setTimeout(() => {
      setBusqueda(texto)
      setPagina(1)
    }, 400)
    return () => clearTimeout(t)
  }, [texto])

  useEffect(() => {
    const id = ++ultima.current
    setCargando(true)
    setError('')
    listarProductos({ busqueda, categoria, pagina })
      .then((r) => {
        if (id === ultima.current) setDatos(r)
      })
      .catch((e) => {
        if (id === ultima.current) setError(e.message)
      })
      .finally(() => {
        if (id === ultima.current) setCargando(false)
      })
  }, [busqueda, categoria, pagina, intento])

  const totalPaginas = Math.max(1, Math.ceil(datos.total / POR_PAGINA))

  return (
    <main className="max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Catálogo de productos</h1>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="search"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Buscar producto por nombre o código"
          className="flex-1 border rounded px-3 py-2"
        />
        <select
          value={categoria}
          onChange={(e) => {
            setCategoria(e.target.value)
            setPagina(1)
          }}
          className="border rounded px-3 py-2"
        >
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-4 mb-4">
          <p>{error}</p>
          <button onClick={() => setIntento((n) => n + 1)} className="underline mt-2">
            Reintentar
          </button>
        </div>
      )}

      {cargando && !error && <p className="text-gray-500">Cargando productos…</p>}

      {!cargando && !error && datos.productos.length === 0 && (
        <p className="text-gray-500">No se encontraron productos.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {datos.productos.map((p) => (
          <ProductoCard key={p.id} producto={p} />
        ))}
      </div>

      {totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <button disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)} className="px-3 py-1 border rounded disabled:opacity-40">
            Anterior
          </button>
          <span className="text-sm">Página {pagina} de {totalPaginas}</span>
          <button disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => p + 1)} className="px-3 py-1 border rounded disabled:opacity-40">
            Siguiente
          </button>
        </div>
      )}
    </main>
  )
}