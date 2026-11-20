import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listarSolicitudes, listarPedidos } from "../../services/solicitudes";
import { listarProductos, leerProductosLocales } from "../../services/catalogo";
import { listarMensajes } from "../../services/mensajes";
import { estadoDesdeBackend, coloresEstado } from "../../utils/estados";

function TarjetaKpi({ titulo, valor, detalle, to, destacado = false }) {
  return (
    <Link
      to={to}
      className={`bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-[#facc15] transition flex flex-col justify-between ${
        destacado ? "border-[#facc15] ring-1 ring-[#facc15]/40" : "border-slate-200"
      }`}
    >
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
        {titulo}
      </p>
      <p className="text-3xl font-black text-[#0b192c] my-2">{valor}</p>
      <p className="text-xs text-slate-500">{detalle}</p>
    </Link>
  );
}

export default function DashboardAdmin() {
  // Inicializamos con datos inmediatos (0 ms) para que nunca se quede pegado en "..."
  const [solicitudes, setSolicitudes] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [totalProductos, setTotalProductos] = useState(() => leerProductosLocales().length);
  const [mensajesNoLeidos] = useState(
    () => listarMensajes().filter((m) => !m.leido).length
  );

  // Cada consulta se actualiza de forma independiente en segundo plano
  useEffect(() => {
    listarSolicitudes()
      .then((sols) => setSolicitudes(Array.isArray(sols) ? sols : []))
      .catch(() => {});

    listarPedidos()
      .then((peds) => setPedidos(Array.isArray(peds) ? peds : []))
      .catch(() => {});

    listarProductos({ pagina: 1 })
      .then((prods) =>
        setTotalProductos(prods.total ?? prods.productos?.length ?? leerProductosLocales().length)
      )
      .catch(() => {});
  }, []);

  const pendientes = solicitudes.filter(
    (s) => s.estado === "recibida" || s.estado === "Recibida"
  ).length;

  const ultimasSolicitudes = solicitudes.slice(0, 5);

  return (
    <div className="max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0b192c]">
          Resumen de Administración
        </h1>
        <div className="h-1 w-14 bg-[#facc15] mt-1 rounded"></div>
      </div>

      {/* 5 Tarjetas de métricas instantáneas */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
        <TarjetaKpi
          titulo="Solicitudes Totales"
          valor={solicitudes.length}
          detalle="Ver historial completo"
          to="/admin/cotizaciones"
        />
        <TarjetaKpi
          titulo="Pendientes"
          valor={pendientes}
          detalle="En estado Recibida"
          to="/admin/cotizaciones"
        />
        <TarjetaKpi
          titulo="Pedidos Activos"
          valor={pedidos.length}
          detalle="Órdenes aceptadas"
          to="/admin/pedidos"
        />
        <TarjetaKpi
          titulo="Productos"
          valor={totalProductos}
          detalle="Editar en panel"
          to="/admin/productos"
        />
        <TarjetaKpi
          titulo="Consultas"
          valor={mensajesNoLeidos}
          detalle="Mensajes sin leer"
          to="/admin/mensajes"
          destacado={mensajesNoLeidos > 0}
        />
      </div>

      {/* Tabla de últimas solicitudes */}
      <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-extrabold text-[#0b192c] text-base">
            Últimas solicitudes recibidas
          </h2>
          <Link
            to="/admin/cotizaciones"
            className="text-xs font-bold text-blue-700 hover:underline"
          >
            Ver todas
          </Link>
        </div>

        {ultimasSolicitudes.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">
            Aún no hay solicitudes registradas en el sistema.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-6 py-3">Folio</th>
                  <th className="px-6 py-3">Cliente / Empresa</th>
                  <th className="px-6 py-3">Canal</th>
                  <th className="px-6 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ultimasSolicitudes.map((s) => {
                  const estadoLegible = estadoDesdeBackend[s.estado] ?? s.estado;
                  return (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-bold text-[#0b192c]">{s.folio}</td>
                      <td className="px-6 py-3 text-slate-700">
                        {s.cliente_nombre || s.cliente_correo}
                        {s.empresa_nombre && (
                          <span className="block text-xs text-slate-400">
                            {s.empresa_nombre}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 capitalize text-slate-600">
                        {s.canal_origen || "portal"}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                            coloresEstado[estadoLegible] || "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {estadoLegible}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
