import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ESTADOS, coloresEstado, estadoDesdeBackend } from "../../utils/estados";
import { listarSolicitudes, listarOfertas, descargarPdfOferta, descargarPdfSolicitud } from "../../services/solicitudes";
import FormularioProveedor from "../../components/admin/FormularioProveedor";
import FormularioOferta from "../../components/admin/FormularioOferta";

const CANALES = {
  portal: "Portal",
  whatsapp: "WhatsApp",
  correo: "Correo",
  telefono: "Teléfono",
  presencial: "Presencial",
};

function adaptarSolicitud(s) {
  return {
    id: s.id,
    folio: s.folio,
    cliente: s.cliente_nombre || s.cliente_correo,
    correo: s.cliente_correo,
    empresa: s.empresa_nombre,
    fecha: new Date(s.creado_en).toLocaleDateString("es-CL"),
    canal: CANALES[s.canal_origen] ?? s.canal_origen,
    estado: estadoDesdeBackend[s.estado] ?? s.estado,
    observaciones: s.observaciones,
    productos: s.lineas.map((l) => ({
      id: l.id,
      nombre: l.producto_nombre,
      talla: l.talla,
      color: l.color,
      cantidad: l.cantidad,
    })),
  };
}

function describirVariante(p) {
  return [p.talla && `Talla ${p.talla}`, p.color].filter(Boolean).join(" · ");
}

function AdminCotizaciones() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [filtro, setFiltro] = useState("Todas");
  const [abierta, setAbierta] = useState(null);
  const [ofertas, setOfertas] = useState({});

  function cargar() {
  return Promise.all([listarSolicitudes(), listarOfertas()])
    .then(([datos, listaOfertas]) => {
      setSolicitudes(datos.map(adaptarSolicitud));
      const porSolicitud = {};
      listaOfertas.forEach((o) => {
        porSolicitud[o.solicitud] = o;
      });
      setOfertas(porSolicitud);
    })
    .catch((e) => setError(e.message))
    .finally(() => setCargando(false));
}

  useEffect(() => {
    cargar();
  }, []);

  const solicitudesFiltradas = solicitudes.filter(
    (s) => filtro === "Todas" || s.estado === filtro
  );

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Solicitudes de cotización</h1>
        
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {["Todas", ...ESTADOS].map((opcion) => (
          <button
            key={opcion}
            onClick={() => setFiltro(opcion)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${
              filtro === opcion
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
            }`}
          >
            {opcion}
          </button>
        ))}
      </div>

      {cargando && <p className="text-slate-500">Cargando solicitudes…</p>}
      {error && <p className="text-red-700">{error}</p>}
      {!cargando && !error && solicitudesFiltradas.length === 0 && (
        <p className="text-slate-500">No hay solicitudes en esta categoría.</p>
      )}

      <div className="space-y-4">
        {solicitudesFiltradas.map((sol) => (
          <div key={sol.id} className="bg-white border border-slate-200 rounded-lg shadow p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="font-semibold text-slate-800">
                  Folio {sol.folio} · {sol.cliente}
                </p>
                <p className="text-sm text-slate-500">
                  {sol.empresa ? `${sol.empresa} · ` : ""}
                  {sol.fecha} · Canal: {sol.canal}
                </p>
                {sol.correo && <p className="text-xs text-slate-400">{sol.correo}</p>}
              </div>
              <span
                className={`text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap ${
                  coloresEstado[sol.estado] || "bg-slate-100 text-slate-700"
                }`}
              >
                {sol.estado}
              </span>
            </div>

            <ul className="text-sm text-slate-600 space-y-2 border-t border-slate-200 pt-3">
              {sol.productos.map((p) => (
                <li key={p.id} className="flex justify-between gap-3">
                  <span>
                    {p.nombre}
                    {describirVariante(p) && (
                      <span className="block text-xs text-slate-400">{describirVariante(p)}</span>
                    )}
                  </span>
                  <span className="font-medium">x{p.cantidad}</span>
                </li>
              ))}
            </ul>

            {sol.observaciones && (
              <p className="mt-3 text-sm text-slate-500 border-t border-slate-200 pt-3">
                <span className="font-medium text-slate-600">Observaciones:</span>{" "}
                {sol.observaciones}
              </p>
            )}

            <div className="mt-4 border-t border-slate-200 pt-4 flex justify-end">
              <button
                onClick={() =>
                  descargarPdfSolicitud(sol.id, sol.folio).catch((e) => setError(e.message))
                }
                className="border border-slate-300 text-slate-700 text-sm font-medium px-4 py-2 rounded-md hover:bg-slate-50 transition"
              >
                Descargar solicitud en PDF
              </button>
            </div>

            {ofertas[sol.id] && (
              <div className="mt-4 border-t border-slate-200 pt-4 flex justify-end">
                <button
                  onClick={() =>
                    descargarPdfOferta(ofertas[sol.id].id, ofertas[sol.id].folio).catch((e) =>
                      setError(e.message)
                    )
                  }
                  className="bg-slate-800 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-slate-900 transition"
                >
                  Descargar PDF de la oferta {ofertas[sol.id].folio}
                </button>
              </div>
            )}

            {sol.estado === "Recibida" && (
              <div className="mt-4 border-t border-slate-200 pt-4">
                {abierta === sol.id ? (
                  <FormularioProveedor
                    solicitud={sol}
                    onCancelar={() => setAbierta(null)}
                    onRegistrado={() => {
                      setAbierta(null);
                      cargar();
                    }}
                  />
                ) : (
                  <div className="flex justify-end">
                    <button
                      onClick={() => setAbierta(sol.id)}
                      className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-blue-700 transition"
                    >
                      Registrar cotización del proveedor
                    </button>
                  </div>
                )}
              </div>
            )}
            {sol.estado === "En cotización con proveedor" && (
              <div className="mt-4 border-t border-slate-200 pt-4">
                {abierta === sol.id ? (
                  <FormularioOferta
                    solicitud={sol}
                    onCancelar={() => setAbierta(null)}
                    onEmitida={() => {
                      setAbierta(null);
                      cargar();
                    }}
                  />
                ) : (
                  <div className="flex justify-end">
                    <button
                      onClick={() => setAbierta(sol.id)}
                      className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-blue-700 transition"
                    >
                      Emitir oferta al cliente
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default AdminCotizaciones;

