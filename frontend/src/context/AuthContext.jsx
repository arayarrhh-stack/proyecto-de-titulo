import { createContext, useContext, useEffect, useState } from "react";
import { iniciarSesion, cerrarSesion, obtenerSesion } from "../services/auth";

const AuthContext = createContext();

function leerUsuarioGuardado() {
  try {
    const guardado = localStorage.getItem("usuario");
    return guardado ? JSON.parse(guardado) : null;
  } catch {
    return null;
  }
}

function guardarUsuario(usuario) {
  try {
    if (usuario) localStorage.setItem("usuario", JSON.stringify(usuario));
    else localStorage.removeItem("usuario");
  } catch {
    // si el navegador no permite guardar, la sesión dura hasta recargar
  }
}

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(leerUsuarioGuardado);

  // Al abrir la página, confirma con el backend si la sesión sigue activa
  useEffect(() => {
    let activo = true;
    obtenerSesion()
      .then((u) => {
        if (!activo) return;
        setUsuario(u);
        guardarUsuario(u);
      })
      .catch(() => {
        // backend apagado: se mantiene la copia guardada
      });
    return () => {
      activo = false;
    };
  }, []);

  // Lanza un error con mensaje amigable si las credenciales son incorrectas
  async function login(email, password) {
    const sesion = await iniciarSesion(email, password);
    setUsuario(sesion);
    guardarUsuario(sesion);
    return sesion;
  }

  async function logout() {
    setUsuario(null);
    guardarUsuario(null);
    try {
      await cerrarSesion();
    } catch {
      // la sesión local ya se cerró
    }
  }

  return (
    <AuthContext.Provider value={{ usuario, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}