import { pedir, ErrorApi } from "./api";

// Roles del backend → roles que usa el front
const ROLES = { administradora: "admin", cliente: "cliente", validadora: "validadora" };

export function adaptarUsuario(p) {
  return {
    email: p.email,
    nombre: p.first_name || p.email,
    rol: ROLES[p.rol] ?? "cliente",
    verificado: p.correo_verificado,
    empresa: p.empresa ?? null,
  };
}

export async function iniciarSesion(correo, password) {
  await pedir("/api/usuarios/csrf/"); // deja la cookie CSRF lista
  const perfil = await pedir("/api/usuarios/login/", {
    metodo: "POST",
    cuerpo: { correo, password },
  });
  return adaptarUsuario(perfil);
}

export async function cerrarSesion() {
  await pedir("/api/usuarios/logout/", { metodo: "POST" });
}

// Devuelve el usuario, o null si no hay sesión. Si el backend no responde, lanza el error.
export async function obtenerSesion() {
  try {
    return adaptarUsuario(await pedir("/api/usuarios/perfil/"));
  } catch (e) {
    if (e instanceof ErrorApi && (e.estado === 401 || e.estado === 403)) return null;
    throw e;
  }
}


export async function registrarCuenta(datos) {
  await pedir("/api/usuarios/csrf/");
  return pedir("/api/usuarios/registro/", { metodo: "POST", cuerpo: datos });
}

export async function verificarCorreo(token) {
  return pedir("/api/usuarios/verificar-correo/", { metodo: "POST", cuerpo: { token } });
}

export async function reenviarVerificacion(correo) {
  return pedir("/api/usuarios/reenviar-verificacion/", { metodo: "POST", cuerpo: { correo } });
}