import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCotizacion } from "../../context/CotizacionContext";
import { useAuth } from "../../context/AuthContext";
import * as solicitudesService from "../../services/solicitudes";

// Validador oficial de RUT chileno (Módulo 11)
function validarRutChileno(rutTexto) {
  const limpio = rutTexto.replace(/[.\-\s]/g, "").toUpperCase();
  if (!/^\d{7,8}[0-9K]$/.test(limpio)) return false;

  const cuerpo = limpio.slice(0, -1);
  const dvIngresado = limpio.slice(-1);

  let suma = 0;
  let multiplicador = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }

  const resto = 11 - (suma % 11);
  const dvEsperado = resto === 11 ? "0" : resto === 10 ? "K" : String(resto);
  return dvIngresado === dvEsperado;
}

export default function Cotizacion() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const { items, quitar, vaciar, actualizarCantidad } = useCotizacion();

  const [form, setForm] = useState({
    nombre: usuario?.nombre || "",
    empresa: usuario?.empresa || "",
    rutEmpresa: usuario?.rut || "",
    cargo: "",
    email: usuario?.email || "",
    telefono: usuario?.telefono || "",
    comentarios: "",
  });

  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState("");

  useEffect(() => {
    if (usuario) {
      setForm((prev) => ({
        ...prev,
        nombre: prev.nombre || usuario.nombre || "",
        email: prev.email || usuario.email || "",
        empresa: prev.empresa || usuario.empresa || "",
      }));
    }
  }, [usuario]);

  function cambiar(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Limpia el error del campo apenas el usuario empieza a corregirlo
    if (errores[name]) {
      setErrores((prev) => ({ ...prev, [name]: "" }));
    }
  }

  function validarFormulario() {
    const nuevosErrores = {};

    // 1. Nombre y Apellido: solo letras/espacios y al menos 2 palabras
    const nombreLimpio = form.nombre.trim();
    const palabrasNombre = nombreLimpio.split(/\s+/).filter(Boolean);
    if (
      palabrasNombre.length < 2 ||
      !/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(nombreLimpio) ||
      nombreLimpio.length < 5
    ) {
      nuevosErrores.nombre = "Ingresa tu nombre y apellido reales (solo letras).";
    }

    // 2. Empresa: mínimo 2 caracteres
    if (form.empresa.trim().length < 2) {
      nuevosErrores.empresa = "Ingresa un nombre de empresa válido (mínimo 2 caracteres).";
    }

    // 3. RUT Empresa: validación chilena con dígito verificador
    if (!validarRutChileno(form.rutEmpresa)) {
      nuevosErrores.rutEmpresa = "RUT inválido. Ejemplo válido: 76.543.210-3";
    }

    // 4. Correo electrónico: exige formato usuario@dominio.extension (.cl, .com, etc.)
    const regexCorreo = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
    if (!regexCorreo.test(form.email.trim())) {
      nuevosErrores.email = "Ingresa un correo válido con extensión (ej: nombre@empresa.cl).";
    }

    // 5. Teléfono (opcional, pero si lo llena debe tener al menos 8 dígitos)
    if (form.telefono.trim()) {
      const soloDigitos = form.telefono.replace(/\D/g, "");
      if (soloDigitos.length < 8 || soloDigitos.length > 15) {
        nuevosErrores.telefono = "Ingresa un número válido (ej: +56 9 1234 5678).";
      }
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  }

  async function manejarEnvio(e) {
    e.preventDefault();
    setErrorGeneral("");

    if (!validarFormulario()) return;

    if (!usuario) {
      navigate("/login");
      return;
    }
    if (items.length === 0) return;

    setEnviando(true);
    try {
      const fnCrear =
        solicitudesService.crearSolicitud ||
        solicitudesService.enviarSolicitud ||
        solicitudesService.registrarSolicitud;

      if (fnCrear) {
        await fnCrear({
          ...form,
          items: items.map((it) => ({
            producto_id: it.id,
            cantidad: it.cantidad || 1,
            talla: it.talla || "",
            color: it.color || "",
          })),
        });
      }
      vaciar();
      setExito(true);
    } catch (err) {
      setErrorGeneral(err.message || "No se pudo enviar la solicitud. Intenta nuevamente.");
    } finally {
      setEnviando(false);
    }
  }

  const inputBase =
    "w-full border rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2";
  const claseInput = (campo) =>
    `${inputBase} ${
      errores[campo]
        ? "border-red-400 bg-red-50/40 focus:ring-red-300"
        : "border-slate-300 focus:ring-[#facc15]"
    }`;
  const labelClass =
    "block text-[11px] font-bold uppercase tracking-wide text-slate-600 mb-1";

  return (
    <div className="max-w-6xl mx-auto py-4 px-4">
      <div className="text-center mb-8">
        <span className="text-xs font-extrabold uppercase tracking-widest text-[#0b192c] bg-[#facc15] px-3 py-1 rounded-full">
          Atención B2B
        </span>
        <h1 className="text-3xl font-extrabold text-[#0b192c] mt-3">
          Solicitar cotización
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Agrega productos desde el catálogo, verifica tus datos y te responderemos a la brevedad.
        </p>
      </div>

      {exito && (
        <div className="mb-6 bg-green-50 border border-green-300 text-green-900 rounded-2xl p-5 text-center space-y-2">
          <p className="font-extrabold text-base">
            {"\u{2713}"} ¡Solicitud de cotización enviada correctamente!
          </p>
          <p className="text-xs">
            Puedes hacer seguimiento del estado en tu historial de cotizaciones.
          </p>
          <Link
            to="/cliente/mis-cotizaciones"
            className="inline-block mt-2 bg-[#0b192c] text-[#facc15] text-xs font-bold px-5 py-2 rounded-full"
          >
            Ver Mis Cotizaciones →
          </Link>
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* COLUMNA IZQUIERDA: Formulario con validaciones */}
        <form
          onSubmit={manejarEnvio}
          noValidate
          className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden"
        >
          <div className="bg-[#0b192c] text-white px-6 py-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#facc15]/20 border border-[#facc15]/40 text-[#facc15] flex items-center justify-center font-bold">
              {"\u{1F4C4}"}
            </div>
            <div>
              <h2 className="font-extrabold text-base">Datos de cotización</h2>
              <p className="text-xs text-slate-300">
                {usuario
                  ? "Datos precargados desde tu cuenta registrada"
                  : "Completa el formulario para recibir tu propuesta comercial"}
              </p>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {errorGeneral && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3">
                {errorGeneral}
              </div>
            )}

            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1 mb-3">
                Datos Empresa
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Nombre y Apellido *</label>
                  <input
                    name="nombre"
                    value={form.nombre}
                    onChange={cambiar}
                    placeholder="Juan Pérez"
                    className={claseInput("nombre")}
                  />
                  {errores.nombre && (
                    <p className="text-[11px] text-red-600 font-semibold mt-1">{errores.nombre}</p>
                  )}
                </div>

                <div>
                  <label className={labelClass}>Empresa *</label>
                  <input
                    name="empresa"
                    value={form.empresa}
                    onChange={cambiar}
                    placeholder="Nombre empresa"
                    className={claseInput("empresa")}
                  />
                  {errores.empresa && (
                    <p className="text-[11px] text-red-600 font-semibold mt-1">{errores.empresa}</p>
                  )}
                </div>

                <div>
                  <label className={labelClass}>RUT Empresa *</label>
                  <input
                    name="rutEmpresa"
                    value={form.rutEmpresa}
                    onChange={cambiar}
                    placeholder="76.543.210-3"
                    className={claseInput("rutEmpresa")}
                  />
                  {errores.rutEmpresa && (
                    <p className="text-[11px] text-red-600 font-semibold mt-1">{errores.rutEmpresa}</p>
                  )}
                </div>

                <div>
                  <label className={labelClass}>Cargo</label>
                  <input
                    name="cargo"
                    value={form.cargo}
                    onChange={cambiar}
                    placeholder="Encargado de compras"
                    className={claseInput("cargo")}
                  />
                </div>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1 mb-3">
                Contacto
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Correo Electrónico *</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={cambiar}
                    placeholder="correo@empresa.cl"
                    className={claseInput("email")}
                  />
                  {errores.email && (
                    <p className="text-[11px] text-red-600 font-semibold mt-1">{errores.email}</p>
                  )}
                </div>

                <div>
                  <label className={labelClass}>Teléfono / WhatsApp</label>
                  <input
                    name="telefono"
                    value={form.telefono}
                    onChange={cambiar}
                    placeholder="+56 9 1234 5678"
                    className={claseInput("telefono")}
                  />
                  {errores.telefono && (
                    <p className="text-[11px] text-red-600 font-semibold mt-1">{errores.telefono}</p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1 mb-3">
                Información Adicional
              </p>
              <label className={labelClass}>Comentarios o requerimientos especiales</label>
              <textarea
                name="comentarios"
                value={form.comentarios}
                onChange={cambiar}
                rows={3}
                placeholder="Plazo requerido, lugar de despacho, certificaciones específicas..."
                className={claseInput("comentarios")}
              />
            </div>

            <button
              type="submit"
              disabled={items.length === 0 || enviando}
              className="w-full bg-[#facc15] hover:bg-yellow-300 text-[#0b192c] font-extrabold py-3 rounded-xl shadow-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {enviando
                ? "Enviando solicitud..."
                : !usuario
                ? "Iniciar sesión para enviar cotización"
                : "Enviar solicitud de cotización"}
            </button>
            {items.length === 0 && (
              <p className="text-[11px] text-center text-slate-400">
                Agrega productos desde el catálogo para habilitar el envío.
              </p>
            )}
          </div>
        </form>

        {/* COLUMNA DERECHA: Productos a cotizar */}
        <aside className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-[#0b192c] text-white px-5 py-4 flex items-center justify-between">
            <h2 className="font-extrabold text-sm flex items-center gap-2">
              <span className="text-[#facc15]">{"\u{1F6D2}"}</span> Productos a cotizar ({items.length})
            </h2>
            {items.length > 0 && (
              <button
                type="button"
                onClick={vaciar}
                className="text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1 rounded-lg transition"
              >
                Vaciar
              </button>
            )}
          </div>

          <div className="p-5">
            {items.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <p className="text-3xl text-slate-300">{"\u{1F4E6}"}</p>
                <p className="text-xs text-slate-500 font-semibold">Sin productos.</p>
                <Link
                  to="/catalogo"
                  className="inline-block text-xs font-extrabold text-[#0b192c] underline hover:text-blue-800"
                >
                  Ir al catálogo
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1">
                {items.map((item, idx) => (
                  <li key={`${item.id}-${item.talla}-${item.color}-${idx}`} className="py-3 flex items-center gap-3">
                    {item.imagen && (
                      <img
                        src={item.imagen}
                        alt={item.nombre}
                        className="w-12 h-12 object-contain bg-slate-50 rounded-lg border border-slate-100 p-1 shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[#0b192c] truncate">
                        {item.nombre}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {item.codigo} {item.talla && `· Talla ${item.talla}`} {item.color && `· ${item.color}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={item.cantidad || 1}
                        onChange={(e) =>
                          actualizarCantidad(item.id, Number(e.target.value), {
                            talla: item.talla,
                            color: item.color,
                          })
                        }
                        className="w-14 border border-slate-300 rounded px-2 py-1 text-xs text-center font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => quitar(item.id, { talla: item.talla, color: item.color })}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded text-xs font-bold px-2 py-1 transition"
                        title="Quitar producto"
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <Link
              to="/catalogo"
              className="mt-4 block w-full text-center border-2 border-dashed border-slate-300 hover:border-[#0b192c] text-[#0b192c] text-xs font-bold py-2.5 rounded-xl transition"
            >
              + Agregar más productos
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
