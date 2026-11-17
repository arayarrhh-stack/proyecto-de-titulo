import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

    async function handleSubmit(e) {
      e.preventDefault();
      setError("");
      setEnviando(true);
      try {
        const usuario = await login(email, password);
        const destino = location.state?.from;
        navigate(destino ?? (usuario.rol === "admin" ? "/admin/cotizaciones" : "/"));
      } catch (err) {
        setError(err.message);
      } finally {
        setEnviando(false);
      }
    }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-lg shadow w-full max-w-sm space-y-4"
      >
        <h1 className="text-2xl font-bold text-slate-800 text-center">Iniciar sesión</h1>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Correo</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="correo@empresa.com"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="••••••••"
            required
          />
          {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
        </div>

        <button
          type="submit"
          disabled={enviando}
          className="w-full bg-blue-600 text-white font-semibold py-2 rounded-md hover:bg-blue-700 transition disabled:opacity-60"
        >
          {enviando ? "Entrando…" : "Entrar"}
        </button>

        <p className="text-sm text-slate-500 text-center">
          ¿No tienes cuenta?{" "}
          <Link to="/registro" className="text-blue-600 font-medium hover:underline">
            Regístrate
          </Link>
        </p>
      </form>
    </div>
  );
}

export default Login;