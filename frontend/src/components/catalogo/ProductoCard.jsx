import { useState } from "react";
import { Link } from "react-router-dom";
import { useCotizacion } from "../../context/CotizacionContext";
import { useAuth } from "../../context/AuthContext";

function Fila({ etiqueta, valor }) {
  if (valor === null || valor === undefined || valor === "") return null;
  return (
    <div className="flex justify-between gap-2 py-1 border-b border-slate-200/70 last:border-0 text-xs">
      <dt className="text-slate-500">{etiqueta}</dt>
      <dd className="font-semibold text-slate-800 text-right">{valor}</dd>
    </div>
  );
}

export default function ProductoCard({ producto, onEliminar }) {
  const { agregar } = useCotizacion();
  const { usuario } = useAuth();
  const [verFicha, setVerFicha] = useState(false);
  const [talla, setTalla] = useState(producto.tallas?.[0] ?? "");
  const [color, setColor] = useState(producto.colores?.[0] ?? "");
  const [agregado, setAgregado] = useState(false);

  const esAdmin = usuario?.rol === "admin";
  const f = producto.ficha || {};

  function manejarAgregar() {
    agregar(producto, { talla, color });
    setAgregado(true);
    setTimeout(() => setAgregado(false), 1400);
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-sm hover:shadow-md hover:border-slate-300 transition group">
      <div>
        {/* Imagen del producto */}
        <div className="relative w-full h-44 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center p-3 mb-3 overflow-hidden">
          {f.claseDielectrica && (
            <span className="absolute top-2 right-2 bg-[#0b192c] text-[#facc15] text-[10px] font-bold px-2 py-0.5 rounded">
              Clase {f.claseDielectrica}
            </span>
          )}
          {producto.imagen ? (
            <img
              src={producto.imagen}
              alt={producto.nombre}
              className="max-h-full max-w-full object-contain group-hover:scale-105 transition duration-200"
            />
          ) : (
            <span className="text-4xl text-slate-300">{"\u{1F9E4}"}</span>
          )}
        </div>

        {/* Categoría */}
        <p className="text-[11px] font-bold uppercase tracking-wider text-blue-900/70">
          {producto.categoria || "Protección Eléctrica"}
        </p>

        {/* Nombre del producto */}
        <h3 className="font-bold text-[#0b192c] text-sm mt-1 leading-snug line-clamp-2 min-h-[2.5rem]">
          {producto.nombre}
        </h3>

        {/* Bloque técnico SKU y Normativa estilo Calimport */}
        <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-0.5">
          <p>
            <span className="font-semibold text-slate-700">SKU:</span>{" "}
            {producto.codigo || "S/C"}
          </p>
          {f.normativa && (
            <p className="truncate">
              <span className="font-semibold text-slate-700">Norma:</span>{" "}
              {f.normativa}
            </p>
          )}
        </div>

        {/* Selectores compactos si tiene tallas o colores */}
        {(producto.tallas?.length > 0 || producto.colores?.length > 0) && (
          <div className="grid grid-cols-2 gap-1.5 mt-2.5">
            {producto.tallas?.length > 0 && (
              <select
                value={talla}
                onChange={(e) => setTalla(e.target.value)}
                aria-label="Talla"
                className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded px-2 py-1 text-[11px] font-medium focus:outline-none focus:ring-1 focus:ring-[#facc15]"
              >
                {producto.tallas.map((t) => (
                  <option key={t} value={t}>
                    Talla {t}
                  </option>
                ))}
              </select>
            )}
            {producto.colores?.length > 0 && (
              <select
                value={color}
                onChange={(e) => setColor(e.target.value)}
                aria-label="Color"
                className={`w-full bg-slate-50 border border-slate-200 text-slate-700 rounded px-2 py-1 text-[11px] font-medium capitalize focus:outline-none focus:ring-1 focus:ring-[#facc15] ${
                  producto.tallas?.length === 0 ? "col-span-2" : ""
                }`}
              >
                {producto.colores.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Ficha técnica desplegable */}
        {verFicha && (
          <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-1.5">
            <p className="text-[11px] text-slate-600">{f.descripcion}</p>
            <dl>
              <Fila etiqueta="Clase dieléctrica" valor={f.claseDielectrica} />
              <Fila
                etiqueta="Tensión máx. uso"
                valor={f.tensionMaxUso != null ? `${Number(f.tensionMaxUso).toLocaleString("es-CL")} V` : null}
              />
              <Fila
                etiqueta="Tensión ensayo"
                valor={f.tensionEnsayo != null ? `${Number(f.tensionEnsayo).toLocaleString("es-CL")} V` : null}
              />
            </dl>
            {producto.fichaImagen && (
              <img
                src={producto.fichaImagen}
                alt="Ficha técnica"
                className="w-full rounded border border-slate-200 mt-1"
              />
            )}
          </div>
        )}
      </div>

      {/* Pie de tarjeta: Etiqueta "Bajo cotización" + Botones Cotizar y Ver */}
      <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
            Bajo cotización
          </span>
          <span className="text-[10px] font-semibold text-emerald-700">
            Disponible B2B
          </span>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={manejarAgregar}
            className={`flex-1 font-bold text-xs py-2 px-3 rounded-lg transition ${
              agregado
                ? "bg-green-600 text-white"
                : "bg-[#facc15] hover:bg-yellow-300 text-[#0b192c]"
            }`}
          >
            {agregado ? "\u{2713} Agregado" : "Cotizar"}
          </button>

          <button
            type="button"
            onClick={() => setVerFicha((v) => !v)}
            className="border border-slate-300 hover:border-[#0b192c] text-[#0b192c] font-bold text-xs py-2 px-3 rounded-lg transition"
          >
            {verFicha ? "Cerrar" : "Ver"}
          </button>
        </div>

        {esAdmin && (
          <div className="flex gap-2 pt-1">
            <Link
              to={`/admin/productos/editar/${producto.id}`}
              className="flex-1 text-center bg-slate-100 hover:bg-slate-200 text-[#0b192c] text-[11px] font-bold py-1.5 rounded-lg transition"
            >
              {"\u{270F}\u{FE0F}"} Editar
            </Link>
            {onEliminar && (
              <button
                type="button"
                onClick={() => onEliminar(producto.id)}
                title="Eliminar producto"
                className="bg-red-50 hover:bg-red-100 text-red-600 text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition"
              >
                {"\u{1F5D1}\u{FE0F}"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
