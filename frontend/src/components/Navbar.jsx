import { Link, useNavigate } from "react-router-dom";
import { useCotizacion } from "../context/CotizacionContext";
import { useAuth } from "../context/AuthContext";

function Navbar() {
  const { totalProductos } = useCotizacion();
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  function cerrarSesion() {
    logout();
    navigate("/");
  }

  const enlace = "hover:text-blue-600 transition";

  return (
    <nav className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between">
      <Link to="/" className="text-xl font-bold text-blue-600">
        ACOMSE
      </Link>

      <div className="flex items-center gap-6 text-sm font-medium text-slate-600">
        <Link to="/" className={enlace}>Catálogo</Link>

        {usuario?.rol !== "admin" && (
          <Link to="/cotizacion" className={enlace}>
            Cotización ({totalProductos})
          </Link>
          
        )}

        {usuario?.rol === "cliente" && (
          <>
            <Link to="/mis-cotizaciones" className={enlace}>Mis cotizaciones</Link>
            <Link to="/mis-pedidos" className={enlace}>Mis pedidos</Link>
          </>
        )}

        {usuario?.rol === "admin" && (
          <>
            <Link to="/admin/productos/nuevo" className={enlace}>Agregar producto</Link>
            <Link to="/admin/cotizaciones" className={enlace}>Solicitudes</Link>
            <Link to="/admin/pedidos" className={enlace}>Pedidos</Link>
          </>
        )}

        {usuario ? (
          <>
            <span className="text-slate-800">{usuario.nombre}</span>
            <button onClick={cerrarSesion} className="text-red-600 hover:underline">
              Cerrar sesión
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className={enlace}>Iniciar sesión</Link>
            <Link
              to="/registro"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
            >
              Registrarse
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;