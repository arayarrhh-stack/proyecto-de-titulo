import { useState } from "react";
import { Link } from "react-router-dom";

const CLAVE_CATEGORIAS = "acomse_categorias_portada";

const CATEGORIAS_DEFECTO = [
  { id: "1", nombre: "Guantes dieléctricos", imagen: "/img/portada/cat-1.png" },
  { id: "2", nombre: "Calzado dieléctrico", imagen: "/img/portada/cat-2.png" },
  { id: "3", nombre: "Cascos y protección facial", imagen: "/img/portada/cat-3.png" },
  { id: "4", nombre: "Ropa de protección", imagen: "/img/portada/cat-4.png" },
  { id: "5", nombre: "Herramientas aisladas", imagen: "/img/portada/cat-5.png" },
  { id: "6", nombre: "Instrumentos de medición", imagen: "/img/portada/cat-6.png" },
];

function leerCategorias() {
  try {
    const raw = localStorage.getItem(CLAVE_CATEGORIAS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // usa defecto
  }
  return CATEGORIAS_DEFECTO;
}

export default function SeccionCategorias() {
  const [categorias] = useState(leerCategorias);

  return (
    <section id="categorias" className="max-w-[1500px] mx-auto px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-extrabold text-[#0b192c]">
            Nuestras Categorías
          </h2>
          <div className="h-1 w-14 bg-[#facc15] mt-1 rounded"></div>
        </div>
        <Link
          to="/catalogo"
          className="text-xs font-bold text-[#0b192c] hover:underline"
        >
          Ver todas las categorías →
        </Link>
      </div>

      <div className="grid gap-5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {categorias.map((c) => (
          <Link
            key={c.id}
            to={`/catalogo?categoria=${encodeURIComponent(c.id)}`}
            className="bg-slate-50 hover:bg-white border border-slate-200 hover:border-[#facc15] rounded-2xl p-4 shadow-sm hover:shadow-md transition flex flex-col items-center text-center gap-3"
          >
            <div className="w-full h-28 flex items-center justify-center overflow-hidden">
              <img
                src={c.imagen || "/img/portada/cat-1.png"}
                alt={c.nombre}
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <p className="text-xs font-extrabold text-[#0b192c] leading-snug">
              {c.nombre}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

