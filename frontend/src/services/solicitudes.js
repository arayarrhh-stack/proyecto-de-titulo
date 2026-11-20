import { pedir } from "./api";

// Acepta enviarSolicitud(items, observaciones) o enviarSolicitud({ items, empresa, rut, comentarios, ... })
export async function enviarSolicitud(itemsOObjeto, observaciones = "") {
  let listaItems = itemsOObjeto;
  let textoObs = observaciones;

  if (!Array.isArray(itemsOObjeto) && itemsOObjeto && typeof itemsOObjeto === "object") {
    listaItems = itemsOObjeto.items || itemsOObjeto.productos || [];
    const partes = [];
    if (itemsOObjeto.empresa) partes.push(`Empresa: ${itemsOObjeto.empresa}`);
    if (itemsOObjeto.rut) partes.push(`RUT: ${itemsOObjeto.rut}`);
    if (itemsOObjeto.cargo) partes.push(`Cargo: ${itemsOObjeto.cargo}`);
    if (itemsOObjeto.telefono) partes.push(`Teléfono: ${itemsOObjeto.telefono}`);
    const extra = itemsOObjeto.observaciones || itemsOObjeto.comentarios || "";
    if (extra) partes.push(extra);
    textoObs = partes.join(" | ");
  }

  return pedir("/api/cotizaciones/solicitudes/", {
    metodo: "POST",
    cuerpo: {
      items: (Array.isArray(listaItems) ? listaItems : []).map((i) => ({
        producto_id: i.producto_id ?? i.id,
        talla: i.talla ?? "",
        color: i.color ?? "",
        cantidad: Number(i.cantidad) || 1,
      })),
      observaciones: textoObs,
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
