import { pedir } from "./api";

export function listarClientes(termino = "") {
  const q = termino.trim();
  return pedir(`/api/usuarios/clientes/${q ? `?q=${encodeURIComponent(q)}` : ""}`);
}

export function obtenerCliente(id) {
  return pedir(`/api/usuarios/clientes/${id}/`);
}