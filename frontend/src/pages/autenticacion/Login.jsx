import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function manejarSubmit(e) {
    e.preventDefault();
    setError("");
    setCargando(true);

    try {
      const respuesta = await login(email.trim(), password);
      const rol = respuesta?.rol || respuesta?.usuario?.rol;

      if (rol === "admin") {
        navigate("/admin");
      } else if (rol === "validadora") {
        navigate("/validadora");
      } else {
        navigate("/cliente/mis-cotizaciones");
      }
    } catch (err) {
      setError(err.message || "Credenciales incorrectas. Verifica tu correo y contraseña.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center bg-slate-100 px-4 py-12">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden">
        <div className="bg-[#0b192c] text-white px-6 py-6 text-center border-b-4 border-[#facc15]">
          <h1 className="text-2xl font-extrabold tracking-tight">Iniciar Sesión</h1>
          <p className="text-xs text-slate-300 mt-1">
            Accede a tu portal B2B de ACOMSE
          </p>
        </div>

        <form onSubmit={manejarSubmit} className="p-6 sm:p-8 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl p-3 text-center">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-1.5">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="cliente@acomse.cl"
              className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#facc15]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-1.5">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#facc15]"
            />
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-[#facc15] hover:bg-yellow-300 text-[#0b192c] font-extrabold text-sm py-3 rounded-xl shadow-sm transition disabled:opacity-50"
          >
            {cargando ? "Ingresando..." : "Ingresar"}
          </button>

          <p className="text-xs text-center text-slate-500 pt-2">
            ¿Aún no tienes cuenta?{" "}
            <Link to="/registro" className="font-bold text-[#0b192c] hover:underline">
              Regístrate aquí
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

