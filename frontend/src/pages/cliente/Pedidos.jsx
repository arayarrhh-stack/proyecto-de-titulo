import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listarPedidos, emitirOrdenCompra, registrarDespacho } from "../../services/solicitudes";
import LineaTiempoPedido, { etiquetaPedido } from "../../components/cliente/LineaTiempoPedido";

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

function AccionesAdmin({ pedido, onListo }) {
  const [abierto, setAbierto] = useState(false);
  const [datos, setDatos] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  if (!["aceptado", "comprado_proveedor", "despachado"].includes(pedido.estado)) return null;

  const emitiendoOC = pedido.estado === "aceptado";
  const campo = (n) => ({
    value: datos[n] ?? "",
    onChange: (e) => setDatos({ ...datos, [n]: e.target.value }),
  });
  const clase = "w-full border border-slate-300 rounded-md px-3 py-2 text-sm";

  function abrir() {
    const d = pedido.despacho;
    setDatos(
      d && !emitiendoOC
        ? {
            transportista: d.transportista,
            numero_seguimiento: d.numero_seguimiento,
            fecha_estimada: d.fecha_estimada ?? "",
            fecha_entrega: d.fecha_entrega ?? "",
            nombre_receptor: d.nombre_receptor ?? "",
          }
        : {}
    );
    setError("");
    setAbierto(true);
  }

  async function enviar(e) {
    e.preventDefault();
    setError("");
    setEnviando(true);
    try {
      if (emitiendoOC) await emitirOrdenCompra(pedido.id, datos);
      else await registrarDespacho(pedido.id, datos);
      setAbierto(false);
      onListo();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  if (!abierto) {
    return (
      <div className="flex justify-end border-t border-slate-200 pt-3">
        <button
          onClick={abrir}
          className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-blue-700 transition"
        >
          {emitiendoOC ? "Emitir OC al proveedor" : "Registrar despacho / entrega"}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="border-t border-slate-200 pt-3 space-y-3">
      <p className="text-sm font-semibold text-slate-700">
        {emitiendoOC ? "Orden de compra al proveedor" : "Despacho y entrega"}
      </p>
      {emitiendoOC ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <input className={clase} placeholder="Proveedor" {...campo("proveedor_nombre")} required />
          <input className={clase} placeholder="Dirección de despacho" {...campo("direccion_despacho")} required />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <input className={clase} placeholder="Transportista" {...campo("transportista")} required />
          <input className={clase} placeholder="N° de seguimiento" {...campo("numero_seguimiento")} required />
          <label className="text-xs text-slate-500">
            Entrega estimada
            <input type="date" className={clase} {...campo("fecha_estimada")} />
          </label>
          <label className="text-xs text-slate-500">
            Fecha de entrega (si ya se entregó)
            <input type="date" className={clase} {...campo("fecha_entrega")} />
          </label>
          <input
            className={`${clase} sm:col-span-2`}
            placeholder="Quién recibió (si ya se entregó)"
            {...campo("nombre_receptor")}
          />
        </div>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setAbierto(false)} className="text-sm px-4 py-2 rounded-md border border-slate-300">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={enviando}
          className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {enviando ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}

function Pedidos({ admin = false }) {
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  function cargar() {
  return listarPedidos()
    .then(setPedidos)
    .catch((e) => setError(e.message))
    .finally(() => setCargando(false));
  }

  useEffect(() => {
    cargar();
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
                {etiquetaPedido(p.estado, admin)}
              </span>
            </div>

            <LineaTiempoPedido estado={p.estado} admin={admin} />

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
            {admin && <AccionesAdmin pedido={p} onListo={cargar} />}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Pedidos;
