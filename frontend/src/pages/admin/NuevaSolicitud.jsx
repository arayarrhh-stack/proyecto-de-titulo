import { useState } from "react";
import { Link } from "react-router-dom";
import { productosDePrueba } from "../../data/productos";
import { formatearRut, validarRut } from "../../utils/rut";

const CANALES = ["Teléfono", "Correo", "WhatsApp", "Visita presencial"];

const clientesDePrueba = [
  { id: 1, nombre: "Juan Pérez", empresa: "Eléctrica del Norte SpA" },
  { id: 2, nombre: "María González", empresa: "" },
  { id: 3, nombre: "Carlos Soto", empresa: "Minera Los Pinos" },
];

const campo =
  "w-full border border-slate-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";
const etiqueta = "block text-sm font-medium text-slate-600 mb-1";
const tarjeta = "bg-white border border-slate-200 rounded-lg shadow p-5 space-y-4";

const clienteVacio = { nombre: "", empresa: "", rut: "", email: "", telefono: "" };

function nuevaLinea() {
  const p = productosDePrueba[0];
  return {
    lineaId: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    productoId: p.id,
    talla: p.tallas[0] ?? "",
    color: p.colores[0] ?? "",
    cantidad: 1,
  };
}

function NuevaSolicitud() {
  const [canal, setCanal] = useState(CANALES[0]);
  const [modoCliente, setModoCliente] = useState("existente");
  const [clienteId, setClienteId] = useState("");
  const [cliente, setCliente] = useState(clienteVacio);
  const [lineas, setLineas] = useState([nuevaLinea()]);
  const [observaciones, setObservaciones] = useState("");
  const [errores, setErrores] = useState({});
  const [folio, setFolio] = useState(null);

  function actualizarCliente(nombreCampo, valor) {
    setCliente((actual) => ({ ...actual, [nombreCampo]: valor }));
  }

  function cambiarLinea(lineaId, cambios) {
    setLineas((actuales) =>
      actuales.map((l) => (l.lineaId === lineaId ? { ...l, ...cambios } : l))
    );
  }

  function cambiarProducto(lineaId, productoId) {
    const p = productosDePrueba.find((x) => x.id === productoId);
    cambiarLinea(lineaId, {
      productoId,
      talla: p.tallas[0] ?? "",
      color: p.colores[0] ?? "",
    });
  }

  function quitarLinea(lineaId) {
    setLineas((actuales) => actuales.filter((l) => l.lineaId !== lineaId));
  }

  function reiniciar() {
    setCanal(CANALES[0]);
    setModoCliente("existente");
    setClienteId("");
    setCliente(clienteVacio);
    setLineas([nuevaLinea()]);
    setObservaciones("");
    setErrores({});
    setFolio(null);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const nuevos = {};

    if (modoCliente === "existente" && !clienteId) {
      nuevos.cliente = "Selecciona un cliente.";
    }
    if (modoCliente === "nuevo") {
      if (!cliente.nombre.trim()) {
        nuevos.cliente = "Ingresa el nombre del cliente.";
      } else if (!cliente.email.trim() && !cliente.telefono.trim()) {
        nuevos.cliente = "Ingresa al menos un correo o un teléfono de contacto.";
      } else if (cliente.rut && !validarRut(cliente.rut)) {
        nuevos.cliente = "El RUT no es válido. Revisa el número y el dígito verificador.";
      }
    }
    if (lineas.length === 0) {
      nuevos.lineas = "Agrega al menos un producto.";
    }

    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;

    // Cuando exista el backend, aquí se enviará la solicitud y el servidor devolverá el folio
    console.log("Solicitud registrada por la administradora:", {
      canal,
      cliente:
        modoCliente === "existente"
          ? clientesDePrueba.find((c) => c.id === Number(clienteId))
          : cliente,
      lineas: lineas.map((l) => ({
        producto: productosDePrueba.find((p) => p.id === l.productoId).codigo,
        talla: l.talla,
        color: l.color,
        cantidad: l.cantidad,
      })),
      observaciones,
    });
    setFolio(`COT-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`);
  }

  if (folio) {
    return (
      <div className="p-8 max-w-xl">
        <h1 className="text-3xl font-bold text-slate-800 mb-4">Solicitud registrada</h1>
        <div className="bg-white border border-slate-200 rounded-lg shadow p-5 space-y-2">
          <p className="text-slate-600">
            La solicitud quedó registrada con el folio{" "}
            <span className="font-bold text-slate-800">{folio}</span>, estado{" "}
            <span className="font-semibold">Recibida</span> y canal de origen{" "}
            <span className="font-semibold">{canal}</span>.
          </p>
        </div>
        <div className="mt-4 flex gap-4 text-sm font-medium">
          <button onClick={reiniciar} className="text-blue-600 hover:underline">
            Registrar otra solicitud
          </button>
          <Link to="/admin/cotizaciones" className="text-blue-600 hover:underline">
            Volver a las solicitudes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-3xl font-bold text-slate-800 mb-6">
        Registrar solicitud recibida
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className={tarjeta}>
          <h2 className="font-semibold text-slate-800">Canal de origen</h2>
          <select
            value={canal}
            onChange={(e) => setCanal(e.target.value)}
            className={campo}
            aria-label="Canal de origen"
          >
            {CANALES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className={tarjeta}>
          <h2 className="font-semibold text-slate-800">Cliente</h2>

          <div className="grid grid-cols-2 gap-2">
            {[
              { valor: "existente", texto: "Cliente existente" },
              { valor: "nuevo", texto: "Cliente nuevo" },
            ].map((opcion) => (
              <button
                key={opcion.valor}
                type="button"
                onClick={() => setModoCliente(opcion.valor)}
                className={`py-2 rounded-md text-sm font-medium border transition ${
                  modoCliente === opcion.valor
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
                }`}
              >
                {opcion.texto}
              </button>
            ))}
          </div>

          {modoCliente === "existente" ? (
            <select
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              className={campo}
              aria-label="Cliente existente"
            >
              <option value="">Selecciona un cliente...</option>
              {clientesDePrueba.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                  {c.empresa ? ` · ${c.empresa}` : ""}
                </option>
              ))}
            </select>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={etiqueta}>Nombre</label>
                  <input
                    type="text"
                    value={cliente.nombre}
                    onChange={(e) => actualizarCliente("nombre", e.target.value)}
                    className={campo}
                    placeholder="Juan Pérez"
                  />
                </div>
                <div>
                  <label className={etiqueta}>Empresa (opcional)</label>
                  <input
                    type="text"
                    value={cliente.empresa}
                    onChange={(e) => actualizarCliente("empresa", e.target.value)}
                    className={campo}
                    placeholder="Razón social"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={etiqueta}>RUT (opcional)</label>
                  <input
                    type="text"
                    value={cliente.rut}
                    onChange={(e) => actualizarCliente("rut", formatearRut(e.target.value))}
                    className={campo}
                    placeholder="12.345.678-5"
                    maxLength={12}
                  />
                </div>
                <div>
                  <label className={etiqueta}>Correo</label>
                  <input
                    type="email"
                    value={cliente.email}
                    onChange={(e) => actualizarCliente("email", e.target.value)}
                    className={campo}
                    placeholder="correo@ejemplo.com"
                  />
                </div>
                <div>
                  <label className={etiqueta}>Teléfono</label>
                  <input
                    type="tel"
                    value={cliente.telefono}
                    onChange={(e) => actualizarCliente("telefono", e.target.value)}
                    className={campo}
                    placeholder="+56 9 1234 5678"
                  />
                </div>
              </div>
            </div>
          )}

          {errores.cliente && <p className="text-sm text-red-600">{errores.cliente}</p>}
        </div>

        <div className={tarjeta}>
          <h2 className="font-semibold text-slate-800">Productos solicitados</h2>

          {lineas.map((l) => {
            const p = productosDePrueba.find((x) => x.id === l.productoId);
            return (
              <div key={l.lineaId} className="border border-slate-200 rounded-md p-3 space-y-2">
                <select
                  value={l.productoId}
                  onChange={(e) => cambiarProducto(l.lineaId, Number(e.target.value))}
                  className={campo}
                  aria-label="Producto"
                >
                  {productosDePrueba.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.codigo} · {x.nombre}
                    </option>
                  ))}
                </select>

                <div className="flex flex-wrap items-center gap-2">
                  {p.tallas.length > 0 && (
                    <select
                      value={l.talla}
                      onChange={(e) => cambiarLinea(l.lineaId, { talla: e.target.value })}
                      className="border border-slate-300 rounded-md px-2 py-1.5 text-sm bg-white"
                      aria-label="Talla"
                    >
                      {p.tallas.map((t) => (
                        <option key={t} value={t}>
                          Talla {t}
                        </option>
                      ))}
                    </select>
                  )}
                  {p.colores.length > 0 && (
                    <select
                      value={l.color}
                      onChange={(e) => cambiarLinea(l.lineaId, { color: e.target.value })}
                      className="border border-slate-300 rounded-md px-2 py-1.5 text-sm bg-white"
                      aria-label="Color"
                    >
                      {p.colores.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  )}
                  <input
                    type="number"
                    min="1"
                    value={l.cantidad}
                    onChange={(e) =>
                      cambiarLinea(l.lineaId, {
                        cantidad: Math.max(1, Number(e.target.value) || 1),
                      })
                    }
                    className="w-20 border border-slate-300 rounded-md px-2 py-1.5 text-sm"
                    aria-label="Cantidad"
                  />
                  <button
                    type="button"
                    onClick={() => quitarLinea(l.lineaId)}
                    className="ml-auto text-sm text-red-600 hover:underline"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            );
          })}

          {errores.lineas && <p className="text-sm text-red-600">{errores.lineas}</p>}

          <button
            type="button"
            onClick={() => setLineas((actuales) => [...actuales, nuevaLinea()])}
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            + Agregar producto
          </button>
        </div>

        <div className={tarjeta}>
          <h2 className="font-semibold text-slate-800">Observaciones (opcional)</h2>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value.slice(0, 1000))}
            rows={3}
            className={campo}
            placeholder="Lo que el cliente indicó: plazo, lugar de entrega, consultas..."
          />
          <p className="text-xs text-slate-400 text-right">{observaciones.length}/1000</p>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white font-semibold py-2 rounded-md hover:bg-blue-700 transition"
        >
          Registrar solicitud
        </button>
      </form>
    </div>
  );
}

export default NuevaSolicitud;
