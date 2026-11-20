import { useState } from "react";
import { registrarCotizacionProveedor } from "../../services/solicitudes";
import { validarRut } from "../../utils/rut";

const campo =
  "w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

function hoy() {
  return new Date().toLocaleDateString("en-CA"); // AAAA-MM-DD en hora local
}

function describirVariante(p) {
  return [p.talla && `Talla ${p.talla}`, p.color].filter(Boolean).join(" · ");
}

export default function FormularioProveedor({ solicitud, onRegistrado, onCancelar }) {
  const [proveedor, setProveedor] = useState("");
  const [rut, setRut] = useState("");
  const [vigencia, setVigencia] = useState("");
  const [plazo, setPlazo] = useState("7");
  const [documento, setDocumento] = useState("");
  const [costos, setCostos] = useState({});
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  function cambiarCosto(id, valor) {
    setCostos((c) => ({ ...c, [id]: valor }));
  }

  async function enviar(e) {
    e.preventDefault();
    setError("");

    if (!proveedor.trim()) return setError("Indica el nombre del proveedor.");
    if (rut.trim() && !validarRut(rut)) return setError("El RUT del proveedor no es válido.");
    if (!vigencia) return setError("Indica hasta cuándo es vigente la cotización del proveedor.");
    if (vigencia < hoy()) return setError("La vigencia no puede ser una fecha pasada.");
    const dias = Number(plazo);
    if (!Number.isInteger(dias) || dias <= 0) return setError("El plazo de entrega debe ser un número de días mayor a cero.");

    const costos_por_linea = [];
    for (const p of solicitud.productos) {
      const valor = String(costos[p.id] ?? "").replace(",", ".").trim();
      if (!valor || Number.isNaN(Number(valor)) || Number(valor) <= 0) {
        return setError(`Falta un costo válido para "${p.nombre}".`);
      }
      costos_por_linea.push({ linea_solicitud_id: p.id, costo_unitario_neto: valor });
    }

    setEnviando(true);
    try {
      await registrarCotizacionProveedor({
        solicitud_id: solicitud.id,
        proveedor_nombre: proveedor.trim(),
        proveedor_rut: rut.trim(),
        plazo_entrega_dias: dias,
        fecha_vigencia: vigencia,
        documento_respaldo: documento.trim(),
        costos_por_linea,
      });
      onRegistrado();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <h3 className="font-semibold text-slate-800">Cotización del proveedor</h3>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Proveedor</label>
          <input className={campo} value={proveedor} onChange={(e) => setProveedor(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">RUT del proveedor (opcional)</label>
          <input className={campo} value={rut} onChange={(e) => setRut(e.target.value)} placeholder="12.345.678-5" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Vigente hasta</label>
          <input type="date" min={hoy()} className={campo} value={vigencia} onChange={(e) => setVigencia(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Plazo de entrega (días)</label>
          <input type="number" min="1" className={campo} value={plazo} onChange={(e) => setPlazo(e.target.value)} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">
          Referencia del respaldo (opcional)
        </label>
        <input
          className={campo}
          value={documento}
          onChange={(e) => setDocumento(e.target.value)}
          placeholder="N° de cotización del proveedor"
        />
      </div>

      <div>
        <p className="text-sm font-medium text-slate-600 mb-2">Costo unitario neto por producto (CLP)</p>
        <ul className="space-y-2">
          {solicitud.productos.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-slate-700">
                {p.nombre} <span className="text-slate-400">x{p.cantidad}</span>
                {describirVariante(p) && (
                  <span className="block text-xs text-slate-400">{describirVariante(p)}</span>
                )}
              </span>
              <input
                inputMode="decimal"
                className={`${campo} max-w-[10rem] text-right`}
                value={costos[p.id] ?? ""}
                onChange={(e) => cambiarCosto(p.id, e.target.value)}
                placeholder="0"
                aria-label={`Costo de ${p.nombre}`}
              />
            </li>
          ))}
        </ul>
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
          disabled={enviando}
          className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-blue-700 transition disabled:opacity-60"
        >
          {enviando ? "Guardando…" : "Registrar cotización"}
        </button>
      </div>
    </form>
  );
}
