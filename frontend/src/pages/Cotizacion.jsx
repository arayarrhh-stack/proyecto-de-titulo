import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCotizacion } from "../context/CotizacionContext";
import { useAuth } from "../context/AuthContext";
import { enviarSolicitud } from "../services/solicitudes";

const MAX_OBSERVACIONES = 1000;

const selector =
  "border border-slate-300 rounded-md px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";

function Cotizacion() {
  const { items, quitar, cambiarCantidad, cambiarVariante, vaciar } = useCotizacion();
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [observaciones, setObservaciones] = useState("");
  const [folio, setFolio] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  async function enviar() {
    if (!usuario) {
      // el carrito se conserva mientras la persona inicia sesión
      navigate("/login", { state: { from: "/cotizacion" } });
      return;
    }
    if (!usuario.verificado) return;

    setError("");
    setEnviando(true);
    try {
      const solicitud = await enviarSolicitud(items, observaciones);
      setFolio(solicitud.folio);
      vaciar();
      setObservaciones("");
    } catch (e) {
      setError(e.message);
    } finally {
      setEnviando(false);
    }
  }

  if (folio) {
    return (
      <div className="p-8 max-w-xl">
        <h1 className="text-3xl font-bold text-slate-800 mb-4">Solicitud enviada</h1>
        <div className="bg-white border border-slate-200 rounded-lg shadow p-5 space-y-2">
          <p className="text-slate-600">
            Tu solicitud quedó registrada con el folio{" "}
            <span className="font-bold text-slate-800">{folio}</span> y estado{" "}
            <span className="font-semibold">Recibida</span>.
          </p>
          <p className="text-sm text-slate-500">
            Te confirmaremos por correo y responderemos con una oferta formal.
          </p>
        </div>
        <div className="mt-4 flex gap-4 text-sm font-medium">
          <Link to="/mis-cotizaciones" className="text-blue-600 hover:underline">
            Ver mis cotizaciones
          </Link>
          <Link to="/" className="text-blue-600 hover:underline">
            Volver al catálogo
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-4">Mi cotización</h1>
        <p className="text-slate-500 mb-4">Aún no has agregado productos.</p>
        <Link to="/" className="text-blue-600 font-medium hover:underline">
          Ir al catálogo
        </Link>
      </div>
    );
  }

  const sinVerificar = usuario && !usuario.verificado;

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-3xl font-bold text-slate-800 mb-6">Mi cotización</h1>

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.lineaId}
            className="flex flex-wrap items-center gap-4 bg-white border border-slate-200 rounded-lg shadow p-3"
          >
          {item.imagen ? (
            <img
              src={item.imagen}
              alt={item.nombre}
              className="w-20 h-20 object-cover rounded-md"
            />
          ) : (
            <div className="w-20 h-20 rounded-md bg-slate-100 flex items-center justify-center text-xs text-slate-400">
              Sin imagen
            </div>
          )}

            <div className="flex-1 min-w-[10rem]">
              <p className="font-semibold text-slate-800">{item.nombre}</p>
              <div className="flex gap-2 mt-2">
                {item.tallas.length > 0 && (
                  <select
                    value={item.talla}
                    onChange={(e) => cambiarVariante(item.lineaId, "talla", e.target.value)}
                    className={selector}
                    aria-label="Talla"
                  >
                    {item.tallas.map((t) => (
                      <option key={t} value={t}>
                        Talla {t}
                      </option>
                    ))}
                  </select>
                )}
                {item.colores.length > 0 && (
                  <select
                    value={item.color}
                    onChange={(e) => cambiarVariante(item.lineaId, "color", e.target.value)}
                    className={selector}
                    aria-label="Color"
                  >
                    {item.colores.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => cambiarCantidad(item.lineaId, item.cantidad - 1)}
                className="w-8 h-8 border border-slate-300 rounded-md hover:bg-slate-100"
              >
                -
              </button>
              <span className="w-6 text-center">{item.cantidad}</span>
              <button
                onClick={() => cambiarCantidad(item.lineaId, item.cantidad + 1)}
                className="w-8 h-8 border border-slate-300 rounded-md hover:bg-slate-100"
              >
                +
              </button>
            </div>

            <button
              onClick={() => quitar(item.lineaId)}
              className="text-sm text-red-600 hover:underline"
            >
              Quitar
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <label className="block text-sm font-medium text-slate-600 mb-1">
          Observaciones (opcional)
        </label>
        <textarea
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value.slice(0, MAX_OBSERVACIONES))}
          rows={4}
          className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Plazo requerido, lugar de entrega, consultas técnicas..."
        />
        <p className="text-xs text-slate-400 text-right">
          {observaciones.length}/{MAX_OBSERVACIONES}
        </p>
      </div>

      {!usuario && (
        <p className="mt-4 text-sm text-slate-600 bg-slate-100 rounded-md p-3">
          Para enviar la solicitud necesitas iniciar sesión. Tu cotización se mantiene mientras lo haces.
        </p>
      )}
      {sinVerificar && (
        <p className="mt-4 text-sm text-yellow-800 bg-yellow-100 rounded-md p-3">
          Debes activar tu cuenta con el enlace enviado a tu correo antes de enviar solicitudes.
        </p>
      )}




      {error && (
        <p className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">
          {error}
        </p>
      )}

      <button
        onClick={enviar}
        disabled={sinVerificar || enviando}
        className="mt-4 w-full bg-blue-600 text-white font-semibold py-2 rounded-md hover:bg-blue-700 transition disabled:bg-slate-300 disabled:cursor-not-allowed"
      >
        {enviando
          ? "Enviando…"
          : usuario
          ? "Enviar solicitud de cotización"
          : "Iniciar sesión para enviar"}
      </button>
    </div>
  );
}

export default Cotizacion;