import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listarPedidos } from "../services/solicitudes";
import LineaTiempoPedido, { etiquetaPedido } from "../components/LineaTiempoPedido";

function pesos(valor) {
  return `$${Math.round(Number(valor)).toLocaleString("es-CL")}`;
}

function fecha(iso) {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}-${m}-${a}`;
}

function Dato({ etiqueta, valor }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{etiqueta}</p>
      <p className="text-sm font-medium text-slate-800">{valor}</p>
    </div>
  );
}

function Pedidos({ admin = false }) {
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    listarPedidos()
      .then(setPedidos)
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }, []);

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-3xl font-bold text-slate-800 mb-6">
        {admin ? "Pedidos" : "Mis pedidos"}
      </h1>

      {cargando && <p className="text-slate-500">Cargando pedidos…</p>}
      {error && <p className="text-red-700">{error}</p>}

      {!cargando && !error && pedidos.length === 0 && (
        <div>
          <p className="text-slate-500 mb-4">
            {admin
              ? "Aún no hay pedidos: se crean cuando un cliente acepta una oferta."
              : "Aún no tienes pedidos. Se crean cuando aceptas una oferta."}
          </p>
          {!admin && (
            <Link to="/mis-cotizaciones" className="text-blue-600 font-medium hover:underline">
              Ver mis cotizaciones
            </Link>
          )}
        </div>
      )}

      <div className="space-y-4">
        {pedidos.map((p) => (
          <div key={p.id} className="bg-white border border-slate-200 rounded-lg shadow p-4 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-800">Pedido {p.folio}</p>
                <p className="text-sm text-slate-500">
                  {fecha(p.creado_en)}
                  {p.cotizacion_folio && ` · Oferta ${p.cotizacion_folio}`}
                </p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-100 text-blue-800 whitespace-nowrap">
                {etiquetaPedido(p.estado)}
              </span>
            </div>

            <LineaTiempoPedido estado={p.estado} />

            <div className="grid gap-4 sm:grid-cols-3 border-t border-slate-200 pt-3">
              <Dato etiqueta="Orden de compra" valor={p.oc_cliente_numero} />
              <Dato etiqueta="Total neto" valor={pesos(p.venta_total_neta)} />
              {admin && <Dato etiqueta="Costo neto" valor={pesos(p.costo_total_neto)} />}
              {admin && (
                <Dato etiqueta="Margen real (neto)" valor={pesos(p.margen_real_neto)} />
              )}
            </div>

            {p.despacho && (
              <div className="grid gap-4 sm:grid-cols-3 border-t border-slate-200 pt-3">
                <Dato etiqueta="Transportista" valor={p.despacho.transportista} />
                <Dato etiqueta="N° de seguimiento" valor={p.despacho.numero_seguimiento} />
                <Dato etiqueta="Entrega estimada" valor={fecha(p.despacho.fecha_estimada)} />
                {p.despacho.fecha_entrega && (
                  <Dato etiqueta="Entregado el" valor={fecha(p.despacho.fecha_entrega)} />
                )}
                {p.despacho.nombre_receptor && (
                  <Dato etiqueta="Recibió" valor={p.despacho.nombre_receptor} />
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Pedidos;