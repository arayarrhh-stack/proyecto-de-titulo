import { Link } from "react-router-dom";

export default function PiePagina() {
  return (
    <footer className="bg-[#0b192c] text-slate-300 mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-white font-extrabold text-xl">
            <span className="text-yellow-400 text-2xl">👷</span> ACOMSE
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Soluciones en Seguridad Industrial
          </p>
        </div>

        <div>
          <h4 className="text-white font-bold text-sm mb-3">Enlaces Rápidos</h4>
          <ul className="space-y-1.5 text-xs">
            <li><Link to="/" className="hover:text-yellow-400">Inicio</Link></li>
            <li><Link to="/catalogo" className="hover:text-yellow-400">Productos</Link></li>
            <li><Link to="/cotizacion" className="hover:text-yellow-400">Cotizaciones</Link></li>
            <li><Link to="/login" className="hover:text-yellow-400">Acceso Clientes</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-bold text-sm mb-3">Contacto</h4>
          <ul className="space-y-1.5 text-xs">
            <li>📞 +56 2 2345 6789</li>
            <li>✉️ ventas@acomse.cl</li>
            <li>📍 Av. Industrial 1234, Santiago, Chile</li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-bold text-sm mb-3">Síguenos</h4>
          <div className="flex gap-3 text-lg">
            <span className="cursor-pointer hover:text-yellow-400">in</span>
            <span className="cursor-pointer hover:text-yellow-400">f</span>
            <span className="cursor-pointer hover:text-yellow-400">📷</span>
            <span className="cursor-pointer hover:text-yellow-400">▶️</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap justify-between items-center text-xs text-slate-500">
        <span>© 2026 ACOMSE. Todos los derechos reservados.</span>
        <div className="flex gap-4">
          <span>Términos y Condiciones</span>
          <span>Política de Privacidad</span>
        </div>
      </div>
    </footer>
  );
}
