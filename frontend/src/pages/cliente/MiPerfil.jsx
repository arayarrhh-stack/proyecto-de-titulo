import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { actualizarPerfil } from "../../services/auth";
import { pedir } from "../../services/api";

function Campo({ etiqueta, children, ayuda }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-slate-600">{etiqueta}</span>
      <div className="mt-1">{children}</div>
      {ayuda && <span className="text-[11px] text-slate-400">{ayuda}</span>}
    </label>
  );
}

const ESTILO_INPUT =
  "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#facc15]";

export default function MiPerfil() {
  const { usuario, actualizarUsuario } = useAuth();
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    pedir("/api/usuarios/perfil/")
      .then((p) =>
        setForm({
          nombre: p.first_name || "",
          cargo: p.cargo || "",
          razon_social: p.empresa?.razon_social || "",
          rut: p.empresa?.rut || "",
          direccion: p.empresa?.direccion || "",
          telefono: p.empresa?.telefono || "",
          tieneEmpresa: Boolean(p.empresa),
        })
      )
      .catch(() => setError("No se pudo cargar tu perfil. Inténtalo nuevamente."));
  }, []);

  function cambiar(campo, valor) {
    setExito("");
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function guardar(e) {
    e.preventDefault();
    setError("");
    setExito("");
    setGuardando(true);
    try {
      const datos = { nombre: form.nombre, cargo: form.cargo };
      if (form.tieneEmpresa) {
        datos.razon_social = form.razon_social;
        datos.direccion = form.direccion;
        datos.telefono = form.telefono;
      }
      const nuevo = await actualizarPerfil(datos);
      actualizarUsuario(nuevo);
      setExito("Tus datos se guardaron correctamente.");
    } catch (err) {
      const detalle = err?.detalle || err?.datos || null;
      const texto =
        typeof detalle === "string"
          ? detalle
          : detalle && typeof detalle === "object"
          ? Object.values(detalle).flat().join(" ")
          : err?.message;
      setError(texto || "No se pudieron guardar los cambios.");
    } finally {
      setGuardando(false);
    }
  }

  if (!form) {
    return (
      <div className="p-6 text-sm text-slate-500">{error || "Cargando tu perfil…"}</div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#0b192c]">Mi perfil</h1>
        <div className="h-1 w-14 bg-[#facc15] mt-1 rounded"></div>
        <p className="text-sm text-slate-500 mt-2">
          Actualiza tus datos de contacto y de facturación. Se usarán en tus cotizaciones y ofertas.
        </p>
      </div>

      <form onSubmit={guardar} className="space-y-6">
        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-extrabold text-[#0b192c]">Datos de contacto</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Campo etiqueta="Nombre de contacto">
              <input
                className={ESTILO_INPUT}
                value={form.nombre}
                onChange={(e) => cambiar("nombre", e.target.value)}
                required
              />
            </Campo>
            <Campo etiqueta="Cargo">
              <input
                className={ESTILO_INPUT}
                value={form.cargo}
                onChange={(e) => cambiar("cargo", e.target.value)}
              />
            </Campo>
            <Campo etiqueta="Correo electrónico" ayuda="El correo es tu usuario y no se puede cambiar aquí.">
              <input className={`${ESTILO_INPUT} bg-slate-100`} value={usuario?.email || ""} disabled />
            </Campo>
            {form.tieneEmpresa && (
              <Campo etiqueta="Teléfono">
                <input
                  className={ESTILO_INPUT}
                  value={form.telefono}
                  onChange={(e) => cambiar("telefono", e.target.value)}
                  placeholder="+56 9 1234 5678"
                />
              </Campo>
            )}
          </div>
        </section>

        {form.tieneEmpresa && (
          <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-extrabold text-[#0b192c]">Datos de facturación</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Campo etiqueta="Razón social o nombre">
                <input
                  className={ESTILO_INPUT}
                  value={form.razon_social}
                  onChange={(e) => cambiar("razon_social", e.target.value)}
                  required
                />
              </Campo>
              <Campo etiqueta="RUT" ayuda="Para cambiar el RUT, escríbenos desde el formulario de contacto.">
                <input className={`${ESTILO_INPUT} bg-slate-100`} value={form.rut} disabled />
              </Campo>
              <div className="sm:col-span-2">
                <Campo etiqueta="Dirección de facturación">
                  <input
                    className={ESTILO_INPUT}
                    value={form.direccion}
                    onChange={(e) => cambiar("direccion", e.target.value)}
                  />
                </Campo>
              </div>
            </div>
          </section>
        )}

        {error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        {exito && (
          <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            {exito}
          </p>
        )}

        <button
          type="submit"
          disabled={guardando}
          className="bg-[#0b192c] hover:bg-slate-800 disabled:opacity-60 text-[#facc15] text-sm font-bold px-5 py-2.5 rounded-xl transition"
        >
          {guardando ? "Guardando…" : "Guardar cambios"}
        </button>
      </form>
    </div>
  );
}