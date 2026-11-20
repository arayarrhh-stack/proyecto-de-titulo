import { NavLink, Outlet, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const ENLACES_CLIENTE = [
  { to: "/cliente/mis-cotizaciones", label: "Mis Cotizaciones" },
  { to: "/cliente/mis-pedidos", label: "Mis Pedidos" },
];

export default function ClienteLayout() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  function cerrarSesion() {
    logout();
    navigate("/");
  }

  const estiloItem = ({ isActive }) =>
    `block px-4 py-2.5 rounded-xl text-sm font-bold transition ${
      isActive
        ? "bg-[#facc15] text-[#0b192c] shadow-sm"
        : "text-slate-300 hover:bg-slate-800 hover:text-white"
    }`;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-100">
      {/* Barra lateral del Cliente */}
      <aside className="w-full md:w-64 bg-[#0b192c] text-white flex flex-col justify-between p-5 shrink-0">
        <div>
          <div className="pb-5 mb-5 border-b border-slate-700/80">
            <span className="text-[10px] uppercase tracking-widest font-bold text-[#facc15]">
              Portal B2B
            </span>
            <h2 className="text-lg font-extrabold mt-0.5">Mi Cuenta</h2>
            <p className="text-xs text-slate-400 truncate mt-0.5">
              {usuario?.nombre || "Cliente ACOMSE"}
            </p>
          </div>

          <nav className="space-y-1.5">
            {ENLACES_CLIENTE.map((item) => (
              <NavLink key={item.to} to={item.to} className={estiloItem}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="pt-6 mt-6 border-t border-slate-700/80 space-y-2">
          <Link
            to="/catalogo"
            className="block text-center text-xs font-bold text-[#0b192c] bg-[#facc15] hover:bg-yellow-300 rounded-xl py-2 transition"
          >
            + Explorar Catálogo
          </Link>
          <Link
            to="/"
            className="block text-center text-xs font-semibold text-slate-400 hover:text-white py-1.5 transition"
          >
            Volver a la portada
          </Link>
        </div>
      </aside>

      {/* Columna derecha */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
          <Link to="/" className="leading-none">
            <span className="text-xl font-black tracking-tight text-[#0b192c] block">
              ACOMSE
            </span>
            <span className="text-[10px] text-slate-500 font-medium">
              Soluciones en Seguridad Industrial
            </span>
          </Link>

          <span className="hidden sm:inline-block bg-slate-100 text-[#0b192c] border border-slate-200 text-xs font-bold px-4 py-1.5 rounded-full">
            Panel de Cliente
          </span>

          <div className="flex items-center gap-3 text-sm">
            <span className="font-semibold text-slate-800 hidden sm:inline">
              {usuario?.nombre}
            </span>
            <button
              onClick={cerrarSesion}
              className="text-xs font-semibold text-red-600 border border-red-200 bg-red-50 px-3 py-1.5 rounded-full hover:bg-red-100 transition"
            >
              Salir
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8 overflow-x-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
