import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import ProductoCard from "../../components/catalogo/ProductoCard";
import { listarProductos, listarCategorias, eliminarProducto } from "../../services/catalogo";
import { useAuth } from "../../context/AuthContext";
import { useCotizacion } from "../../context/CotizacionContext";

const CLAVE_CATEGORIAS = "acomse_categorias_portada";

const CATEGORIAS_DEFECTO = [
  { id: "1", nombre: "Guantes dieléctricos" },
  { id: "2", nombre: "Calzado dieléctrico" },
  { id: "3", nombre: "Cascos y protección facial" },
  { id: "4", nombre: "Ropa de protección" },
  { id: "5", nombre: "Herramientas aisladas" },
  { id: "6", nombre: "Instrumentos de medición" },
];

function leerCategoriasLocales() {
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

function combinarCategorias(base, extras) {
  const mapa = new Map();
  const idsUsados = new Set();
  [...base, ...extras].forEach((c) => {
    const nombre = (c?.nombre || "").trim();
    if (!nombre) return;
    const clave = nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
    const id = String(c.id || nombre);
    // Omite repetidos por nombre y también los que chocan por id
    if (mapa.has(clave) || idsUsados.has(id)) return;
    idsUsados.add(id);
    mapa.set(clave, { id, nombre });
  });
  return Array.from(mapa.values());
}

export default function Catalogo() {
  const { usuario } = useAuth();
  const ctxCotizacion = useCotizacion();
  const esAdmin = usuario?.rol === "admin";
  const itemsCarro = ctxCotizacion.items || ctxCotizacion.carrito || ctxCotizacion.productos || [];
  const totalItemsCarro = itemsCarro.reduce((acc, it) => acc + (it.cantidad || 1), 0);

  const [searchParams, setSearchParams] = useSearchParams();
  const parametroBusqueda = searchParams.get("busqueda") || "";
  const parametroCategoria = searchParams.get("categoria") || "";

  const [texto, setTexto] = useState("");
  const [busqueda, setBusqueda] = useState(parametroBusqueda);
  const [categoria, setCategoria] = useState(parametroCategoria);
  const [orden, setOrden] = useState("recomendado");
  const [categorias, setCategorias] = useState(leerCategoriasLocales);
  const [todosProductos, setTodosProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [intento, setIntento] = useState(0);
  const ultima = useRef(0);

  // Combina las categorías del backend con las creadas localmente en el panel de admin
  useEffect(() => {
    const locales = leerCategoriasLocales();
    listarCategorias()
      .then((remotas) => {
        if (Array.isArray(remotas) && remotas.length > 0) {
          setCategorias(combinarCategorias(remotas, locales));
        } else {
          setCategorias(locales);
        }
      })
      .catch(() => setCategorias(locales));
  }, []);

  useEffect(() => {
    setBusqueda(parametroBusqueda);
    setCategoria(parametroCategoria);
  }, [parametroBusqueda, parametroCategoria]);

  useEffect(() => {
    const id = ++ultima.current;
    setCargando(true);
    listarProductos({ pagina: 1 })
      .then((r) => {
        if (id === ultima.current) setTodosProductos(r.productos || []);
      })
      .catch(() => {
        if (id === ultima.current) setTodosProductos([]);
      })
      .finally(() => {
        if (id === ultima.current) setCargando(false);
      });
  }, [intento]);

  async function manejarEliminar(idProducto) {
    await eliminarProducto(idProducto);
    setIntento((n) => n + 1);
  }

  function enviarBusquedaCatalogo(e) {
    e.preventDefault();
    const limpio = texto.trim();
    setBusqueda(limpio);
    setTexto("");
    const next = new URLSearchParams(searchParams);
    if (limpio) next.set("busqueda", limpio);
    else next.delete("busqueda");
    setSearchParams(next);
  }

  function limpiarFiltros() {
    setTexto("");
    setBusqueda("");
    setCategoria("");
    setSearchParams({});
  }

  // Asegura que cualquier categoría presente en los productos aparezca en las píldoras
  const categoriasConConteo = useMemo(() => {
    const desdeProductos = todosProductos
      .filter((p) => p.categoria)
      .map((p) => ({ id: String(p.categoriaId || p.categoria), nombre: p.categoria }));

    const todas = combinarCategorias(categorias, desdeProductos);

    return todas.map((c) => {
      const cantidad = todosProductos.filter(
        (p) =>
          String(p.categoriaId) === String(c.id) ||
          (p.categoria || "").trim().toLowerCase() === c.nombre.trim().toLowerCase()
      ).length;
      return { ...c, cantidad };
    });
  }, [categorias, todosProductos]);

  const vistaPreviaEscritura = useMemo(() => {
    const q = texto.trim().toLowerCase();
    if (!q) return [];
    return todosProductos
      .filter((p) =>
        [p.nombre, p.codigo, p.categoria, p.ficha?.descripcion]
          .filter(Boolean)
          .some((campo) => String(campo).toLowerCase().includes(q))
      )
      .slice(0, 4);
  }, [todosProductos, texto]);

  const productosVisibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const catActivaObj = categoriasConConteo.find(
      (c) => String(c.id) === String(categoria) || c.nombre.toLowerCase() === String(categoria).toLowerCase()
    );

    const filtrados = todosProductos.filter((p) => {
      const coincideTexto =
        !q ||
        [p.nombre, p.codigo, p.categoria, p.ficha?.descripcion]
          .filter(Boolean)
          .some((campo) => String(campo).toLowerCase().includes(q));

      const coincideCat =
        !categoria ||
        String(p.categoriaId) === String(categoria) ||
        (p.categoria || "").trim().toLowerCase() === String(categoria).trim().toLowerCase() ||
        (catActivaObj &&
          (p.categoria || "").trim().toLowerCase() === catActivaObj.nombre.trim().toLowerCase());

      return coincideTexto && coincideCat;
    });

    if (orden === "az") {
      return [...filtrados].sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
    }
    if (orden === "za") {
      return [...filtrados].sort((a, b) => (b.nombre || "").localeCompare(a.nombre || ""));
    }
    return filtrados;
  }, [todosProductos, busqueda, categoria, orden, categoriasConConteo]);

  const nombreCategoriaActiva =
    categoriasConConteo.find((c) => String(c.id) === String(categoria))?.nombre ||
    "Protección Eléctrica";

  return (
    <div className="bg-slate-50 pb-16 min-h-screen">
      {/* 1. Franja de beneficios B2B */}
      <div className="bg-[#0b192c] text-slate-200 text-xs border-b-2 border-[#facc15]">
        <div className="max-w-[1500px] mx-auto px-6 py-2.5 flex flex-wrap items-center justify-center md:justify-between gap-4">
          <span>{"\u{2713}"} Venta personalizada a empresas B2B</span>
          <span>{"\u{2713}"} Soporte técnico especializado</span>
          <span>{"\u{2713}"} Cotizaciones con asesoría</span>
          <span>{"\u{2713}"} Despacho a todo Chile</span>
        </div>
      </div>

      <main className="max-w-[1500px] mx-auto px-6 pt-6">
        {/* 2. Migas de pan */}
        <nav className="text-xs text-slate-500 mb-3 flex items-center gap-1.5">
          <Link to="/" className="hover:text-[#0b192c] hover:underline">Inicio</Link>
          <span>/</span>
          <button
            type="button"
            onClick={limpiarFiltros}
            className="hover:text-[#0b192c] hover:underline"
          >
            Catálogo
          </button>
          {categoria && (
            <>
              <span>/</span>
              <span className="font-semibold text-[#0b192c]">{nombreCategoriaActiva}</span>
            </>
          )}
        </nav>

        {/* 3. Encabezado */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0b192c]">
              {nombreCategoriaActiva}
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Soluciones certificadas de protección eléctrica industrial: equipamiento dieléctrico, calzado, protección facial y herramientas aisladas.
            </p>
          </div>

          {esAdmin && (
            <Link
              to="/admin/productos/nuevo"
              className="bg-[#facc15] hover:bg-yellow-300 text-[#0b192c] text-xs font-extrabold px-5 py-2.5 rounded-lg shadow-sm transition"
            >
              + Agregar producto
            </Link>
          )}
        </div>

        {/* 4. Píldoras de subcategorías con contador */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            type="button"
            onClick={() => setCategoria("")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition flex items-center gap-2 ${
              !categoria
                ? "bg-[#0b192c] text-[#facc15] border-[#0b192c]"
                : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"
            }`}
          >
            <span>Todas</span>
            <span className="bg-slate-200/80 text-slate-800 px-1.5 py-0.2 rounded-full text-[10px]">
              {todosProductos.length}
            </span>
          </button>

          {categoriasConConteo.map((c) => {
            const activa = String(categoria) === String(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoria(String(c.id))}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition flex items-center gap-2 ${
                  activa
                    ? "bg-[#0b192c] text-[#facc15] border-[#0b192c]"
                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"
                }`}
              >
                <span>{c.nombre}</span>
                <span className="bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-full text-[10px]">
                  {c.cantidad}
                </span>
              </button>
            );
          })}
        </div>

        {/* 5. Barra de búsqueda y ordenamiento */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 mb-6 space-y-3 shadow-sm">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <form onSubmit={enviarBusquedaCatalogo} className="flex items-center gap-2 flex-1">
              <input
                type="search"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Escribe nombre, SKU o categoría y pulsa Enter..."
                className="w-full sm:max-w-sm border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#facc15]"
              />
              {texto && (
                <button
                  type="submit"
                  className="bg-[#0b192c] text-[#facc15] text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-slate-800 transition"
                >
                  Buscar
                </button>
              )}
              {(busqueda || categoria || texto) && (
                <button
                  type="button"
                  onClick={limpiarFiltros}
                  className="text-xs font-bold text-red-600 hover:underline whitespace-nowrap px-1"
                >
                  Limpiar
                </button>
              )}
            </form>

            <div className="flex items-center justify-between sm:justify-end gap-4">
              {busqueda && (
                <span className="text-xs bg-yellow-100 text-yellow-900 font-bold px-2.5 py-1 rounded-full">
                  Filtro: "{busqueda}"
                </span>
              )}

              <span className="text-xs font-bold text-slate-500">
                {productosVisibles.length}{" "}
                {productosVisibles.length === 1 ? "producto" : "productos"}
              </span>

              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500 font-semibold">Ordenar:</label>
                <select
                  value={orden}
                  onChange={(e) => setOrden(e.target.value)}
                  className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#facc15]"
                >
                  <option value="recomendado">Recomendado</option>
                  <option value="az">Nombre A–Z</option>
                  <option value="za">Nombre Z–A</option>
                </select>
              </div>
            </div>
          </div>

          {texto.trim().length > 0 && (
            <div className="pt-2.5 border-t border-slate-100">
              <p className="text-[11px] font-bold text-slate-500 mb-2">
                Referencia visual para "{texto.trim()}":
              </p>
              {vistaPreviaEscritura.length === 0 ? (
                <p className="text-xs text-slate-400">
                  Sin referencia visual para ese término.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2.5">
                  {vistaPreviaEscritura.map((ref) => (
                    <button
                      key={ref.id}
                      type="button"
                      onClick={() => {
                        setBusqueda(ref.nombre);
                        setTexto("");
                      }}
                      className="flex items-center gap-2.5 bg-slate-50 hover:bg-yellow-50 border border-slate-200 rounded-xl px-3 py-1.5 text-left transition"
                    >
                      <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                        {ref.imagen ? (
                          <img
                            src={ref.imagen}
                            alt={ref.nombre}
                            className="w-full h-full object-contain p-0.5"
                          />
                        ) : (
                          <span>{"\u{1F9E4}"}</span>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#0b192c] leading-tight">
                          {ref.nombre}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {ref.codigo || "Sin SKU"} · Clic para filtrar
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 6. Grilla de productos */}
        {cargando ? (
          <p className="text-slate-500 text-sm py-12 text-center">Cargando catálogo…</p>
        ) : productosVisibles.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
            <p className="text-slate-700 font-bold">
              No se encontraron productos que coincidan con la búsqueda.
            </p>
            <button
              type="button"
              onClick={limpiarFiltros}
              className="bg-[#0b192c] text-[#facc15] text-xs font-bold px-4 py-2 rounded-full"
            >
              Mostrar todos los productos
            </button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {productosVisibles.map((p) => (
              <ProductoCard key={p.id} producto={p} onEliminar={manejarEliminar} />
            ))}
          </div>
        )}
      </main>

      {/* 7. Barra flotante de Carro Cotizador */}
      {!esAdmin && totalItemsCarro > 0 && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 bg-[#0b192c] text-white px-5 py-3 rounded-full shadow-xl border border-[#facc15]/40 flex items-center gap-4">
          <span className="text-xs font-bold">
            Cotización: <span className="text-[#facc15]">{totalItemsCarro}</span>{" "}
            {totalItemsCarro === 1 ? "ítem" : "ítems"}
          </span>
          <Link
            to="/cotizacion"
            className="bg-[#facc15] hover:bg-yellow-300 text-[#0b192c] text-xs font-extrabold px-4 py-1.5 rounded-full transition"
          >
            Ir a cotización →
          </Link>
        </div>
      )}
    </div>
  );
}


