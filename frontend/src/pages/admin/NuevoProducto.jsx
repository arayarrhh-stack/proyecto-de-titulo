import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  crearProducto,
  actualizarProducto,
  obtenerProductoPorId,
  listarCategorias,
  marcarImagenPrincipal,
  eliminarImagen,
} from "../../services/catalogo";

const CLAVE_CATEGORIAS = "acomse_categorias_portada";

const CATEGORIAS_DEFECTO = [
  { id: "1", nombre: "Guantes dieléctricos", imagen: "/img/portada/cat-1.png" },
  { id: "2", nombre: "Calzado dieléctrico", imagen: "/img/portada/cat-2.png" },
  { id: "3", nombre: "Cascos y protección facial", imagen: "/img/portada/cat-3.png" },
  { id: "4", nombre: "Ropa de protección", imagen: "/img/portada/cat-4.png" },
  { id: "5", nombre: "Herramientas aisladas", imagen: "/img/portada/cat-5.png" },
  { id: "6", nombre: "Instrumentos de medición", imagen: "/img/portada/cat-6.png" },
];

const TALLAS_CHILENAS = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];

const COLORES_DISPONIBLES = [
  { nombre: "Negro", hex: "#111827" },
  { nombre: "Blanco", hex: "#ffffff" },
  { nombre: "Rojo", hex: "#dc2626" },
  { nombre: "Amarillo", hex: "#facc15" },
  { nombre: "Azul", hex: "#2563eb" },
  { nombre: "Naranja", hex: "#f97316" },
  { nombre: "Verde", hex: "#16a34a" },
  { nombre: "Beige", hex: "#d6c5a7" },
  { nombre: "Gris", hex: "#6b7280" },
  { nombre: "Café", hex: "#78350f" },
  { nombre: "Celeste", hex: "#38bdf8" },
];

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

function archivoABase64(archivo) {
  return new Promise((resolve, reject) => {
    if (!archivo) return resolve(null);
    const lector = new FileReader();
    lector.onload = () => resolve(lector.result);
    lector.onerror = reject;
    lector.readAsDataURL(archivo);
  });
}

// Selector cerrado de Tallas chilenas (evita traducción automática y texto inválido)
function SelectorTallas({ valores, setValores }) {
  function alternar(talla) {
    setValores((prev) =>
      prev.includes(talla) ? prev.filter((v) => v !== talla) : [...prev, talla]
    );
  }

  return (
    <div>
      <label className="block text-xs font-bold text-slate-600 mb-1.5">
        Tallas disponibles (Chile)
      </label>
      <div className="flex flex-wrap gap-1.5" translate="no">
        {TALLAS_CHILENAS.map((t) => {
          const activa = valores.includes(t);
          return (
            <button
              key={t}
              type="button"
              translate="no"
              onClick={() => alternar(t)}
              className={`notranslate px-3 py-1.5 rounded-lg text-xs font-extrabold border transition ${
                activa
                  ? "bg-[#0b192c] text-[#facc15] border-[#0b192c]"
                  : "bg-white text-slate-700 border-slate-300 hover:border-[#0b192c]"
              }`}
            >
              {t}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Selector cerrado de Colores reales
function SelectorColores({ valores, setValores }) {
  function alternar(color) {
    setValores((prev) =>
      prev.includes(color) ? prev.filter((v) => v !== color) : [...prev, color]
    );
  }

  return (
    <div>
      <label className="block text-xs font-bold text-slate-600 mb-1.5">
        Colores disponibles
      </label>
      <div className="flex flex-wrap gap-1.5">
        {COLORES_DISPONIBLES.map((c) => {
          const activo = valores.includes(c.nombre);
          return (
            <button
              key={c.nombre}
              type="button"
              onClick={() => alternar(c.nombre)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition ${
                activo
                  ? "bg-[#0b192c] text-[#facc15] border-[#0b192c]"
                  : "bg-white text-slate-700 border-slate-300 hover:border-[#0b192c]"
              }`}
            >
              <span
                className="w-3 h-3 rounded-full border border-slate-300 shrink-0"
                style={{ backgroundColor: c.hex }}
              />
              {c.nombre}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function NuevoProducto() {
  const { id } = useParams();
  const modoEdicion = Boolean(id);
  const navigate = useNavigate();

  const [categorias, setCategorias] = useState(leerCategoriasLocales);
  const [mostrarNuevaCat, setMostrarNuevaCat] = useState(false);
  const [nuevaCatNombre, setNuevaCatNombre] = useState("");
  const [nuevaCatFoto, setNuevaCatFoto] = useState(null);

  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [categoriaId, setCategoriaId] = useState(() => leerCategoriasLocales()[0]?.id || "1");
  const [descripcion, setDescripcion] = useState("");
  const [claseDielectrica, setClaseDielectrica] = useState("0");
  const [tensionMaxUso, setTensionMaxUso] = useState("");
  const [tallas, setTallas] = useState([]);
  const [colores, setColores] = useState([]);
  const [fotos, setFotos] = useState([]);
  const [imagenesActuales, setImagenesActuales] = useState([]);
  const [ficha, setFicha] = useState(null);
  const [imagenActual, setImagenActual] = useState(null);
  const [fichaActual, setFichaActual] = useState(null);

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [guardado, setGuardado] = useState(false);

  // Vistas previas de las fotos nuevas (se liberan al cambiar la lista)
  const previas = useMemo(() => fotos.map((f) => URL.createObjectURL(f)), [fotos]);
  useEffect(() => () => previas.forEach((u) => URL.revokeObjectURL(u)), [previas]);

  const inputFotoRef = useRef(null);
  const inputFichaRef = useRef(null);

  // Sincroniza categorías locales con las del backend si existen
  useEffect(() => {
    listarCategorias()
      .then((remotas) => {
        if (!Array.isArray(remotas) || remotas.length === 0) return;
        setCategorias((locales) => {
          const nombresLocales = new Set(locales.map((c) => c.nombre.toLowerCase()));
          const idsLocales = new Set(locales.map((c) => String(c.id)));
          const extras = remotas
            .filter(
              (r) =>
                !nombresLocales.has((r.nombre || "").toLowerCase()) &&
                !idsLocales.has(String(r.id))
            )
            .map((r) => ({ id: String(r.id), nombre: r.nombre, imagen: "/img/portada/cat-1.png" }));
          return [...locales, ...extras];
        });
      })
      .catch(() => {});
  }, []);

  // En modo edición, carga los datos actuales del producto
  useEffect(() => {
    if (!modoEdicion) return;
    obtenerProductoPorId(id).then((prod) => {
      if (!prod) {
        setError("No se encontró el producto solicitado.");
        return;
      }
      setCodigo(prod.codigo || "");
      setNombre(prod.nombre || "");
      setCategoriaId(String(prod.categoriaId || "1"));
      setDescripcion(prod.ficha?.descripcion || "");
      setClaseDielectrica(prod.ficha?.claseDielectrica || "0");
      setTensionMaxUso(
        prod.ficha?.tensionMaxUso != null ? String(Math.abs(prod.ficha.tensionMaxUso)) : ""
      );
      setTallas(Array.isArray(prod.tallas) ? prod.tallas : []);
      setColores(Array.isArray(prod.colores) ? prod.colores : []);
      setImagenesActuales(prod.imagenes || []);
      setImagenActual(prod.imagenes?.length ? null : prod.imagen || null);
      setFichaActual(prod.fichaImagen || null);
    });
  }, [id, modoEdicion]);

  // Crea una nueva categoría con foto y la selecciona automáticamente
  async function crearNuevaCategoria() {
    const nombreLimpio = nuevaCatNombre.trim();
    if (!nombreLimpio) return;

    const imagenUrl = nuevaCatFoto
      ? await archivoABase64(nuevaCatFoto)
      : "/img/portada/cat-1.png";

    const nueva = {
      id: String(Date.now()),
      nombre: nombreLimpio,
      imagen: imagenUrl,
    };

    const actualizadas = [...categorias, nueva];
    setCategorias(actualizadas);
    try {
      localStorage.setItem(CLAVE_CATEGORIAS, JSON.stringify(actualizadas));
    } catch {
      // ignora error de cuota
    }

    setCategoriaId(nueva.id);
    setNuevaCatNombre("");
    setNuevaCatFoto(null);
    setMostrarNuevaCat(false);
  }

  const MAX_FOTOS = 8;

  function agregarFotos(e) {
    const nuevas = Array.from(e.target.files || []);
    e.target.value = "";
    const espacio = MAX_FOTOS - imagenesActuales.length - fotos.length;
    if (nuevas.length > espacio) {
      setError(`Un producto admite hasta ${MAX_FOTOS} fotografías.`);
    }
    setFotos((prev) => [...prev, ...nuevas.slice(0, Math.max(0, espacio))]);
  }

  function quitarPendiente(indice) {
    setFotos((prev) => prev.filter((_, i) => i !== indice));
  }

  async function hacerPrincipal(imagenId) {
    try {
      setImagenesActuales(await marcarImagenPrincipal(id, imagenId));
    } catch (err) {
      setError(err.message);
    }
  }

  async function borrarImagen(imagenId) {
    if (!window.confirm("¿Eliminar esta fotografía?")) return;
    try {
      setImagenesActuales(await eliminarImagen(id, imagenId));
    } catch (err) {
      setError(err.message);
    }
  }

  function quitarFicha() {
    setFicha(null);
    if (inputFichaRef.current) inputFichaRef.current.value = "";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!modoEdicion && fotos.length === 0) {
      setError("Agrega al menos una fotografía del producto.");
      return;
    }
    setEnviando(true);

    try {
      const catObj = categorias.find((c) => String(c.id) === String(categoriaId));
      const payload = {
        codigo,
        nombre,
        categoriaId,
        categoriaNombre: catObj ? catObj.nombre : "Guantes dieléctricos",
        descripcion,
        claseDielectrica,
        tensionMaxUso: tensionMaxUso ? Math.abs(Number(tensionMaxUso)) : "",
        tallasTexto: tallas.join(", "),
        coloresTexto: colores.join(", "),
        fotos,
        ficha,
      };

      if (modoEdicion) {
        const resultado = await actualizarProducto(id, payload);
        if (resultado.errorFotos) {
          setError(`Los datos se guardaron, pero las fotos no se subieron: ${resultado.errorFotos}`);
          return;
        }
        navigate("/admin/productos");
        return;
      } else {
        const resultado = await crearProducto(payload);
        setGuardado(true);
        if (resultado.errorFotos) {
          setError(
            `El producto se creó, pero las fotos no se subieron: ${resultado.errorFotos}. Edítalo para subirlas de nuevo.`
          );
        }
        setCodigo("");
        setNombre("");
        setDescripcion("");
        setTensionMaxUso("");
        setTallas([]);
        setColores([]);
        setFotos([]);
        quitarFicha();
      }
    } catch (err) {
      setError(err.message || "No se pudo guardar el producto.");
    } finally {
      setEnviando(false);
    }
  }

  const campo =
    "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#facc15]";

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center bg-slate-50 p-6">
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 p-8 rounded-2xl shadow-sm w-full max-w-2xl space-y-5"
      >
        <div>
          <h1 className="text-2xl font-extrabold text-[#0b192c] text-center">
            {modoEdicion ? "Editar producto del catálogo" : "Agregar producto al catálogo"}
          </h1>
          <div className="h-1 w-14 bg-[#facc15] mx-auto mt-1.5 rounded"></div>
        </div>

        {guardado && (
          <div className="bg-green-50 border border-green-300 text-green-900 rounded-xl p-4 text-sm text-center space-y-2">
            <p className="font-bold">
              {"\u{2713}"} ¡Producto guardado y publicado en el catálogo!
            </p>
            <div className="flex justify-center gap-4 text-xs font-bold pt-1">
              <button
                type="button"
                onClick={() => setGuardado(false)}
                className="underline hover:text-green-950"
              >
                Agregar otro producto
              </button>
              <button
                type="button"
                onClick={() => navigate("/admin/productos")}
                className="bg-green-700 text-white px-4 py-1.5 rounded-full hover:bg-green-800 transition"
              >
                Ver en gestión de productos →
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm text-center">
            {error}
          </div>
        )}

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              Código SKU
            </label>
            <input
              type="text"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              className={campo}
              placeholder="Ej: GD-05"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-600 mb-1">
              Nombre del producto
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className={campo}
              placeholder="Ej: Guantes dieléctricos clase 0"
              required
            />
          </div>
        </div>

        {/* Categoría + Botón para crear nueva categoría */}
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-600">
                Categoría
              </label>
              <button
                type="button"
                onClick={() => setMostrarNuevaCat((v) => !v)}
                className="text-[11px] font-bold text-blue-700 hover:underline"
              >
                {mostrarNuevaCat ? "Cancelar" : "+ Nueva"}
              </button>
            </div>
            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              className={campo}
            >
              {categorias.map((c, i) => (
                <option key={`${c.id}-${i}`} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              Clase dieléctrica
            </label>
            <select
              value={claseDielectrica}
              onChange={(e) => setClaseDielectrica(e.target.value)}
              className={campo}
            >
              <option value="00">Clase 00 (500 V)</option>
              <option value="0">Clase 0 (1.000 V)</option>
              <option value="1">Clase 1 (7.500 V)</option>
              <option value="2">Clase 2 (17.000 V)</option>
              <option value="3">Clase 3 (26.500 V)</option>
              <option value="4">Clase 4 (36.000 V)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              Tensión máx. uso (V)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={tensionMaxUso}
              onKeyDown={(e) => {
                if (["-", "+", "e", "E", ".", ","].includes(e.key)) e.preventDefault();
              }}
              onChange={(e) => {
                const soloDigitos = e.target.value.replace(/\D/g, "");
                setTensionMaxUso(soloDigitos);
              }}
              className={campo}
              placeholder="Ej: 1000"
            />
          </div>
        </div>

        {/* Mini-panel desplegable para crear nueva categoría con foto */}
        {mostrarNuevaCat && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <p className="text-xs font-extrabold text-[#0b192c]">
              Crear nueva categoría
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={nuevaCatNombre}
                onChange={(e) => setNuevaCatNombre(e.target.value)}
                placeholder="Ej: Señalética eléctrica"
                className={campo}
              />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setNuevaCatFoto(e.target.files[0] || null)}
                className="w-full text-xs text-slate-600 self-center"
              />
            </div>
            <button
              type="button"
              onClick={crearNuevaCategoria}
              className="bg-[#0b192c] hover:bg-slate-800 text-[#facc15] text-xs font-bold px-4 py-2 rounded-lg transition"
            >
              Guardar y seleccionar categoría
            </button>
          </div>
        )}

        {/* Selectores cerrados de Tallas chilenas y Colores */}
        <div className="grid sm:grid-cols-2 gap-4">
          <SelectorTallas valores={tallas} setValores={setTallas} />
          <SelectorColores valores={colores} setValores={setColores} />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">
            Descripción técnica
          </label>
          <input
            type="text"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className={campo}
            placeholder="Ej: Protección eléctrica certificada bajo norma IEC 60903."
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">
            Fotografías del producto (hasta 8, JPG, PNG o WebP de máx. 5 MB)
          </label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={agregarFotos}
            className="w-full text-xs text-slate-600"
          />

          {(imagenesActuales.length > 0 || fotos.length > 0 || imagenActual) && (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {imagenesActuales.map((img) => (
                <div key={img.id} className="relative border border-slate-200 rounded-xl p-2 bg-slate-50">
                  {img.principal && (
                    <span className="absolute top-1.5 left-1.5 bg-[#facc15] text-[#0b192c] text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                      Principal
                    </span>
                  )}
                  <img src={img.url} alt="Fotografía del producto" className="w-full h-24 object-contain" />
                  <div className="flex justify-between mt-1.5 text-[11px] font-bold">
                    {!img.principal ? (
                      <button type="button" onClick={() => hacerPrincipal(img.id)} className="text-blue-700 hover:underline">
                        Hacer principal
                      </button>
                    ) : (
                      <span />
                    )}
                    <button type="button" onClick={() => borrarImagen(img.id)} className="text-red-600 hover:underline">
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}

              {fotos.map((f, i) => (
                <div key={`${f.name}-${i}`} className="relative border border-dashed border-slate-300 rounded-xl p-2 bg-white">
                  <span className="absolute top-1.5 left-1.5 bg-slate-200 text-slate-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                    Nueva
                  </span>
                  <img src={previas[i]} alt={f.name} className="w-full h-24 object-contain" />
                  <button
                    type="button"
                    onClick={() => quitarPendiente(i)}
                    className="mt-1.5 text-[11px] font-bold text-red-600 hover:underline"
                  >
                    Quitar
                  </button>
                </div>
              ))}

              {imagenesActuales.length === 0 && imagenActual && (
                <div className="border border-slate-200 rounded-xl p-2 bg-slate-50">
                  <img src={imagenActual} alt="Foto anterior" className="w-full h-24 object-contain" />
                  <p className="mt-1.5 text-[10px] text-slate-500">
                    Foto anterior, solo visible en este navegador. Súbela de nuevo para que se vea en todos.
                  </p>
                </div>
              )}
            </div>
          )}
          <p className="text-[11px] text-slate-500 mt-2">
            La primera fotografía que subas queda como principal; puedes cambiarla después.
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">
            Ficha técnica (imagen) {modoEdicion && "(opcional)"}
          </label>
          <input
            ref={inputFichaRef}
            type="file"
            accept="image/*"
            onChange={(e) => setFicha(e.target.files[0] || null)}
            className="w-full text-xs text-slate-600"
            required={!modoEdicion && !fichaActual}
          />
          {(ficha || fichaActual) && (
            <div className="mt-2">
              <img
                src={ficha ? URL.createObjectURL(ficha) : fichaActual}
                alt="Vista previa de la ficha técnica"
                className="w-full h-36 object-contain bg-slate-50 rounded-xl border border-slate-200 p-2"
              />
              {ficha && (
                <button
                  type="button"
                  onClick={quitarFicha}
                  className="mt-1 text-xs text-red-600 hover:text-red-800 font-bold underline"
                >
                  Restaurar ficha anterior
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          {modoEdicion && (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-1/3 border border-slate-300 text-slate-700 font-bold py-3 rounded-full hover:bg-slate-100 transition text-sm"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={enviando}
            className="flex-1 bg-[#facc15] hover:bg-yellow-300 text-[#0b192c] font-extrabold py-3 rounded-full shadow-sm transition disabled:opacity-50 text-sm"
          >
            {enviando
              ? "Guardando cambios…"
              : modoEdicion
              ? "Guardar cambios del producto"
              : "Guardar producto"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default NuevoProducto;
