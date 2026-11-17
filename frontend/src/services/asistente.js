import { pedir } from "./api";

export async function consultarAsistente(datos) {
  return pedir("/api/asistente/consultar/", { metodo: "POST", cuerpo: datos });
}