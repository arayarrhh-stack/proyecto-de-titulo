import { useState } from 'react'
import { useCotizacion } from '../context/CotizacionContext'

function Fila({ etiqueta, valor }) {
  if (valor === null || valor === undefined || valor === '') return null
  return (
    <div className="flex justify-between gap-2 py-1 border-b border-gray-100 last:border-0">
      <dt className="text-gray-500">{etiqueta}</dt>
      <dd className="font-medium text-right">{valor}</dd>
    </div>
  )
}

export default function ProductoCard({ producto }) {
  const { agregar } = useCotizacion()
  const [verFicha, setVerFicha] = useState(false)
  const [talla, setTalla] = useState(producto.tallas[0] ?? '')
  const [color, setColor] = useState(producto.colores[0] ?? '')
  const f = producto.ficha

  return (
    <div className="bg-white rounded-lg shadow p-4 flex flex-col gap-3">
      {producto.imagen ? (
        <img src={producto.imagen} alt={producto.nombre} className="w-full h-40 object-contain" />
      ) : (
        <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
          Sin imagen
        </div>
      )}

      <div>
        <h3 className="font-semibold">{producto.nombre}</h3>
        <p className="text-xs text-gray-500">
          {producto.codigo} · {producto.categoria}
        </p>
      </div>

      {producto.tallas.length > 0 && (
        <select value={talla} onChange={(e) => setTalla(e.target.value)} className="border rounded px-2 py-1 text-sm">
          {producto.tallas.map((t) => (
            <option key={t} value={t}>Talla {t}</option>
          ))}
        </select>
      )}
      {producto.colores.length > 0 && (
        <select value={color} onChange={(e) => setColor(e.target.value)} className="border rounded px-2 py-1 text-sm">
          {producto.colores.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      )}

      <button
        type="button"
        onClick={() => setVerFicha((v) => !v)}
        className="text-sm text-blue-700 underline text-left"
      >
        {verFicha ? 'Ocultar detalles' : 'Ver detalles'}
      </button>

      {verFicha && (
        <dl className="text-sm bg-gray-50 rounded p-3">
          <Fila etiqueta="Descripción" valor={f.descripcion} />
          <Fila etiqueta="Normativa" valor={f.normativa} />
          <Fila etiqueta="Clase dieléctrica" valor={f.claseDielectrica} />
          <Fila etiqueta="Tensión máxima de uso" valor={f.tensionMaxUso != null ? `${f.tensionMaxUso} V` : null} />
          <Fila etiqueta="Tensión de ensayo" valor={f.tensionEnsayo != null ? `${f.tensionEnsayo} V` : null} />
          {!f.descripcion && !f.normativa && !f.claseDielectrica && f.tensionMaxUso == null && f.tensionEnsayo == null && (
            <p className="text-gray-500">Sin datos de ficha técnica.</p>
          )}
        </dl>
      )}

      <button
        type="button"
        onClick={() => agregar(producto, { talla, color })}
        className="mt-auto bg-blue-700 text-white rounded py-2 text-sm hover:bg-blue-800"
      >
        Agregar a cotización
      </button>
    </div>
  )
}