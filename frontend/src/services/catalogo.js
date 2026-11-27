import { pedir } from "./api";

const CLAVE_EXTRAS = "acomse_productos_extras";

// Limpia claves antiguas que ya no se usan para liberar espacio en localStorage
try {
  localStorage.removeItem("acomse_productos_locales");
  localStorage.removeItem("acomse_productos_eliminados");
} catch {}

function unicos(lista) {
  return [...new Set((lista || []).filter(Boolean))];
}

function leerExtras() {
  try {
    const raw = localStorage.getItem(CLAVE_EXTRAS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function guardarExtra(id, extra) {
  try {
    const mapa = leerExtras();
    mapa[String(id)] = { ...(mapa[String(id)] || {}), ...extra };
    localStorage.setItem(CLAVE_EXTRAS, JSON.stringify(mapa));
  } catch {
    // Si aun así supera la cuota, guarda solo texto (tallas/colores) sin las imágenes
    try {
      const mapa = leerExtras();
      const { imagen, fichaImagen, ...soloTexto } = extra;
      mapa[String(id)] = { ...(mapa[String(id)] || {}), ...soloTexto };
      localStorage.setItem(CLAVE_EXTRAS, JSON.stringify(mapa));
    } catch {}
  }
}

function eliminarExtra(id) {
  try {
    const mapa = leerExtras();
    delete mapa[String(id)];
    localStorage.setItem(CLAVE_EXTRAS, JSON.stringify(mapa));
  } catch {}
}

// Comprime la imagen a máximo 600px en JPEG para que pese ~30-50 KB
function archivoABase64(archivo) {
  return new Promise((resolve) => {
    if (!archivo) return resolve(null);
    const lector = new FileReader();
    lector.onerror = () => resolve(null);
    lector.onload = () => {
      const img = new Image();
      img.onerror = () => resolve(lector.result);
      img.onload = () => {
        const max = 600;
        let { width, height } = img;
        if (width > max || height > max) {
          const ratio = Math.min(max / width, max / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = lector.result;
    };
    lector.readAsDataURL(archivo);
  });
}

export function adaptarImagenes(lista) {
  return (lista ?? []).map((i) => ({
    id: i.id,
    url: i.url_imagen,
    principal: Boolean(i.es_principal),
  }));
}

export function adaptarProducto(p) {
  const extras = leerExtras()[String(p.id)] || {};
  const principal = p.imagenes?.find((i) => i.es_principal) ?? p.imagenes?.[0];

  const tallasRemotas = (p.variantes ?? []).map((v) => v.talla);
  const coloresRemotos = (p.variantes ?? []).map((v) => v.color);

  return {
    id: p.id,
    codigo: p.codigo,
    activo: p.activo ?? true,
    estadoValidacion: p.estado_validacion ?? "validada",
    fuenteFicha: p.fuente_ficha ?? "",
    versionFicha: p.version_ficha ?? "1.0",
    fechaVigenciaFicha: p.fecha_vigencia_ficha ?? "",
    nombre: p.nombre,
    destacado: Boolean(p.destacado),
    categoria: p.categoria_nombre ?? p.categoria ?? extras.categoria ?? "",
    categoriaId: p.categoria_id ?? (typeof p.categoria === "number" ? p.categoria : extras.categoriaId ?? ""),
    imagen: principal?.url_imagen ?? p.imagen ?? extras.imagen ?? null,
    imagenes: adaptarImagenes(p.imagenes),
    fichaImagen: p.fichaImagen ?? extras.fichaImagen ?? null,
    tallas: unicos(tallasRemotas.length ? tallasRemotas : extras.tallas),
    colores: unicos(coloresRemotos.length ? coloresRemotos : extras.colores),
    ficha: p.ficha ?? {
      descripcion: p.descripcion ?? "",
      normativa: p.normativa ?? extras.normativa ?? "",
      claseDielectrica: p.clase_dielectrica ?? "",
      tensionMaxUso: p.tension_max_uso_v ?? null,
      tensionEnsayo: p.tension_ensayo_v ?? null,
    },
  };
}

export async function listarProductos({ busqueda = "", categoria = "", pagina = 1, destacado = false } = {}) {
  const params = new URLSearchParams();
  if (busqueda) params.set("busqueda", busqueda);
  if (categoria) params.set("categoria", categoria);
  if (destacado) params.set("destacado", "true");
  params.set("page", pagina);

  const datos = await pedir(`/api/catalogo/productos/?${params}`);
  const lista = Array.isArray(datos) ? datos : datos.results || [];
  const productos = lista.map(adaptarProducto);

  return {
    total: datos.count ?? productos.length,
    productos,
  };
}

export async function obtenerProductoPorId(id) {
  const lista = await listarProductosAdmin();
  return lista.find((p) => String(p.id) === String(id)) || null;
}

export async function crearProducto(datosFormulario) {
  const {
    codigo,
    nombre,
    categoriaNombre,
    categoriaId,
    descripcion,
    normativa,
    claseDielectrica,
    tensionMaxUso,
    tallasTexto,
    coloresTexto,
    fotos = [],
    ficha,
  } = datosFormulario;

  const cuerpo = {
    codigo: codigo.trim().toUpperCase(),
    nombre: nombre.trim(),
    descripcion: descripcion || "Protección eléctrica certificada.",
    categoria: Number(categoriaId) || 1,
    normativa: normativa || "IEC 60903 / ASTM D120",
    clase_dielectrica: claseDielectrica || "",
    tension_max_uso_v: tensionMaxUso ? Number(tensionMaxUso) : null,
    tension_ensayo_v: tensionMaxUso ? Number(tensionMaxUso) * 5 : null,
    activo: true,
  };

  const creado = await pedir("/api/catalogo/admin/productos/", {
    metodo: "POST",
    cuerpo,
  });

  const fichaBase64 = await archivoABase64(ficha);

  guardarExtra(creado.id, {
    categoria: categoriaNombre || "",
    categoriaId: cuerpo.categoria,
    fichaImagen: fichaBase64,
    normativa: cuerpo.normativa,
    tallas: tallasTexto ? tallasTexto.split(",").map((x) => x.trim()).filter(Boolean) : [],
    colores: coloresTexto ? coloresTexto.split(",").map((x) => x.trim()).filter(Boolean) : [],
  });

  // Las fotografías van al backend (RF 010). Si fallan, el producto ya quedó creado.
  let errorFotos = null;
  if (fotos.length > 0) {
    try {
      await subirImagenes(creado.id, fotos);
    } catch (e) {
      errorFotos = e.message;
    }
  }

  return { ...adaptarProducto(creado), errorFotos };
}

export async function actualizarProducto(id, datosFormulario) {
  const {
    codigo,
    nombre,
    categoriaNombre,
    categoriaId,
    descripcion,
    normativa,
    claseDielectrica,
    tensionMaxUso,
    tallasTexto,
    coloresTexto,
    fotos = [],
    ficha,
  } = datosFormulario;

  const cuerpo = {
    codigo: codigo.trim().toUpperCase(),
    nombre: nombre.trim(),
    descripcion: descripcion ?? "",
    categoria: Number(categoriaId) || 1,
    normativa: normativa || "IEC 60903 / ASTM D120",
    clase_dielectrica: claseDielectrica ?? "",
    tension_max_uso_v: tensionMaxUso ? Number(tensionMaxUso) : null,
    tension_ensayo_v: tensionMaxUso ? Number(tensionMaxUso) * 5 : null,
  };

  const actualizado = await pedir(`/api/catalogo/admin/productos/${id}/`, {
    metodo: "PATCH",
    cuerpo,
  });

  const extraActual = leerExtras()[String(id)] || {};
  const nuevaFicha = ficha ? await archivoABase64(ficha) : extraActual.fichaImagen ?? null;

  guardarExtra(id, {
    categoria: categoriaNombre || extraActual.categoria || "",
    categoriaId: cuerpo.categoria,
    fichaImagen: nuevaFicha,
    normativa: cuerpo.normativa,
    tallas: tallasTexto !== undefined
      ? tallasTexto.split(",").map((x) => x.trim()).filter(Boolean)
      : extraActual.tallas || [],
    colores: coloresTexto !== undefined
      ? coloresTexto.split(",").map((x) => x.trim()).filter(Boolean)
      : extraActual.colores || [],
  });

  let errorFotos = null;
  if (fotos.length > 0) {
    try {
      await subirImagenes(id, fotos);
    } catch (e) {
      errorFotos = e.message;
    }
  }

  return { ...adaptarProducto(actualizado), errorFotos };
}

export async function eliminarProducto(id) {
  await pedir(`/api/catalogo/admin/productos/${id}/`, { metodo: "PATCH", cuerpo: { activo: false, codigo: `DEL-${id}-${String(Date.now()).slice(-5)}` } });
  eliminarExtra(id);
}

export async function listarCategorias() {
  return pedir("/api/catalogo/categorias/");
}

export function leerProductosLocales() {
  return [];
}

export async function listarProductosAdmin() {
  const datos = await pedir("/api/catalogo/admin/productos/");
  const lista = Array.isArray(datos) ? datos : datos.results || [];
  return lista.map(adaptarProducto);
}

export async function validarFicha(id, { estado, fuente, version, vigencia }) {
  return pedir(`/api/catalogo/admin/productos/${id}/validar-ficha/`, {
    metodo: "POST",
    cuerpo: {
      estado_validacion: estado,
      fuente_ficha: fuente,
      version_ficha: version,
      fecha_vigencia_ficha: vigencia || null,
    },
  });
}


export function marcarDestacado(id, valor) {
  return pedir(`/api/catalogo/admin/productos/${id}/`, {
    metodo: "PATCH",
    cuerpo: { destacado: valor },
  });
}


export function cambiarActivo(id, valor) {
  return pedir(`/api/catalogo/admin/productos/${id}/`, {
    metodo: "PATCH",
    cuerpo: { activo: valor },
  });
}

export async function subirImagenes(productoId, archivos) {
  const datos = new FormData();
  archivos.forEach((a) => datos.append("imagenes", a));
  const lista = await pedir(`/api/catalogo/admin/productos/${productoId}/imagenes/`, {
    metodo: "POST",
    cuerpo: datos,
  });
  return adaptarImagenes(lista);
}

export async function marcarImagenPrincipal(productoId, imagenId) {
  const lista = await pedir(
    `/api/catalogo/admin/productos/${productoId}/imagenes/${imagenId}/`,
    { metodo: "PATCH", cuerpo: {} }
  );
  return adaptarImagenes(lista);
}

export async function eliminarImagen(productoId, imagenId) {
  const lista = await pedir(
    `/api/catalogo/admin/productos/${productoId}/imagenes/${imagenId}/`,
    { metodo: "DELETE" }
  );
  return adaptarImagenes(lista);
}