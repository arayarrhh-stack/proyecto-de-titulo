import { useEffect, useState, useRef } from "react";
import { listarCategorias } from "../../services/catalogo";

const CLAVE_CATEGORIAS = "acomse_categorias_portada";

const CATEGORIAS_DEFECTO = [
  { id: "1", nombre: "Guantes dieléctricos", imagen: "/img/portada/cat-1.png" },
  { id: "2", nombre: "Calzado dieléctrico", imagen: "/img/portada/cat-2.png" },
  { id: "3", nombre: "Cascos y protección facial", imagen: "/img/portada/cat-3.png" },
  { id: "4", nombre: "Ropa de protección", imagen: "/img/portada/cat-4.png" },
  { id: "5", nombre: "Herramientas aisladas", imagen: "/img/portada/cat-5.png" },
  { id: "6", nombre: "Instrumentos de medición", imagen: "/img/portada/cat-6.png" },
];

function normalizarClave(texto) {
  return (texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function leerCategoriasLocales() {
  try {
    const raw = localStorage.getItem(CLAVE_CATEGORIAS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // usa defecto
  }
  return CATEGORIAS_DEFECTO;
}

function combinarSinDuplicados(locales, remotas) {
  const mapa = new Map();
  const idsUsados = new Set();

  // Primero cargamos las locales (conservan sus imágenes personalizadas)
  locales.forEach((c) => {
    const clave = normalizarClave(c?.nombre);
    if (!clave) return;
    const id = String(c.id || Date.now());
    if (mapa.has(clave) || idsUsados.has(id)) return;
    idsUsados.add(id);
    mapa.set(clave, {
      id,
      nombre: c.nombre.trim(),
      imagen: c.imagen || "/img/portada/cat-1.png",
    });
  });

  // Luego agregamos las del backend que no existan aún (por nombre ni por id)
  remotas.forEach((r) => {
    const clave = normalizarClave(r?.nombre);
    if (!clave) return;
    const id = String(r.id || clave);
    if (mapa.has(clave) || idsUsados.has(id)) return;
    idsUsados.add(id);
    mapa.set(clave, {
      id,
      nombre: r.nombre.trim(),
      imagen: r.imagen || "/img/portada/cat-1.png",
      desdeBackend: true,
    });
  });

  return Array.from(mapa.values());
}

function archivoABase64(archivo) {
  return new Promise((resolve, reject) => {
    if (!archivo) return resolve(null);
    const lector = new FileReader();
    lector.onload = () => resolve(lector.result);
    lector.onerror = reject;
    lector.readAsDataURL(archivo);
  });
}

export default function AdminCategorias() {
  const [categorias, setCategorias] = useState(leerCategoriasLocales);
  const [editandoId, setEditandoId] = useState(null);
  const [nombre, setNombre] = useState("");
  const [fotoArchivo, setFotoArchivo] = useState(null);
  const [imagenActual, setImagenActual] = useState("");
  const inputFotoRef = useRef(null);

  // Sincroniza al abrir el editor con las categorías del backend
  useEffect(() => {
    const locales = leerCategoriasLocales();
    listarCategorias()
      .then((remotas) => {
        if (Array.isArray(remotas) && remotas.length > 0) {
          const combinadas = combinarSinDuplicados(locales, remotas);
          setCategorias(combinadas);
        }
      })
      .catch(() => {});
  }, []);

  function guardarLista(nuevaLista) {
    setCategorias(nuevaLista);
    try {
      localStorage.setItem(CLAVE_CATEGORIAS, JSON.stringify(nuevaLista));
    } catch {
      alert("La imagen es demasiado pesada para guardarse localmente. Usa una imagen más liviana.");
    }
  }

  function limpiarFormulario() {
    setEditandoId(null);
    setNombre("");
    setFotoArchivo(null);
    setImagenActual("");
    if (inputFotoRef.current) inputFotoRef.current.value = "";
  }

  function iniciarEdicion(cat) {
    setEditandoId(cat.id);
    setNombre(cat.nombre);
    setImagenActual(cat.imagen || "");
    setFotoArchivo(null);
    if (inputFotoRef.current) inputFotoRef.current.value = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function manejarSubmit(e) {
    e.preventDefault();
    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) return;

    const nuevaImagen = fotoArchivo
      ? await archivoABase64(fotoArchivo)
      : imagenActual || "/img/portada/cat-1.png";

    if (editandoId) {
      const actualizadas = categorias.map((c) =>
        String(c.id) === String(editandoId)
          ? { ...c, nombre: nombreLimpio, imagen: nuevaImagen }
          : c
      );
      guardarLista(actualizadas);
    } else {
      const yaExiste = categorias.some(
        (c) => normalizarClave(c.nombre) === normalizarClave(nombreLimpio)
      );
      if (yaExiste) {
        alert("Esa categoría ya existe en la lista.");
        return;
      }
      const nueva = {
        id: String(Date.now()),
        nombre: nombreLimpio,
        imagen: nuevaImagen,
      };
      guardarLista([...categorias, nueva]);
    }

    limpiarFormulario();
  }

  function eliminarCategoria(id, nombreCat) {
    if (!window.confirm(`¿Eliminar la categoría "${nombreCat}"?`)) return;
    guardarLista(categorias.filter((c) => String(c.id) !== String(id)));
    if (String(editandoId) === String(id)) limpiarFormulario();
  }

  function restaurarDefecto() {
    if (!window.confirm("¿Restaurar las 6 categorías originales de ACOMSE?")) return;
    guardarLista(CATEGORIAS_DEFECTO);
    limpiarFormulario();
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0b192c]">
            Editar Categorías
          </h1>
          <div className="h-1 w-14 bg-[#facc15] mt-1 rounded"></div>
        </div>

        <button
          type="button"
          onClick={restaurarDefecto}
          className="text-xs font-bold text-slate-600 hover:text-[#0b192c] border border-slate-300 bg-white px-4 py-2 rounded-full transition"
        >
          Restaurar originales
        </button>
      </div>

      {/* Formulario para crear o editar categoría */}
      <form
        onSubmit={manejarSubmit}
        className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4"
      >
        <h2 className="font-extrabold text-[#0b192c] text-base">
          {editandoId ? "Editando categoría seleccionada" : "Agregar nueva categoría"}
        </h2>

        <div className="grid sm:grid-cols-2 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              Nombre de la categoría
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Señalética eléctrica"
              required
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#facc15]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              Imagen de portada {editandoId && "(opcional si mantienes la actual)"}
            </label>
            <input
              ref={inputFotoRef}
              type="file"
              accept="image/*"
              onChange={(e) => setFotoArchivo(e.target.files[0] || null)}
              className="w-full text-xs text-slate-600"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            className="bg-[#facc15] hover:bg-yellow-300 text-[#0b192c] text-xs font-extrabold px-6 py-2.5 rounded-full shadow-sm transition"
          >
            {editandoId ? "Guardar cambios" : "+ Agregar categoría"}
          </button>
          {editandoId && (
            <button
              type="button"
              onClick={limpiarFormulario}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-2"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      {/* Grilla de categorías actuales */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {categorias.map((c, i) => (
          <div
            key={`${c.id}-${i}`}
            className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                <img
                  src={c.imagen || "/img/portada/cat-1.png"}
                  alt={c.nombre}
                  className="w-full h-full object-contain p-1"
                />
              </div>
              <div>
                <p className="font-extrabold text-[#0b192c] text-sm leading-snug">
                  {c.nombre}
                </p>
                {c.desdeBackend && (
                  <span className="inline-block mt-1 text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                    Sincronizada BD
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => iniciarEdicion(c)}
                className="flex-1 bg-[#0b192c] hover:bg-slate-800 text-[#facc15] text-xs font-bold py-1.5 rounded-lg transition"
              >
                {"\u{270F}\u{FE0F}"} Editar
              </button>
              <button
                type="button"
                onClick={() => eliminarCategoria(c.id, c.nombre)}
                className="bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold px-3 py-1.5 rounded-lg transition"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
