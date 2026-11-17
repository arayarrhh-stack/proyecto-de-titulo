import { pedir } from "./api";

// items = los de CotizacionContext: { id, talla, color, cantidad, ... }
export async function enviarSolicitud(items, observaciones = "") {
  return pedir("/api/cotizaciones/solicitudes/", {
    metodo: "POST",
    cuerpo: {
      items: items.map((i) => ({
        producto_id: i.id,
        talla: i.talla ?? "",
        color: i.color ?? "",
        cantidad: i.cantidad,
      })),
      observaciones,
    },
  });
}

export async function listarSolicitudes() {
  return pedir("/api/cotizaciones/solicitudes/");
}

export async function registrarCotizacionProveedor(datos) {
  return pedir("/api/cotizaciones/proveedor/registrar/", {
    metodo: "POST",
    cuerpo: datos,
  });
}

export async function listarCotizacionesProveedor(solicitudId) {
  return pedir(`/api/cotizaciones/proveedor/registrar/?solicitud_id=${solicitudId}`);
}

export async function emitirOferta(datos) {
  return pedir("/api/cotizaciones/ofertas/", { metodo: "POST", cuerpo: datos });
}

export async function listarOfertas() {
  return pedir("/api/cotizaciones/ofertas/");
}

export async function responderOferta(ofertaId, datos) {
  return pedir(`/api/cotizaciones/ofertas/${ofertaId}/responder/`, {
    metodo: "POST",
    cuerpo: datos,
  });
}

export async function listarPedidos() {
  return pedir("/api/cotizaciones/pedidos/");
}