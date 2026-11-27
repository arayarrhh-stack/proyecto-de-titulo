import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { obtenerCliente } from "../../services/clientes";
import { descargarPdfSolicitud } from "../../services/solicitudes";

const pesos = (v) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number(v));

const COLOR_ESTADO = {
  recibida: "bg-blue-100 text-blue-800",
  en_cotizacion_proveedor: "bg-amber-100 text-amber-800",
  cotizacion_enviada: "bg-indigo-100 text-indigo-800",
  aceptada: "bg-green-100 text-green-800",
  rechazada: "bg-red-100 text-red-800",
  vencida: "bg-slate-200 text-slate-700",
};

function Tarjeta({ titulo, valor, detalle }) {
  return (
    <div className="bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-[#facc15] transition flex flex-col justify-between">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{titulo}</p>
      <p className="text-3xl font-black text-[#0b192c] my-2">{valor}</p>
      <p className="text-xs text-slate-500">{detalle}</p>
    </div>
  );
}

function Dato({ etiqueta, valor }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{etiqueta}</p>
      <p className="text-sm text-slate-800 mt-0.5 break-words">{valor || "—"}</p>
    </div>
  );
}

export default function AdminClienteDetalle() {
  const { id } = useParams();
  const [cliente, setCliente] = useState(null);
  const [abierta, setAbierta] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    obtenerCliente(id)
      .then(setCliente)
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }, [id]);

  if (cargando) return <p className="text-sm text-slate-500">Cargando cliente…</p>;
  if (error || !cliente) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-700">{error || "No se encontró el cliente."}</p>
        <Link to="/admin/clientes" className="text-xs font-bold text-blue-700 hover:underline">
          ← Volver a clientes
        </Link>
      </div>
    );
  }

  const sol = cliente.solicitudes;
  const aceptadas = sol.filter((s) => s.estado === "aceptada").length;
  const enCurso = sol.filter((s) =>
    ["recibida", "en_cotizacion_proveedor", "cotizacion_enviada"].includes(s.estado)
  ).length;

  return (
    <div className="max-w-6xl space-y-8">
      <div>
        <Link to="/admin/clientes" className="text-xs font-bold text-blue-700 hover:underline">
          ← Volver a clientes
        </Link>
        <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-[#0b192c]">
          {cliente.razon_social || cliente.contacto}
        </h1>
        <div className="h-1 w-14 bg-[#facc15] mt-1 rounded"></div>
      </div>

      <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="font-extrabold text-[#0b192c] text-base">Ficha del cliente</h2>
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              cliente.correo_verificado
                ? "bg-green-100 text-green-800"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {cliente.correo_verificado ? "Cuenta verificada" : "Sin verificar"}
          </span>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Dato etiqueta="RUT" valor={cliente.rut} />
          <Dato etiqueta="Contacto" valor={cliente.contacto} />
          <Dato etiqueta="Cargo" valor={cliente.cargo} />
          <Dato etiqueta="Correo" valor={cliente.correo} />
          <Dato etiqueta="Teléfono" valor={cliente.telefono} />
          <Dato etiqueta="Dirección" valor={cliente.direccion} />
          <Dato etiqueta="Registrado el" valor={cliente.fecha_registro} />
        </div>
      </section>

      <div className="grid gap-5 sm:grid-cols-3">
        <Tarjeta titulo="Solicitudes" valor={sol.length} detalle="Historial completo" />
        <Tarjeta titulo="Aceptadas" valor={aceptadas} detalle="Ofertas aceptadas por el cliente" />
        <Tarjeta titulo="En curso" valor={enCurso} detalle="Pendientes de cierre" />
      </div>

      <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="font-extrabold text-[#0b192c] text-base">Historial de solicitudes</h2>
        </div>

        {sol.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">Este cliente aún no ha hecho solicitudes.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sol.map((s) => (
              <div key={s.id} className="px-6 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-[#0b192c]">{s.folio}</p>
                    <p className="text-xs text-slate-500">
                      {s.fecha} · {s.canal} · {s.lineas.length} producto(s), {s.unidades} unidad(es)
                      {s.oferta && ` · Oferta ${s.oferta.folio}: ${pesos(s.oferta.total)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        COLOR_ESTADO[s.estado] || "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {s.estado_texto}
                    </span>
                    <button
                      onClick={() => setAbierta(abierta === s.id ? null : s.id)}
                      className="text-xs font-bold text-slate-600 hover:text-[#0b192c] border border-slate-300 bg-white px-3 py-1.5 rounded-full transition"
                    >
                      {abierta === s.id ? "Ocultar" : "Ver detalle"}
                    </button>
                  </div>
                </div>

                {abierta === s.id && (
                  <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-slate-500 uppercase">
                        <tr>
                          <th className="py-2 pr-4">Código</th>
                          <th className="py-2 pr-4">Producto</th>
                          <th className="py-2 pr-4">Talla / Color</th>
                          <th className="py-2 text-right">Cant.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {s.lineas.map((l, i) => (
                          <tr key={i}>
                            <td className="py-2 pr-4 font-bold text-[#0b192c]">{l.codigo}</td>
                            <td className="py-2 pr-4 text-slate-700">{l.producto}</td>
                            <td className="py-2 pr-4 text-slate-600">
                              {[l.talla, l.color].filter(Boolean).join(" · ") || "—"}
                            </td>
                            <td className="py-2 text-right font-bold">{l.cantidad}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {s.observaciones && (
                      <p className="text-sm text-slate-600">
                        <span className="font-bold text-slate-700">Observaciones: </span>
                        {s.observaciones}
                      </p>
                    )}
                    <button
                      onClick={() =>
                        descargarPdfSolicitud(s.id, s.folio).catch((e) => setError(e.message))
                      }
                      className="text-xs font-bold bg-[#0b192c] hover:bg-slate-800 text-[#facc15] px-4 py-2 rounded-lg transition"
                    >
                      Descargar solicitud en PDF
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}