import { useState } from "react";
import { responderOferta, descargarPdfOferta } from "../../services/solicitudes";

function pesos(valor) {
  return `$${Math.round(Number(valor)).toLocaleString("es-CL")}`;
}

function hoy() {
  return new Date().toLocaleDateString("en-CA");
}

function fecha(iso) {
  const [a, m, d] = iso.split("-");
  return `${d}-${m}-${a}`;
}

function describirVariante(l) {
  return [l.talla && `Talla ${l.talla}`, l.color].filter(Boolean).join(" · ");
}

export default function OfertaCliente({ oferta, estado, onRespondida }) {
  const [oc, setOc] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [confirmandoRechazo, setConfirmandoRechazo] = useState(false);

  const vencida = oferta.validez_hasta < hoy();
  const puedeResponder = estado === "Cotización enviada" && !vencida;

  async function responder(cuerpo) {
    setError("");
    setEnviando(true);
    try {
      await responderOferta(oferta.id, cuerpo);
      onRespondida();
    } catch (e) {
      setError(e.message);
      setEnviando(false);
    }
  }

  function aceptar(e) {
    e.preventDefault();
    if (!oc.trim()) return setError("Ingresa el número de tu orden de compra para aceptar.");
    responder({ accion: "aceptar", oc_cliente_numero: oc.trim() });
  }


    async function descargarPdf() {
    setError("");
    try {
      await descargarPdfOferta(oferta.id, oferta.folio);
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="mt-3 border-t border-slate-200 pt-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-700">
          Oferta {oferta.folio}
          <span className="font-normal text-slate-500"> · válida hasta {fecha(oferta.validez_hasta)}</span>
        </p>
        <button
          type="button"
          onClick={descargarPdf}
          className="text-xs font-bold text-[#0b192c] border border-slate-300 bg-white px-3 py-1.5 rounded-lg hover:bg-slate-50 transition"
        >
          Descargar PDF
        </button>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-slate-500">
            <th className="font-medium pb-1">Producto</th>
            <th className="font-medium pb-1 text-right">Cant.</th>
            <th className="font-medium pb-1 text-right">Precio unit.</th>
            <th className="font-medium pb-1 text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {oferta.lineas_oferta.map((l) => (
            <tr key={l.id} className="border-t border-slate-100">
              <td className="py-1.5 text-slate-700">
                {l.producto_nombre}
                {describirVariante(l) && (
                  <span className="block text-xs text-slate-400">{describirVariante(l)}</span>
                )}
              </td>
              <td className="py-1.5 text-right">{l.cantidad}</td>
              <td className="py-1.5 text-right">{pesos(l.precio_unitario_venta)}</td>
              <td className="py-1.5 text-right">{pesos(l.subtotal_neto)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="text-sm text-right space-y-0.5">
        <p>Neto: <span className="font-medium">{pesos(oferta.neto)}</span></p>
        <p>IVA (19%): <span className="font-medium">{pesos(oferta.iva)}</span></p>
        <p className="text-base">Total: <span className="font-bold">{pesos(oferta.total)}</span></p>
      </div>

      <p className="text-xs text-slate-500">
        Plazo de entrega: {oferta.plazo_entrega_dias} días · Condiciones: {oferta.condiciones_comerciales}
      </p>

      {estado === "Cotización enviada" && vencida && (
        <p className="text-sm text-yellow-800 bg-yellow-100 rounded-md p-3">
          Esta oferta ya venció. Solicita una nueva cotización si aún te interesa.
        </p>
      )}

      {puedeResponder && (
        <form onSubmit={aceptar} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              N° de tu orden de compra
            </label>
            <input
              value={oc}
              onChange={(e) => setOc(e.target.value)}
              className="w-full max-w-xs border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="OC-12345"
            />
          </div>

          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">{error}</p>
          )}

          <div className="flex flex-wrap justify-end gap-3">
            {confirmandoRechazo ? (
              <>
                <span className="text-sm text-slate-600 self-center">¿Seguro que quieres rechazar?</span>
                <button
                  type="button"
                  disabled={enviando}
                  onClick={() => responder({ accion: "rechazar" })}
                  className="text-sm font-medium text-red-600 border border-red-600 px-4 py-2 rounded-md hover:bg-red-50 disabled:opacity-60"
                >
                  Sí, rechazar
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmandoRechazo(false)}
                  className="text-sm text-slate-600 px-3 py-2 hover:underline"
                >
                  No
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setConfirmandoRechazo(true)}
                  className="text-sm font-medium text-red-600 border border-red-600 px-4 py-2 rounded-md hover:bg-red-50"
                >
                  Rechazar
                </button>
                <button
                  type="submit"
                  disabled={enviando}
                  className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-blue-700 transition disabled:opacity-60"
                >
                  {enviando ? "Enviando…" : "Aceptar oferta"}
                </button>
              </>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
