import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  listarProductosAdmin,
  listarCategorias,
  eliminarProducto,
} from "../../services/catalogo";

const ESTADOS = {
  borrador: { texto: "Borrador", clase: "bg-slate-200 text-slate-700" },
  revision: { texto: "En revisión", clase: "bg-yellow-100 text-yellow-800" },
  validada: { texto: "Validada", clase: "bg-green-100 text-green-800" },
  vencida: { texto: "Vencida", clase: "bg-red-100 text-red-800" },
};

const FILTROS = [
  { clave: "todos", texto: "Todos" },
  { clave: "borrador", texto: "Borrador" },
  { clave: "validada", texto: "Validada" },
  { clave: "vencida", texto: "Vencida" },
];

function normalizar(texto) {
  return String(texto ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export default function AdminProductos() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState({});
  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("todos");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  function recargar() {
    setCargando(true);
    setError("");
    Promise.all([listarProductosAdmin(), listarCategorias()])
      .then(([lista, cats]) => {
        setCategorias(Object.fromEntries(cats.map((c) => [c.id, c.nombre])));
        // Los productos "eliminados" se renombran con el prefijo DEL- y se ocultan
        setProductos(lista.filter((p) => !String(p.codigo).startsWith("DEL-")));
      })
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }

  useEffect(() => {
    recargar();
  }, []);

  async function manejarEliminar(id, nombre) {
    if (!window.confirm(`¿Eliminar "${nombre}" del catálogo?`)) return;
    try {
      await eliminarProducto(id);
      setProductos((prev) => prev.filter((p) => String(p.id) !== String(id)));
    } catch (e) {
      setError(e.message);
    }
  }

  const q = normalizar(busqueda.trim());
  const filtrados = productos.filter((p) => {
    if (estadoFiltro !== "todos" && p.estadoValidacion !== estadoFiltro) return false;
    if (!q) return true;
    return (
      normalizar(p.nombre).includes(q) ||
      normalizar(p.codigo).includes(q) ||
      normalizar(categorias[p.categoriaId]).includes(q)
    );
  });

  const sinValidar = productos.filter((p) => p.estadoValidacion !== "validada").length;

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0b192c]">
            Gestionar Productos del Catálogo
          </h1>
          <div className="h-1 w-14 bg-[#facc15] mt-1 rounded"></div>
          <p className="text-sm text-slate-500 mt-2">
            {sinValidar === 0
              ? "Todas las fichas están validadas."
              : `${sinValidar} ${sinValidar === 1 ? "producto espera" : "productos esperan"} la validación de la validadora técnica y no se ven en el catálogo.`}
          </p>
        </div>

        <Link
          to="/admin/productos/nuevo"
          className="bg-[#facc15] hover:bg-yellow-300 text-[#0b192c] text-xs font-extrabold px-5 py-2.5 rounded-full shadow-sm transition"
        >
          + Agregar Producto
        </Link>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, SKU o categoría..."
            className="w-full sm:max-w-sm border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#facc15]"
          />
          <span className="text-xs font-bold text-slate-500">
            {filtrados.length} {filtrados.length === 1 ? "producto" : "productos"}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTROS.map((f) => (
            <button
              key={f.clave}
              type="button"
              onClick={() => setEstadoFiltro(f.clave)}
              className={`text-xs font-bold px-3.5 py-1.5 rounded-full transition ${
                estadoFiltro === f.clave
                  ? "bg-[#0b192c] text-[#facc15]"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {f.texto}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
          {error}
        </p>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {filtrados.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500 space-y-3">
            <p>{cargando ? "Cargando productos..." : "No hay productos que mostrar."}</p>
            {!cargando && productos.length === 0 && (
              <Link
                to="/admin/productos/nuevo"
                className="inline-block bg-[#0b192c] text-[#facc15] text-xs font-bold px-4 py-2 rounded-full"
              >
                Crear primer producto
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Producto</th>
                  <th className="px-5 py-3">SKU</th>
                  <th className="px-5 py-3">Categoría</th>
                  <th className="px-5 py-3">Clase</th>
                  <th className="px-5 py-3">Ficha</th>
                  <th className="px-5 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtrados.map((p) => {
                  const estado = ESTADOS[p.estadoValidacion] ?? ESTADOS.borrador;
                  const visible = p.activo && p.estadoValidacion === "validada";
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                            {p.imagen ? (
                              <img
                                src={p.imagen}
                                alt={p.nombre}
                                className="w-full h-full object-contain p-1"
                              />
                            ) : (
                              <span className="text-lg">{"\u{1F9E4}"}</span>
                            )}
                          </div>
                          <span className="font-bold text-[#0b192c]">{p.nombre}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-slate-600">
                        {p.codigo || "S/C"}
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        {categorias[p.categoriaId] || "Sin categoría"}
                      </td>
                      <td className="px-5 py-3">
                        {p.ficha?.claseDielectrica ? (
                          <span className="bg-yellow-100 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded">
                            Clase {p.ficha.claseDielectrica}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${estado.clase}`}>
                          {estado.texto}
                        </span>
                        <p className={`text-[11px] mt-1 ${visible ? "text-green-700" : "text-slate-400"}`}>
                          {visible ? "Visible en el catálogo" : "No visible en el catálogo"}
                        </p>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Link
                            to={`/admin/productos/editar/${p.id}`}
                            className="bg-[#0b192c] hover:bg-slate-800 text-[#facc15] text-xs font-bold px-3.5 py-1.5 rounded-lg transition"
                          >
                            {"\u{270F}\u{FE0F}"} Editar
                          </Link>
                          <button
                            type="button"
                            onClick={() => manejarEliminar(p.id, p.nombre)}
                            className="bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold px-3 py-1.5 rounded-lg transition"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-500">
        Si editas la normativa, la clase dieléctrica o las tensiones de un producto validado, su
        ficha vuelve a Borrador y la validadora debe aprobarla de nuevo (RF-10).
      </p>
    </div>
  );
}