import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { verificarCorreo, reenviarVerificacion } from "../services/auth";

function VerificarCorreo() {
  const { state } = useLocation();
  const [params] = useSearchParams();
  const token = params.get("token");
  const email = state?.email;

  // verificando | activada | error | pendiente
  const [estado, setEstado] = useState(token ? "verificando" : "pendiente");
  const [mensaje, setMensaje] = useState("");
  const [correoReenvio, setCorreoReenvio] = useState(email ?? "");
  const [reenviando, setReenviando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [errorReenvio, setErrorReenvio] = useState("");

  useEffect(() => {
    if (!token) return;
    let activo = true;
    verificarCorreo(token)
      .then((r) => {
        if (!activo) return;
        setEstado("activada");
        setMensaje(r.mensaje);
      })
      .catch((e) => {
        if (!activo) return;
        setEstado("error");
        setMensaje(e.message);
      });
    return () => {
      activo = false;
    };
  }, [token]);

  async function reenviar(e) {
    e.preventDefault();
    setAviso("");
    setErrorReenvio("");
    if (!correoReenvio.trim()) {
      setErrorReenvio("Indica el correo con el que te registraste.");
      return;
    }
    setReenviando(true);
    try {
      const r = await reenviarVerificacion(correoReenvio.trim());
      setAviso(r.mensaje);
    } catch (err) {
      setErrorReenvio(
        err.estado === 429 ? "Hiciste demasiados intentos. Inténtalo más tarde." : err.message
      );
    } finally {
      setReenviando(false);
    }
  }

  const formularioReenvio = (
    <form onSubmit={reenviar} className="space-y-3 text-left">
      {!email && (
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Tu correo</label>
          <input
            type="email"
            value={correoReenvio}
            onChange={(e) => setCorreoReenvio(e.target.value)}
            className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="correo@ejemplo.com"
          />
        </div>
      )}
      <button
        type="submit"
        disabled={reenviando}
        className="w-full border border-blue-600 text-blue-600 font-medium py-2 rounded-md hover:bg-blue-50 transition disabled:opacity-60"
      >
        {reenviando ? "Enviando…" : "Reenviar correo de activación"}
      </button>
      {aviso && <p className="text-sm text-green-700 text-center">{aviso}</p>}
      {errorReenvio && <p className="text-sm text-red-600 text-center">{errorReenvio}</p>}
    </form>
  );

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-lg shadow w-full max-w-md text-center space-y-4">
        {estado === "verificando" && (
          <>
            <h1 className="text-2xl font-bold text-slate-800">Activando tu cuenta…</h1>
            <p className="text-slate-500">Un momento por favor.</p>
          </>
        )}

        {estado === "activada" && (
          <>
            <h1 className="text-2xl font-bold text-slate-800">¡Cuenta activada!</h1>
            <p className="text-slate-600">{mensaje}</p>
            <Link
              to="/login"
              className="block w-full bg-blue-600 text-white font-semibold py-2 rounded-md hover:bg-blue-700 transition"
            >
              Iniciar sesión
            </Link>
          </>
        )}

        {estado === "error" && (
          <>
            <h1 className="text-2xl font-bold text-slate-800">No pudimos activar tu cuenta</h1>
            <p className="text-red-700">{mensaje}</p>
            {formularioReenvio}
            <Link to="/login" className="block text-sm text-blue-600 hover:underline">
              Ir a iniciar sesión
            </Link>
          </>
        )}

        {estado === "pendiente" && (
          <>
            <h1 className="text-2xl font-bold text-slate-800">Revisa tu correo</h1>
            <p className="text-slate-600">
              {email ? (
                <>
                  Enviamos un enlace de activación a{" "}
                  <span className="font-semibold">{email}</span>.
                </>
              ) : (
                "Enviamos un enlace de activación a tu correo."
              )}{" "}
              El enlace caduca a las 48 horas.
            </p>
            <p className="text-sm text-slate-500">
              Hasta que actives tu cuenta no podrás enviar solicitudes de cotización.
            </p>
            {formularioReenvio}
            <Link to="/login" className="block text-sm text-blue-600 hover:underline">
              Ir a iniciar sesión
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default VerificarCorreo;