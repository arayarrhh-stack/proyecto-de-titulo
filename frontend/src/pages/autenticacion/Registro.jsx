import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { formatearRut, validarRut } from "../../utils/rut";
import { registrarCuenta } from "../../services/auth";
const campo =
  "w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500";
const etiqueta = "block text-sm font-medium text-slate-600 mb-1";

// Nombre del campo en el servidor → nombre del campo en este formulario
const CAMPOS_SERVIDOR = {
  rut_empresa: "rut",
  razon_social: "razonSocial",
  nombre_contacto: "nombre",
  cargo: "cargo",
  correo: "email",
  telefono: "telefono",
  password: "password",
  acepta_politica: "politica",
};

function MensajeError({ texto }) {
  return texto ? <p className="text-sm text-red-600 mt-1">{texto}</p> : null;
}

function interpretarErrorServidor(err) {
  const campos = {};
  let general = "";
  const datos = err.detalle;

  if (datos && typeof datos === "object") {
    for (const [clave, valor] of Object.entries(datos)) {
      const texto = Array.isArray(valor) ? valor.join(" ") : String(valor);
      if (CAMPOS_SERVIDOR[clave]) {
        campos[CAMPOS_SERVIDOR[clave]] = texto;
      } else if (clave === "detalle") {
        if (/RUT/.test(texto)) campos.rut = texto;
        else if (/correo/i.test(texto)) campos.email = texto;
        else general = texto;
      } else {
        general = texto;
      }
    }
  }
  if (Object.keys(campos).length === 0 && !general) general = err.message;
  return { campos, general };
}

function Registro() {
  const [tipo, setTipo] = useState("persona");
  const [razonSocial, setRazonSocial] = useState("");
  const [rut, setRut] = useState("");
  const [nombre, setNombre] = useState("");
  const [cargo, setCargo] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [aceptaPolitica, setAceptaPolitica] = useState(false);
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState("");
  const [enviando, setEnviando] = useState(false);
  const navigate = useNavigate();

  const esEmpresa = tipo === "empresa";

  async function handleSubmit(e) {
    e.preventDefault();
    const nuevos = {};

    if (!validarRut(rut)) {
      nuevos.rut = "El RUT no es válido. Revisa el número y el dígito verificador.";
    }

    const tieneMayuscula = /[A-Z]/.test(password);
    const tieneNumero = /[0-9]/.test(password);
    if (password.length < 8 || !tieneMayuscula || !tieneNumero) {
      nuevos.password =
        "La contraseña debe tener al menos 8 caracteres, una mayúscula y un número.";
    } else if (password !== confirmPassword) {
      nuevos.confirmPassword = "Las contraseñas no coinciden";
    }

    if (!aceptaPolitica) {
      nuevos.politica = "Debes aceptar la política de privacidad para registrarte.";
    }

    setErrores(nuevos);
    setErrorGeneral("");
    if (Object.keys(nuevos).length > 0) return;

    setEnviando(true);
    try {
      await registrarCuenta({
        tipo_cliente: tipo,
        razon_social: esEmpresa ? razonSocial.trim() : "",
        rut_empresa: rut,
        nombre_contacto: nombre.trim(),
        cargo: esEmpresa ? cargo.trim() : "",
        correo: email.trim(),
        telefono: telefono.trim(),
        password,
        acepta_politica: aceptaPolitica,
      });
      navigate("/verificar-correo", { state: { email: email.trim() } });
    } catch (err) {
      const { campos, general } = interpretarErrorServidor(err);
      setErrores(campos);
      setErrorGeneral(general);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-lg shadow w-full max-w-lg space-y-4"
      >
        <h1 className="text-2xl font-bold text-slate-800 text-center">
          Crear cuenta
        </h1>

        <div className="grid grid-cols-2 gap-2">
          {[
            { valor: "persona", texto: "Persona" },
            { valor: "empresa", texto: "Empresa" },
          ].map((opcion) => (
            <button
              key={opcion.valor}
              type="button"
              onClick={() => setTipo(opcion.valor)}
              className={`py-2 rounded-md text-sm font-medium border transition ${
                tipo === opcion.valor
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
              }`}
            >
              {opcion.texto}
            </button>
          ))}
        </div>

        {esEmpresa && (
          <div>
            <label className={etiqueta}>Razón social</label>
            <input
              type="text"
              value={razonSocial}
              onChange={(e) => setRazonSocial(e.target.value)}
              className={campo}
              placeholder="Eléctrica del Norte SpA"
              required
            />
            <MensajeError texto={errores.razonSocial} />
          </div>
        )}

        <div>
          <label className={etiqueta}>
            {esEmpresa ? "RUT de la empresa" : "RUT"}
          </label>
          <input
            type="text"
            value={rut}
            onChange={(e) => setRut(formatearRut(e.target.value))}
            className={campo}
            placeholder={esEmpresa ? "76.123.456-0" : "12.345.678-5"}
            maxLength={12}
            required
          />
          <MensajeError texto={errores.rut} />
        </div>

        <div className={esEmpresa ? "grid grid-cols-1 sm:grid-cols-2 gap-4" : ""}>
          <div>
            <label className={etiqueta}>
              {esEmpresa ? "Nombre del contacto" : "Nombre completo"}
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className={campo}
              placeholder="Juan Pérez"
              required
            />
            <MensajeError texto={errores.nombre} />
          </div>
          {esEmpresa && (
            <div>
              <label className={etiqueta}>Cargo</label>
              <input
                type="text"
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
                className={campo}
                placeholder="Jefe de compras"
                required
              />
              <MensajeError texto={errores.cargo} />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={etiqueta}>Correo</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={campo}
              placeholder="correo@ejemplo.com"
              required
            />
            <MensajeError texto={errores.email} />
          </div>
          <div>
            <label className={etiqueta}>Teléfono</label>
            <input
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className={campo}
              placeholder="+56 9 1234 5678"
              required
            />
            <MensajeError texto={errores.telefono} />
          </div>
        </div>

        <div>
          <label className={etiqueta}>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={campo}
            placeholder="••••••••"
            required
          />
          <p className="text-xs text-slate-400 mt-1">
            Mínimo 8 caracteres, con al menos una mayúscula y un número.
          </p>
          <MensajeError texto={errores.password} />
        </div>

        <div>
          <label className={etiqueta}>Confirmar contraseña</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={campo}
            placeholder="••••••••"
            required
          />
          <MensajeError texto={errores.confirmPassword} />
        </div>

        <div>
          <label className="flex items-start gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={aceptaPolitica}
              onChange={(e) => setAceptaPolitica(e.target.checked)}
              className="mt-1"
            />
            <span>Acepto la política de privacidad de ACOMSE.</span>
          </label>
          <MensajeError texto={errores.politica} />
        </div>

        {errorGeneral && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">
            {errorGeneral}
          </p>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="w-full bg-blue-600 text-white font-semibold py-2 rounded-md hover:bg-blue-700 transition disabled:opacity-60"
        >
          {enviando ? "Registrando…" : "Registrarse"}
        </button>

        <p className="text-sm text-slate-500 text-center">
          ¿Ya tienes cuenta?{" "}
          <Link to="/login" className="text-blue-600 font-medium hover:underline">
            Inicia sesión
          </Link>
        </p>
      </form>
    </div>
  );
}

export default Registro;
