const CLAVE_MENSAJES = "acomse_mensajes_contacto";

export function listarMensajes() {
  try {
    const raw = localStorage.getItem(CLAVE_MENSAJES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function guardarMensaje(datos) {
  const actuales = listarMensajes();
  const nuevo = {
    id: Date.now(),
    ...datos,
    fecha: new Date().toLocaleString("es-CL", {
      dateStyle: "short",
      timeStyle: "short",
    }),
    leido: false,
  };
  localStorage.setItem(CLAVE_MENSAJES, JSON.stringify([nuevo, ...actuales]));
  return nuevo;
}

export function marcarMensajeLeido(id, leido = true) {
  const actualizados = listarMensajes().map((m) =>
    m.id === id ? { ...m, leido } : m
  );
  localStorage.setItem(CLAVE_MENSAJES, JSON.stringify(actualizados));
  return actualizados;
}

export function eliminarMensaje(id) {
  const restantes = listarMensajes().filter((m) => m.id !== id);
  localStorage.setItem(CLAVE_MENSAJES, JSON.stringify(restantes));
  return restantes;
}
