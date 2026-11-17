import { useEffect, useState } from "react";
import { listarCotizacionesProveedor, emitirOferta } from "../services/solicitudes";

const campo =
  "w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

const MARGEN_DEFECTO = "13.33";

function hoy() {
  return new Date().toLocaleDateString("en-CA");
}

function numero(texto) {
  return Number(String(texto).replace(",", ".").trim());
}

function pesos(n) {
  return `$${Math.round(n).toLocaleString("es-CL")}`;
}

function describirVariante(p) {
  return [p.talla && `Talla ${p.talla}`, p.color].filter(Boolean).join(" · ");
}

export default function FormularioOferta({ solicitud, onEmitida, onCancelar }) {
  const [cot, setCot] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");

  const [margenes, setMargenes] = useState({});
  const [recargos, setRecargos] = useState({});
  const [validez, setValidez] = useState("");
  const [plazo, setPlazo] = useState("7");
  const [condiciones, setCondiciones] = useState("Pago contra factura.");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    listarCotizacionesProveedor(solicitud.id)
      .then((lista) => {
        const ultima = lista[0] ?? null; // el backend las entrega de la más nueva a la más antigua
        setCot(ultima);
        if (ultima) setPlazo(String(ultima.plazo_entrega_dias));
      })
      .catch((e) => setErrorCarga(e.message))
      .finally(() => setCargando(false));
  }, [solicitud.id]);

  if (cargando) return <p className="text-sm text-slate-500">Cargando cotización del proveedor…</p>;
  if (errorCarga) return <p className="text-sm text-red-700">{errorCarga}</p>;
  if (!cot) {
    return (
      <p className="text-sm text-slate-600">
        Esta solicitud no tiene una cotización de proveedor registrada.{" "}
        <button onClick={onCancelar} className="underline">Cerrar</button>
      </p>
    );
  }

  const vencida = cot.fecha_vigencia < hoy();

  function costoDe(p) {
    const linea = cot.lineas_costo.find((l) => l.linea_solicitud === p.id);
    return linea ? Number(linea.costo_unitario_neto) : null;
  }

  function margenDe(p) {
    return margenes[p.id] ?? MARGEN_DEFECTO;
  }
  function recargoDe(p) {
    return recargos[p.id] ?? "0";
  }

  // Estimación para mostrar en pantalla; el valor oficial lo calcula el servidor
  let neto = 0;
  const filas = solicitud.productos.map((p) => {
    const costo = costoDe(p);
    const m = numero(margenDe(p));
    const r = numero(recargoDe(p));
    const valido = costo !== null && !Number.isNaN(m) && !Number.isNaN(r) && m >= 0 && r >= 0;
    const unitario = valido ? costo * (1 + m / 100) + r : null;
    const subtotal = unitario !== null ? unitario * p.cantidad : null;
    if (subtotal !== null) neto += subtotal;
    return { p, costo, unitario, subtotal };
  });
  const iva = neto * 0.19;

  async function enviar(e) {
    e.preventDefault();
    setError("");

    if (vencida) return setError("La cotización del proveedor está vencida. Registra una nueva.");
    if (!validez) return setError("Indica hasta cuándo es válida la oferta para el cliente.");
    if (validez < hoy()) return setError("La validez no puede ser una fecha pasada.");
    if (validez > cot.fecha_vigencia) {
      return setError(`La oferta no puede durar más que la cotización del proveedor (hasta ${cot.fecha_vigencia}).`);
    }
    const dias = Number(plazo);
    if (!Number.isInteger(dias) || dias <= 0) return setError("El plazo de entrega debe ser un número de días mayor a cero.");
    if (!condiciones.trim()) return setError("Indica las condiciones comerciales.");

    const parametros_lineas = [];
    for (const p of solicitud.productos) {
      const m = numero(margenDe(p));
      const r = numero(recargoDe(p));
      if (costoDe(p) === null) return setError(`Falta el costo del proveedor para "${p.nombre}".`);
      if (Number.isNaN(m) || m < 0) return setError(`El margen de "${p.nombre}" no es válido.`);
      if (Number.isNaN(r) || r < 0) return setError(`El recargo de "${p.nombre}" no es válido.`);
      parametros_lineas.push({
        linea_solicitud_id: p.id,
        margen_porcentaje: String(m),
        recargo_unitario_neto: String(r),
      });
    }

    setEnviando(true);
    try {
      await emitirOferta({
        solicitud_id: solicitud.id,
        cotizacion_proveedor_id: cot.id,
        validez_hasta: validez,
        plazo_entrega_dias: dias,
        condiciones_comerciales: condiciones.trim(),
        parametros_lineas,
      });
      onEmitida();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <div>
        <h3 className="font-semibold text-slate-800">Emitir oferta al cliente</h3>
        <p className="text-xs text-slate-500">
          Proveedor: {cot.proveedor_nombre} · vigente hasta {cot.fecha_vigencia}. Los costos y márgenes
          son solo para administración: el cliente verá únicamente el precio final.
        </p>
      </div>

      {vencida && (
        <p className="text-sm text-yellow-800 bg-yellow-100 rounded-md p-3">
          La cotización del proveedor está vencida: no se puede emitir la oferta.
        </p>
      )}

      <ul className="space-y-3">
        {filas.map(({ p, costo, unitario, subtotal }) => (
          <li key={p.id} className="border border-slate-200 rounded-md p-3 text-sm">
            <p className="font-medium text-slate-700">
              {p.nombre} <span className="text-slate-400">x{p.cantidad}</span>
              {describirVariante(p) && (
                <span className="block text-xs text-slate-400">{describirVariante(p)}</span>
              )}
            </p>
            <div className="grid gap-3 sm:grid-cols-4 mt-2 items-end">
              <div>
                <p className="text-xs text-slate-500 mb-1">Costo neto</p>
                <p className="py-2">{costo !== null ? pesos(costo) : "—"}</p>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Margen (%)</label>
                <input
                  inputMode="decimal"
                  className={campo}
                  value={margenDe(p)}
                  onChange={(e) => setMargenes((m) => ({ ...m, [p.id]: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Recargo unitario ($)</label>
                <input
                  inputMode="decimal"
                  className={campo}
                  value={recargoDe(p)}
                  onChange={(e) => setRecargos((r) => ({ ...r, [p.id]: e.target.value }))}
                />
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 mb-1">Precio unitario (est.)</p>
                <p className="py-2 font-medium">{unitario !== null ? pesos(unitario) : "—"}</p>
                {subtotal !== null && (
                  <p className="text-xs text-slate-400">Subtotal {pesos(subtotal)}</p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="text-sm text-right space-y-1">
        <p>Neto (est.): <span className="font-medium">{pesos(neto)}</span></p>
        <p>IVA 19% (est.): <span className="font-medium">{pesos(iva)}</span></p>
        <p className="text-base">Total (est.): <span className="font-bold">{pesos(neto + iva)}</span></p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Oferta válida hasta</label>
          <input
            type="date"
            min={hoy()}
            max={cot.fecha_vigencia}
            className={campo}
            value={validez}
            onChange={(e) => setValidez(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Plazo de entrega (días)</label>
          <input type="number" min="1" className={campo} value={plazo} onChange={(e) => setPlazo(e.target.value)} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">Condiciones comerciales</label>
        <textarea rows={2} className={campo} value={condiciones} onChange={(e) => setCondiciones(e.target.value)} />
      </div>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">{error}</p>
      )}

      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancelar} className="text-sm text-slate-600 px-4 py-2 hover:underline">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={enviando || vencida}
          className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-blue-700 transition disabled:opacity-60"
        >
          {enviando ? "Emitiendo…" : "Emitir oferta"}
        </button>
      </div>
    </form>
  );
}