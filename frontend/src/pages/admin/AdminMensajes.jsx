import { useEffect, useState } from "react";
import {
  listarMensajes,
  marcarMensajeLeido,
  eliminarMensaje,
} from "../../services/mensajes";

export default function AdminMensajes() {
  const [mensajes, setMensajes] = useState([]);
  const [filtroAsunto, setFiltroAsunto] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    listarMensajes()
      .then(setMensajes)
      .catch((e) => setError(e.message));
  }, []);

  async function alternarLeido(id, estadoActual) {
    try {
      const actualizado = await marcarMensajeLeido(id, !estadoActual);
      setMensajes((prev) => prev.map((m) => (m.id === id ? actualizado : m)));
    } catch (e) {
      setError(e.message);
    }
  }

  async function borrar(id) {
    try {
      await eliminarMensaje(id);
      setMensajes((prev) => prev.filter((m) => m.id !== id));
    } catch (e) {
      setError(e.message);
    }
  }

  const visibles = filtroAsunto
    ? mensajes.filter((m) => m.asunto === filtroAsunto)
    : mensajes;

  const noLeidos = mensajes.filter((m) => !m.leido).length;

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0b192c]">
            Mensajes y Consultas
          </h1>
          <div className="h-1 w-14 bg-[#facc15] mt-1 rounded"></div>
        </div>

        <div className="flex items-center gap-3">
          <span className="bg-[#0b192c] text-[#facc15] text-xs font-bold px-3 py-1.5 rounded-full">
            {noLeidos} sin leer
          </span>
          <select
            value={filtroAsunto}
            onChange={(e) => setFiltroAsunto(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700"
          >
            <option value="">Todos los asuntos</option>
            <option value="Solicitud de Cotización">Solicitud de Cotización</option>
            <option value="Consultas o Asesorías (Comercial)">Consultas o Asesorías (Comercial)</option>
            <option value="Otras consultas (No comercial)">Otras consultas (No comercial)</option>
            <option value="Reclamos">Reclamos</option>
          </select>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
          {error}
        </p>
      )}

      {visibles.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-sm text-slate-500">
          No hay mensajes registrados en esta bandeja.
        </div>
      ) : (
        <div className="space-y-4">
          {visibles.map((m) => (
            <article
              key={m.id}
              className={`bg-white border rounded-2xl p-5 shadow-sm transition ${
                m.leido ? "border-slate-200 opacity-85" : "border-l-4 border-l-[#facc15] border-slate-200"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="bg-[#0b192c] text-[#facc15] text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                      {m.asunto}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">{m.fecha}</span>
                    {!m.leido && (
                      <span className="bg-yellow-100 text-yellow-900 text-[10px] font-extrabold px-2 py-0.5 rounded">
                        NUEVO
                      </span>
                    )}
                  </div>
                  <h2 className="font-extrabold text-[#0b192c] text-base mt-1.5">
                    {m.nombre} — <span className="text-slate-600 font-semibold">{m.empresa}</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    RUT: <strong>{m.rutEmpresa}</strong> · Email:{" "}
                    <a href={`mailto:${m.email}`} className="text-blue-700 underline">
                      {m.email}
                    </a>{" "}
                    · Sucursal: <strong>{m.sucursal}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => alternarLeido(m.id, m.leido)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg transition ${
                      m.leido
                        ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        : "bg-green-600 text-white hover:bg-green-700"
                    }`}
                  >
                    {m.leido ? "Marcar no leído" : "\u{2713} Marcar atendido"}
                  </button>
                  <button
                    type="button"
                    onClick={() => borrar(m.id)}
                    className="bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold px-3 py-1.5 rounded-lg transition"
                  >
                    Eliminar
                  </button>
                </div>
              </div>

              <p className="text-sm text-slate-700 mt-3 whitespace-pre-line">{m.mensaje}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
