export class ErrorApi extends Error {
  constructor(mensaje, estado, detalle) {
    super(mensaje)
    this.estado = estado
    this.detalle = detalle
  }
}

function leerCookie(nombre) {
  const par = document.cookie.split('; ').find((c) => c.startsWith(nombre + '='))
  return par ? decodeURIComponent(par.split('=')[1]) : null
}

export async function pedir(ruta, { metodo = 'GET', cuerpo } = {}) {
  const headers = { Accept: 'application/json' }
  const opciones = { method: metodo, headers, credentials: 'include' }

  if (cuerpo !== undefined) {
    headers['Content-Type'] = 'application/json'
    opciones.body = JSON.stringify(cuerpo)
  }
  if (metodo !== 'GET') {
    const csrf = leerCookie('csrftoken')
    if (csrf) headers['X-CSRFToken'] = csrf
  }

  let respuesta
  try {
    respuesta = await fetch(ruta, opciones)
  } catch {
    throw new ErrorApi('No se pudo conectar con el servidor. ¿Está corriendo el backend?', 0)
  }

  let datos = null
  try {
    datos = await respuesta.json()
  } catch {
    /* respuesta sin cuerpo */
  }

  if (!respuesta.ok) {
    let mensaje = 'Ocurrió un error. Inténtalo nuevamente.'
    if (respuesta.status >= 500) mensaje = 'Error del servidor. ¿Está corriendo el backend?'
    else if (datos?.detalle || datos?.detail) mensaje = datos.detalle || datos.detail
    throw new ErrorApi(mensaje, respuesta.status, datos)
  }
  return datos
}