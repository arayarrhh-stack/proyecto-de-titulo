import { useState } from "react";
import { guardarMensaje } from "../../services/mensajes";

const ASUNTOS = [
  "Solicitud de Cotización",
  "Consultas o Asesorías (Comercial)",
  "Otras consultas (No comercial)",
  "Reclamos",
];

const SUCURSALES = [
  "Arica (Casa Matriz)",
  "Iquique",
  "Antofagasta",
  "Santiago",
  "Atención Online / Todo Chile",
];

function validarRutChileno(rutTexto) {
  const limpio = rutTexto.replace(/[.\-\s]/g, "").toUpperCase();
  if (!/^\d{7,8}[0-9K]$/.test(limpio)) return false;
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  let suma = 0;
  let mult = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * mult;
    mult = mult === 7 ? 2 : mult + 1;
  }
  const resto = 11 - (suma % 11);
  const esperado = resto === 11 ? "0" : resto === 10 ? "K" : String(resto);
  return dv === esperado;
}

export default function SeccionPorQueElegirnos() {
  const [form, setForm] = useState({
    nombre: "",
    empresa: "",
    rutEmpresa: "",
    email: "",
    asunto: "",
    sucursal: "",
    mensaje: "",
  });

  const [errores, setErrores] = useState({});
  const [enviado, setEnviado] = useState(false);

  function cambiar(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errores[name]) setErrores((prev) => ({ ...prev, [name]: "" }));
  }

  function validar() {
    const e = {};
    if (form.nombre.trim().length < 3) e.nombre = "Ingresa tu nombre completo.";
    if (form.empresa.trim().length < 2) e.empresa = "Ingresa el nombre de la empresa.";
    if (!validarRutChileno(form.rutEmpresa)) e.rutEmpresa = "RUT inválido (ej: 76.543.210-3).";
    if (!/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(form.email.trim())) {
      e.email = "Ingresa un correo válido (ej: contacto@empresa.cl).";
    }
    if (!form.asunto) e.asunto = "Selecciona un elemento de la lista.";
    if (!form.sucursal) e.sucursal = "Selecciona tu sucursal más cercana.";
    if (form.mensaje.trim().length < 5) e.mensaje = "Escribe tu consulta o requerimiento.";

    setErrores(e);
    return Object.keys(e).length === 0;
  }

  function manejarEnvio(ev) {
    ev.preventDefault();
    if (!validar()) return;

    guardarMensaje(form);
    setEnviado(true);
    setForm({
      nombre: "",
      empresa: "",
      rutEmpresa: "",
      email: "",
      asunto: "",
      sucursal: "",
      mensaje: "",
    });
  }

  const inputBase =
    "w-full border rounded-lg px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2";
  const claseInput = (campo) =>
    `${inputBase} ${
      errores[campo]
        ? "border-red-400 bg-red-50/40 focus:ring-red-300"
        : "border-slate-300 focus:ring-[#facc15]"
    }`;
  const labelClass =
    "block text-[11px] font-extrabold uppercase tracking-wide text-[#0b192c] mb-1";

  return (
    <section id="nosotros" className="bg-slate-100/80 py-14 px-6 border-t border-slate-200">
      <div className="max-w-[1400px] mx-auto grid lg:grid-cols-2 gap-8 items-stretch">
        {/* MITAD IZQUIERDA: Misión de ACOMSE */}
        <div className="bg-[#0b192c] text-white rounded-2xl p-8 sm:p-10 shadow-md flex flex-col justify-between border-t-4 border-[#facc15]">
          <div className="space-y-5">
            <div>
              <span className="inline-block text-[11px] font-extrabold uppercase tracking-widest text-[#0b192c] bg-[#facc15] px-3 py-1 rounded-full">
                Sobre Nosotros
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold mt-4 leading-tight">
                Nuestra Misión en <span className="text-[#facc15]">ACOMSE</span>
              </h2>
              <div className="h-1 w-16 bg-[#facc15] mt-3 rounded"></div>
            </div>

            <p className="text-slate-200 text-sm sm:text-base leading-relaxed">
              En <strong>ACOMSE</strong> tenemos la misión de proteger la vida e integridad de los trabajadores de la industria eléctrica y productiva de Chile, suministrando elementos de protección personal (EPP) dieléctricos certificados bajo los más altos estándares internacionales.
            </p>

            <p className="text-slate-300 text-sm leading-relaxed">
              Acompañamos a cada empresa con asesoría técnica especializada, cotizaciones ágiles y trazabilidad en cada pedido, garantizando soluciones confiables para trabajos en baja, media y alta tensión.
            </p>

            <div className="grid sm:grid-cols-3 gap-3 pt-2">
              <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
                <p className="text-[#facc15] font-extrabold text-sm">Certificación</p>
                <p className="text-xs text-slate-300 mt-1">
                  Normativas IEC y ASTM vigentes en cada equipo.
                </p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
                <p className="text-[#facc15] font-extrabold text-sm">Asesoría B2B</p>
                <p className="text-xs text-slate-300 mt-1">
                  Soporte técnico directo para empresas y faenas.
                </p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
                <p className="text-[#facc15] font-extrabold text-sm">Cobertura</p>
                <p className="text-xs text-slate-300 mt-1">
                  Atención desde Arica con despacho a todo Chile.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-5 border-t border-white/10 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-300">
            <span>{"\u{1F4E7}"} ventas@acomse.cl</span>
            <span>{"\u{1F4DE}"} +56 2 2345 6789</span>
            <span>{"\u{1F552}"} Lun - Vie: 08:30 a 18:00 hrs</span>
          </div>
        </div>

        {/* MITAD DERECHA: Formulario de consulta al Administrador */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden flex flex-col">
          <div className="bg-[#0b192c] text-white px-6 py-4 flex items-center gap-3 border-b-4 border-[#facc15]">
            <div className="w-9 h-9 rounded-xl bg-[#facc15]/15 border border-[#facc15]/50 text-[#facc15] flex items-center justify-center text-base shrink-0">
              {"\u{2709}\u{FE0F}"}
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">¿Tienes alguna consulta?</h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Envíanos un mensaje y te responderemos a la brevedad.
              </p>
            </div>
          </div>

          <form onSubmit={manejarEnvio} noValidate className="p-6 space-y-4 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              {enviado && (
                <div className="bg-green-50 border border-green-300 text-green-900 rounded-xl p-3.5 text-xs text-center font-semibold">
                  {"\u{2713}"} ¡Mensaje enviado con éxito! El equipo administrador de ACOMSE revisará tu consulta.
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="nombre"
                    value={form.nombre}
                    onChange={cambiar}
                    placeholder="Ingrese su nombre"
                    className={claseInput("nombre")}
                  />
                  {errores.nombre && (
                    <p className="text-[11px] text-red-600 font-semibold mt-1">{errores.nombre}</p>
                  )}
                </div>

                <div>
                  <label className={labelClass}>
                    Nombre Empresa <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="empresa"
                    value={form.empresa}
                    onChange={cambiar}
                    placeholder="Ingrese el nombre de la empresa"
                    className={claseInput("empresa")}
                  />
                  {errores.empresa && (
                    <p className="text-[11px] text-red-600 font-semibold mt-1">{errores.empresa}</p>
                  )}
                </div>

                <div>
                  <label className={labelClass}>
                    RUT Empresa <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="rutEmpresa"
                    value={form.rutEmpresa}
                    onChange={cambiar}
                    placeholder="Ej: 76.543.210-3"
                    className={claseInput("rutEmpresa")}
                  />
                  {errores.rutEmpresa && (
                    <p className="text-[11px] text-red-600 font-semibold mt-1">{errores.rutEmpresa}</p>
                  )}
                </div>

                <div>
                  <label className={labelClass}>
                    Correo Electrónico <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={cambiar}
                    placeholder="contacto@empresa.cl"
                    className={claseInput("email")}
                  />
                  {errores.email && (
                    <p className="text-[11px] text-red-600 font-semibold mt-1">{errores.email}</p>
                  )}
                </div>

                <div>
                  <label className={labelClass}>
                    Asunto <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="asunto"
                    value={form.asunto}
                    onChange={cambiar}
                    className={claseInput("asunto")}
                  >
                    <option value="">Seleccione el asunto</option>
                    {ASUNTOS.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                  {errores.asunto && (
                    <p className="text-[11px] text-red-600 font-semibold mt-1">
                      {"\u{26A0}"} {errores.asunto}
                    </p>
                  )}
                </div>

                <div>
                  <label className={labelClass}>
                    Sucursal <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="sucursal"
                    value={form.sucursal}
                    onChange={cambiar}
                    className={claseInput("sucursal")}
                  >
                    <option value="">Seleccione su sucursal</option>
                    {SUCURSALES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  {errores.sucursal && (
                    <p className="text-[11px] text-red-600 font-semibold mt-1">{errores.sucursal}</p>
                  )}
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  Mensaje <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="mensaje"
                  value={form.mensaje}
                  onChange={cambiar}
                  rows={3}
                  placeholder="Ingrese su consulta o requerimiento"
                  className={claseInput("mensaje")}
                />
                {errores.mensaje && (
                  <p className="text-[11px] text-red-600 font-semibold mt-1">{errores.mensaje}</p>
                )}
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="submit"
                className="w-full bg-[#facc15] hover:bg-yellow-300 text-[#0b192c] font-extrabold text-sm py-3 rounded-xl shadow-sm transition flex items-center justify-center gap-2"
              >
                <span>{"\u{2708}\u{FE0F}"}</span> Enviar mensaje
              </button>
              <p className="text-[11px] text-center text-slate-400">
                Tu información es confidencial y nunca será compartida con terceros.
              </p>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
