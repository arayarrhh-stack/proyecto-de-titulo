import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { listarProductosAdmin, listarCategorias, validarFicha } from "../../services/catalogo";

const ESTADOS = {
  borrador: { texto: "Borrador", clase: "bg-slate-200 text-slate-700" },
  revision: { texto: "En revisión", clase: "bg-yellow-100 text-yellow-800" },
  validada: { texto: "Validada", clase: "bg-green-100 text-green-800" },
  vencida: { texto: "Vencida", clase: "bg-red-100 text-red-800" },
};

const FILTROS = [
  { clave: "pendientes", texto: "Pendientes" },
  { clave: "validada", texto: "Validadas" },
  { clave: "todas", texto: "Todas" },
];

const campo =
  "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#facc15]";

function Dato({ etiqueta, valor }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-slate-400 font-bold">{etiqueta}</p>
      <p className="text-sm text-slate-800">{valor || "—"}</p>
    </div>
  );
}

function TarjetaFicha({ producto, categoria, onValidada }) {
  const [abierta, setAbierta] = useState(false);
  const [fuente, setFuente] = useState(producto.fuenteFicha || producto.ficha?.normativa || "");
  const [version, setVersion] = useState(producto.versionFicha || "1.0");
  const [vigencia, setVigencia] = useState(producto.fechaVigenciaFicha || "");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const estado = ESTADOS[producto.estadoValidacion] ?? ESTADOS.borrador;
  const f = producto.ficha || {};

  async function cambiarEstado(nuevo) {
    setError("");
    if (nuevo === "validada" && !fuente.trim()) {
      return setError("Indica la fuente normativa para validar la ficha.");
    }
    setEnviando(true);
    try {
      const actualizado = await validarFicha(producto.id, {
        estado: nuevo,
        fuente: fuente.trim(),
        version: version.trim() || "1.0",
        vigencia,
      });
      onValidada(actualizado);
      setAbierta(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-bold text-[#0b192c]">{producto.nombre}</p>
          <p className="text-xs text-slate-500">
            <span className="font-mono">{producto.codigo}</span>
            {categoria && ` · ${categoria}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${estado.clase}`}>
            {estado.texto}
          </span>
          <button
            type="button"
            onClick={() => setAbierta((v) => !v)}
            className="bg-[#0b192c] hover:bg-slate-800 text-[#facc15] text-xs font-bold px-4 py-1.5 rounded-lg transition"
          >
            {abierta ? "Cerrar" : "Revisar ficha"}
          </button>
        </div>
      </div>

      {abierta && (
        <div className="border-t border-slate-100 pt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Dato etiqueta="Normativa" valor={f.normativa} />
            <Dato etiqueta="Clase dieléctrica" valor={f.claseDielectrica} />
            <Dato etiqueta="Tensión máx. de uso (V)" valor={f.tensionMaxUso} />
            <Dato etiqueta="Tensión de ensayo (V)" valor={f.tensionEnsayo} />
          </div>
          {f.descripcion && <p className="text-sm text-slate-600">{f.descripcion}</p>}

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <label className="block text-xs font-bold text-slate-500 mb-1">Fuente normativa</label>
              <input
                value={fuente}
                onChange={(e) => setFuente(e.target.value)}
                maxLength={200}
                className={campo}
                placeholder="IEC 60903 / ASTM D120"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Versión</label>
              <input
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                maxLength={20}
                className={campo}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Vigente hasta</label>
              <input
                type="date"
                value={vigencia}
                onChange={(e) => setVigencia(e.target.value)}
                className={campo}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              disabled={enviando}
              onClick={() => cambiarEstado("borrador")}
              className="text-sm font-bold text-slate-600 border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50 disabled:opacity-60"
            >
              Devolver a borrador
            </button>
            <button
              type="button"
              disabled={enviando}
              onClick={() => cambiarEstado("validada")}
              className="bg-[#facc15] hover:bg-yellow-300 text-[#0b192c] text-sm font-extrabold px-5 py-2 rounded-lg transition disabled:opacity-60"
            >
              {enviando ? "Guardando…" : "Validar ficha"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ValidadoraFichas() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState({});
  const [filtro, setFiltro] = useState("pendientes");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([listarProductosAdmin(), listarCategorias()])
      .then(([lista, cats]) => {
        setProductos(lista);
        setCategorias(Object.fromEntries(cats.map((c) => [c.id, c.nombre])));
      })
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }, []);

  function alActualizar(actualizado) {
    setProductos((lista) =>
      lista.map((p) =>
        p.id === actualizado.id
          ? {
              ...p,
              estadoValidacion: actualizado.estado_validacion,
              fuenteFicha: actualizado.fuente_ficha,
              versionFicha: actualizado.version_ficha,
              fechaVigenciaFicha: actualizado.fecha_vigencia_ficha ?? "",
            }
          : p
      )
    );
  }

  function cerrarSesion() {
    logout();
    navigate("/");
  }

  const visibles = productos.filter((p) => {
    if (filtro === "pendientes") return p.estadoValidacion !== "validada";
    if (filtro === "validada") return p.estadoValidacion === "validada";
    return true;
  });
  const pendientes = productos.filter((p) => p.estadoValidacion !== "validada").length;

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="h-16 bg-[#0b192c] text-white px-6 flex items-center justify-between">
        <div className="leading-none">
          <span className="text-xs uppercase tracking-widest font-bold text-[#facc15]">
            Validación técnica
          </span>
          <p className="text-lg font-extrabold">Panel ACOMSE</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden sm:inline text-slate-300">{usuario?.nombre}</span>
          <button
            onClick={cerrarSesion}
            className="text-xs font-semibold text-red-200 border border-red-300/40 px-3 py-1.5 rounded-full hover:bg-red-500/10 transition"
          >
            Salir
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0b192c]">
            Fichas técnicas por validar
          </h1>
          <div className="h-1 w-14 bg-[#facc15] mt-1 rounded"></div>
          <p className="text-sm text-slate-500 mt-2">
            {pendientes} {pendientes === 1 ? "ficha pendiente" : "fichas pendientes"}. Un producto
            solo aparece en el catálogo cuando está activo y su ficha está validada.
          </p>
        </div>

        <div className="flex gap-2">
          {FILTROS.map((f) => (
            <button
              key={f.clave}
              type="button"
              onClick={() => setFiltro(f.clave)}
              className={`text-xs font-bold px-4 py-2 rounded-full transition ${
                filtro === f.clave
                  ? "bg-[#0b192c] text-[#facc15]"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {f.texto}
            </button>
          ))}
        </div>

        {cargando && <p className="text-sm text-slate-500">Cargando fichas…</p>}
        {error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
            {error}
          </p>
        )}
        {!cargando && !error && visibles.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-sm text-slate-500">
            No hay fichas en esta vista.
          </div>
        )}

        <div className="space-y-4">
          {visibles.map((p) => (
            <TarjetaFicha
              key={p.id}
              producto={p}
              categoria={categorias[p.categoriaId]}
              onValidada={alActualizar}
            />
          ))}
        </div>
      </main>
    </div>
  );
}