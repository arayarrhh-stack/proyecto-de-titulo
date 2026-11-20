import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useCotizacion } from "../../context/CotizacionContext";
import { listarProductos, leerProductosLocales } from "../../services/catalogo";

function Navbar() {
  const { usuario, logout } = useAuth();
  const ctxCot = useCotizacion();
  const navigate = useNavigate();
  const location = useLocation();

  const [busquedaRapida, setBusquedaRapida] = useState("");
  const [catalogoCache, setCatalogoCache] = useState(() => leerProductosLocales());
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const contenedorBuscadorRef = useRef(null);

  const esAdmin = usuario?.rol === "admin";
  const esCliente = usuario?.rol === "cliente";

  const itemsCarro = ctxCot.items || ctxCot.carrito || ctxCot.productos || [];
  const totalItems = itemsCarro.reduce((acc, it) => acc + (it.cantidad || 1), 0);

  const claseActiva =
    "bg-[#facc15] text-slate-900 font-bold px-4 py-1.5 rounded-full transition";
  const claseInactiva =
    "text-slate-800 hover:text-blue-900 font-semibold px-2.5 py-1.5 transition";

  const estiloEnlace = ({ isActive }) => (isActive ? claseActiva : claseInactiva);

  const inicioActivo = location.pathname === "/" && !location.hash;
  const categoriasActivo = location.pathname === "/" && location.hash === "#categorias";
  const nosotrosActivo = location.pathname === "/" && location.hash === "#nosotros";

  // Carga productos para sugerencias rápidas con miniatura
  useEffect(() => {
    listarProductos({ pagina: 1 })
      .then((r) => {
        if (Array.isArray(r?.productos) && r.productos.length > 0) {
          setCatalogoCache(r.productos);
        }
      })
      .catch(() => {});
  }, []);

  // Cierra el menú de sugerencias al hacer clic fuera
  useEffect(() => {
    function alClickFuera(e) {
      if (
        contenedorBuscadorRef.current &&
        !contenedorBuscadorRef.current.contains(e.target)
      ) {
        setMostrarSugerencias(false);
      }
    }
    document.addEventListener("mousedown", alClickFuera);
    return () => document.removeEventListener("mousedown", alClickFuera);
  }, []);

  const termino = busquedaRapida.trim().toLowerCase();
  const sugerencias = termino
    ? catalogoCache
        .filter((p) =>
          [p.nombre, p.codigo, p.categoria, p.ficha?.descripcion]
            .filter(Boolean)
            .some((campo) => String(campo).toLowerCase().includes(termino))
        )
        .slice(0, 5)
    : [];

  function cerrarSesion() {
    logout();
    navigate("/");
  }

  function buscarDesdeMenu(e) {
    e.preventDefault();
    const q = busquedaRapida.trim();
    setMostrarSugerencias(false);
    setBusquedaRapida(""); // Limpia automáticamente al pulsar Enter o enviar
    navigate(q ? `/catalogo?busqueda=${encodeURIComponent(q)}` : "/catalogo");
  }

  function seleccionarSugerencia(producto) {
    setMostrarSugerencias(false);
    setBusquedaRapida("");
    navigate(`/catalogo?busqueda=${encodeURIComponent(producto.nombre)}`);
  }

  function irAInicio() {
    navigate("/");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function irASeccion(idSeccion) {
    const yaEnPortada = location.pathname === "/";
    navigate(`/#${idSeccion}`);
    const hacerScroll = () => {
      const elemento = document.getElementById(idSeccion);
      if (elemento) elemento.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    if (yaEnPortada) hacerScroll();
    else setTimeout(hacerScroll, 150);
  }

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      <nav className="max-w-[1500px] mx-auto min-h-20 px-6 py-2 flex flex-wrap items-center justify-between gap-4">
        <Link to={esAdmin ? "/admin" : "/"} className="flex items-center gap-2.5">
          <img
            src="/img/portada/logo-casco.png"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
            alt="Logo ACOMSE"
            className="h-11 w-auto object-contain"
          />
          <div className="leading-none">
            <span className="text-2xl font-black tracking-tight text-[#0b192c] block">
              ACOMSE
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              Soluciones en Seguridad Industrial
            </span>
          </div>
        </Link>

        <div className="flex flex-wrap items-center gap-1 lg:gap-2 text-sm">
          {esAdmin ? (
            <NavLink
              to="/admin"
              className="bg-[#0b192c] text-[#facc15] font-bold px-5 py-2 rounded-full shadow-sm hover:bg-slate-800 transition"
            >
              Panel de Administrador
            </NavLink>
          ) : (
            <>
              <button type="button" onClick={irAInicio} className={inicioActivo ? claseActiva : claseInactiva}>
                Inicio
              </button>
              <NavLink to="/catalogo" className={estiloEnlace}>
                Productos
              </NavLink>
              <button type="button" onClick={() => irASeccion("categorias")} className={categoriasActivo ? claseActiva : claseInactiva}>
                Categorías
              </button>
              <button type="button" onClick={() => irASeccion("nosotros")} className={nosotrosActivo ? claseActiva : claseInactiva}>
                Nosotros
              </button>

              {esCliente && (
                <NavLink
                  to="/cliente/mis-cotizaciones"
                  className="bg-[#0b192c] text-[#facc15] font-bold px-4 py-1.5 rounded-full shadow-sm hover:bg-slate-800 transition"
                >
                  Mi Panel
                </NavLink>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {!esAdmin && (
            <>
              <div ref={contenedorBuscadorRef} className="relative hidden lg:block">
                <form onSubmit={buscarDesdeMenu} className="relative">
                  <input
                    type="search"
                    value={busquedaRapida}
                    onFocus={() => setMostrarSugerencias(true)}
                    onChange={(e) => {
                      setBusquedaRapida(e.target.value);
                      setMostrarSugerencias(true);
                    }}
                    placeholder="Buscar productos..."
                    className="bg-slate-100 border border-slate-200 rounded-full pl-4 pr-9 py-2 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                  <button
                    type="submit"
                    aria-label="Buscar"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-900"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.3-4.3" />
                    </svg>
                  </button>
                </form>

                {/* Vista previa con miniatura al escribir */}
                {mostrarSugerencias && termino.length > 0 && (
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-50">
                    <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Coincidencias rápidas
                      </span>
                      <span className="text-[11px] font-bold text-[#0b192c]">
                        {sugerencias.length}
                      </span>
                    </div>

                    {sugerencias.length === 0 ? (
                      <div className="p-4 text-xs text-slate-500 text-center">
                        No hay coincidencias para "{busquedaRapida}".
                      </div>
                    ) : (
                      <ul className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                        {sugerencias.map((prod) => (
                          <li key={prod.id}>
                            <button
                              type="button"
                              onClick={() => seleccionarSugerencia(prod)}
                              className="w-full p-2.5 hover:bg-yellow-50/70 transition flex items-center gap-3 text-left"
                            >
                              <div className="w-11 h-11 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                                {prod.imagen ? (
                                  <img
                                    src={prod.imagen}
                                    alt={prod.nombre}
                                    className="w-full h-full object-contain p-1"
                                  />
                                ) : (
                                  <span className="text-base">{"\u{1F9E4}"}</span>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-extrabold text-[#0b192c] truncate">
                                  {prod.nombre}
                                </p>
                                <p className="text-[10px] text-slate-500 truncate">
                                  {prod.codigo ? `SKU: ${prod.codigo} · ` : ""}
                                  {prod.categoria || "Protección Eléctrica"}
                                </p>
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    <button
                      type="button"
                      onClick={buscarDesdeMenu}
                      className="w-full py-2 bg-[#0b192c] text-[#facc15] text-xs font-bold hover:bg-slate-800 transition"
                    >
                      Ver todos los resultados (Enter) →
                    </button>
                  </div>
                )}
              </div>

              <Link
                to={esCliente ? "/cliente/cotizacion" : "/cotizacion"}
                className="inline-flex items-center gap-2 bg-[#facc15] hover:bg-yellow-300 text-[#0b192c] font-extrabold text-xs px-4 py-2.5 rounded-lg shadow-sm transition"
              >
                <span>{"\u{1F4C4}"}</span>
                <span>Carro Cotizador</span>
                {totalItems > 0 && (
                  <span className="bg-[#0b192c] text-[#facc15] text-[10px] font-black px-1.5 py-0.5 rounded-full">
                    {totalItems}
                  </span>
                )}
              </Link>
            </>
          )}

          {usuario ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-slate-800 hidden sm:inline">
                {usuario.nombre}
              </span>
              <button
                onClick={cerrarSesion}
                className="text-xs font-semibold text-red-600 border border-red-200 bg-red-50 px-3 py-1.5 rounded-full hover:bg-red-100 transition"
              >
                Salir
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              title="Iniciar sesión / Registrarse"
              className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-[#0b192c] flex items-center justify-center border border-slate-200 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}

export default Navbar;



