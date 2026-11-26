import { useEffect, useState } from "react";
import { listarClientes } from "../../services/clientes";
import { Link } from "react-router-dom";

function Tarjeta({ titulo, valor, detalle }) {
  return (
    <div className="bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-[#facc15] transition flex flex-col justify-between">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{titulo}</p>
      <p className="text-3xl font-black text-[#0b192c] my-2">{valor}</p>
      <p className="text-xs text-slate-500">{detalle}</p>
    </div>
  );
}

export default function AdminClientes() {
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setCargando(true);
    const espera = setTimeout(() => {
      listarClientes(busqueda)
        .then((datos) => {
          setClientes(datos);
          setError("");
        })
        .catch((e) => setError(e.message))
        .finally(() => setCargando(false));
    }, 300);
    return () => clearTimeout(espera);
  }, [busqueda]);

  const verificadas = clientes.filter((c) => c.correo_verificado).length;
  const totalSolicitudes = clientes.reduce((suma, c) => suma + c.total_solicitudes, 0);

  return (
    <div className="max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0b192c]">Clientes</h1>
        <div className="h-1 w-14 bg-[#facc15] mt-1 rounded"></div>
        <p className="text-sm text-slate-500 mt-3">
          Empresas y contactos registrados en la plataforma.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <Tarjeta
          titulo="Clientes"
          valor={clientes.length}
          detalle={busqueda ? "Que coinciden con la búsqueda" : "Registrados en la plataforma"}
        />
        <Tarjeta
          titulo="Cuentas verificadas"
          valor={verificadas}
          detalle={`${clientes.length - verificadas} pendientes de verificar`}
        />
        <Tarjeta
          titulo="Solicitudes"
          valor={totalSolicitudes}
          detalle="Enviadas por estos clientes"
        />
      </div>

      <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-extrabold text-[#0b192c] text-base">Listado de clientes</h2>
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por empresa o RUT…"
            className="w-full sm:w-72 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#facc15]"
          />
        </div>

        {error && <p className="px-6 py-4 text-sm text-red-700">{error}</p>}

        {cargando ? (
          <div className="p-6 text-sm text-slate-500">Cargando clientes…</div>
        ) : clientes.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">No se encontraron clientes.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-6 py-3">Empresa</th>
                  <th className="px-6 py-3">RUT</th>
                  <th className="px-6 py-3">Contacto</th>
                  <th className="px-6 py-3">Teléfono</th>
                  <th className="px-6 py-3 text-center">Solicitudes</th>
                  <th className="px-6 py-3">Cuenta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clientes.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-bold">
                      <Link to={`/admin/clientes/${c.id}`} className="text-[#0b192c] hover:text-blue-700 hover:underline">
                        {c.razon_social || c.contacto}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-slate-600">{c.rut || "—"}</td>
                    <td className="px-6 py-3 text-slate-700">
                      {c.contacto}
                      <span className="block text-xs text-slate-400">{c.correo}</span>
                    </td>
                    <td className="px-6 py-3 text-slate-600">{c.telefono || "—"}</td>
                    <td className="px-6 py-3 text-center font-bold text-[#0b192c]">
                      {c.total_solicitudes}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          c.correo_verificado
                            ? "bg-green-100 text-green-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {c.correo_verificado ? "Verificada" : "Sin verificar"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}