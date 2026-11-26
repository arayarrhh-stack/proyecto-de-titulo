import { pedir } from "./api";

export function enviarMensaje(datos) {
  return pedir("/api/analitica/institucional/", {
    metodo: "POST",
    cuerpo: {
      nombre: datos.nombre,
      empresa: datos.empresa,
      rut_empresa: datos.rutEmpresa,
      correo: datos.email,
      asunto: datos.asunto,
      sucursal: datos.sucursal,
      mensaje: datos.mensaje,
    },
  });
}

export function listarMensajes() {
  return pedir("/api/analitica/mensajes/");
}

export function marcarMensajeLeido(id, leido = true) {
  return pedir(`/api/analitica/mensajes/${id}/`, { metodo: "PATCH", cuerpo: { leido } });
}

export function eliminarMensaje(id) {
  return pedir(`/api/analitica/mensajes/${id}/`, { metodo: "DELETE" });
}