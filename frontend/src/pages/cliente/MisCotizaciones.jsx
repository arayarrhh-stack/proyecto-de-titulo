import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { coloresEstado, estadoDesdeBackend } from "../../utils/estados";
import { listarSolicitudes, listarOfertas } from "../../services/solicitudes";
import OfertaCliente from "../../components/cliente/OfertaCliente";

function adaptarSolicitud(s) {
  return {
    folio: s.folio,
    fecha: new Date(s.creado_en).toLocaleDateString("es-CL"),
    estado: estadoDesdeBackend[s.estado] ?? s.estado,
    observaciones: s.observaciones,
    direccion: s.direccion_despacho,
    documento: false, // el PDF aún no existe en el backend
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

function descargar(cot) {
  // Cuando exista el backend, aquí se descargará el PDF emitido por el servidor
  console.log("Descargar cotización:", cot.folio);
}

function MisCotizaciones() {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  function cargar() {
    return Promise.all([listarSolicitudes(), listarOfertas()])
      .then(([solicitudes, ofertas]) => {
        // el backend entrega primero la oferta más reciente de cada solicitud
        const porFolio = {};
        for (const o of ofertas) {
          if (!porFolio[o.solicitud_folio]) porFolio[o.solicitud_folio] = o;
        }
        setCotizaciones(
          solicitudes.map((s) => ({ ...adaptarSolicitud(s), oferta: porFolio[s.folio] ?? null }))
        );
      })
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }

  useEffect(() => {
    cargar();
  }, []);

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-3xl font-bold text-slate-800 mb-6">Mis cotizaciones</h1>

      {cargando ? (
        <p className="text-slate-500">Cargando…</p>
      ) : error ? (
        <p className="text-red-700">{error}</p>
      ) : cotizaciones.length === 0 ? (
        <div>
          <p className="text-slate-500 mb-4">Aún no has enviado cotizaciones.</p>
          <Link to="/" className="text-blue-600 font-medium hover:underline">
            Ir al catálogo
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {cotizaciones.map((cot) => (
            <div
              key={cot.folio}
              className="bg-white border border-slate-200 rounded-lg shadow p-4"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-semibold text-slate-800">Folio {cot.folio}</p>
                  <p className="text-sm text-slate-500">{cot.fecha}</p>
                </div>
                <span
                  className={`text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap ${
                    coloresEstado[cot.estado] || "bg-slate-100 text-slate-700"
                  }`}
                >
                  {cot.estado}
                </span>
              </div>

              <ul className="text-sm text-slate-600 space-y-2 border-t border-slate-200 pt-3">
                {cot.productos.map((p) => (
                  <li key={p.id} className="flex justify-between gap-3">
                    <span>
                      {p.nombre}
                      {describirVariante(p) && (
                        <span className="block text-xs text-slate-400">
                          {describirVariante(p)}
                        </span>
                      )}
                    </span>
                    <span className="font-medium">x{p.cantidad}</span>
                  </li>
                ))}
              </ul>

              {cot.direccion && (
                <p className="mt-3 text-sm text-slate-500 border-t border-slate-200 pt-3">
                  <span className="font-medium text-slate-600">Dirección de despacho:</span>{" "}
                  {cot.direccion}
                </p>
              )}

              {cot.observaciones && (
                <p className="mt-3 text-sm text-slate-500 border-t border-slate-200 pt-3">
                  <span className="font-medium text-slate-600">Observaciones:</span>{" "}
                  {cot.observaciones}
                </p>
              )}

              {cot.oferta && (
                <OfertaCliente oferta={cot.oferta} estado={cot.estado} onRespondida={cargar} />
              )}

              {cot.documento && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => descargar(cot)}
                    className="text-sm font-medium text-blue-600 border border-blue-600 px-4 py-2 rounded-md hover:bg-blue-50 transition"
                  >
                    Descargar cotización (PDF)
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MisCotizaciones;
