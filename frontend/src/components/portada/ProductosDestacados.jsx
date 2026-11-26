import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { listarProductos } from "../../services/catalogo";
import { useCotizacion } from "../../context/CotizacionContext";
import { useAuth } from "../../context/AuthContext";

export default function ProductosDestacados() {
  const [productos, setProductos] = useState([]);
  const { agregar } = useCotizacion();
  const { usuario } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    listarProductos({ destacado: true })
      .then((r) => setProductos(r.productos.slice(0, 8)))
      .catch(() => {});
  }, []);

  function cotizarYIrAlCarrito(producto) {
    agregar(producto, {
      talla: producto.tallas?.[0] || "",
      color: producto.colores?.[0] || "",
    });
    const destino = usuario?.rol === "cliente" ? "/cliente/cotizacion" : "/cotizacion";
    navigate(destino);
  }

  if (productos.length === 0) return null;

  return (
    <section className="max-w-[1500px] mx-auto px-6 py-12">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-extrabold text-[#0b192c]">
            Productos Destacados
          </h2>
          <div className="h-1 w-14 bg-[#facc15] mt-1 rounded"></div>
        </div>
        <Link
          to="/catalogo"
          className="text-xs font-bold text-[#0b192c] hover:underline"
        >
          Ver todo el catálogo →
        </Link>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {productos.map((p) => (
          <div
            key={p.id}
            className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
          >
            <div>
              <div className="relative h-48 bg-slate-50 rounded-xl flex items-center justify-center p-4 mb-4 overflow-hidden">
                {p.codigo && (
                  <span className="absolute top-3 left-3 bg-[#0b192c] text-[#facc15] text-[11px] font-extrabold px-2.5 py-0.5 rounded-full">
                    {p.codigo}
                  </span>
                )}
                {p.imagen ? (
                  <img
                    src={p.imagen}
                    alt={p.nombre}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <span className="text-4xl text-slate-300">{"\u{1F9E4}"}</span>
                )}
              </div>

              <h3 className="font-extrabold text-[#0b192c] text-base leading-snug">
                {p.nombre}
              </h3>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                {p.ficha?.descripcion || "Protección eléctrica certificada"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => cotizarYIrAlCarrito(p)}
              className="mt-5 w-full border-2 border-[#facc15] hover:bg-[#facc15] text-[#0b192c] font-bold text-xs py-2.5 px-4 rounded-full transition flex items-center justify-center gap-2"
            >
              <span>{"\u{1F6D2}"}</span> Cotizar producto
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

