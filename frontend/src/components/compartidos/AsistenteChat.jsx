import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { consultarAsistente } from "../../services/asistente";
import { listarProductos } from "../../services/catalogo";
import { useCotizacion } from "../../context/CotizacionContext";

const AVISO =
  "Orientación técnica preliminar. No sustituye la evaluación de riesgos de un prevencionista ni constituye autorización para ejecutar el trabajo.";

const PASOS = ["tarea", "entorno", "tension", "corriente", "arco"];

const PREGUNTAS = {
  tarea: "¿Qué trabajo vas a realizar? Descríbelo brevemente (por ejemplo: mantención de un tablero eléctrico).",
  entorno: "¿En qué entorno se realizará? (interior o exterior, húmedo o seco, en altura…)",
  tension: "¿Cuál es la tensión máxima de exposición, en voltios? Escribe solo el número (por ejemplo: 380).",
  corriente: "¿Qué tipo de corriente es?",
  arco: "¿Existe riesgo de arco eléctrico?",
};

const AYUDA = {
  tarea: "Necesito que describas el trabajo para poder orientarte.",
  entorno: "Cuéntame en qué entorno se realizará el trabajo.",
  tension: "No entendí la tensión. Escribe solo el número en voltios, sin símbolos ni decimales (por ejemplo: 13200).",
  corriente: "Responde si es corriente alterna (CA) o continua (CC).",
  arco: "Responde sí o no: ¿existe riesgo de arco eléctrico?",
};

const OPCIONES = {
  entorno: [
    { texto: "Interior seco", valor: "Interior seco" },
    { texto: "Interior húmedo", valor: "Interior húmedo" },
    { texto: "Exterior", valor: "Exterior" },
    { texto: "En altura", valor: "En altura" },
  ],
  corriente: [
    { texto: "Corriente alterna (CA)", valor: "ca" },
    { texto: "Corriente continua (CC)", valor: "cc" },
  ],
  arco: [
    { texto: "Sí", valor: true },
    { texto: "No", valor: false },
  ],
};

function interpretar(paso, texto) {
  const t = texto.trim();
  if (!t) return { ok: false };
  if (paso === "tarea") return { ok: true, valor: t.slice(0, 300) };
  if (paso === "entorno") return { ok: true, valor: t.slice(0, 100) };
  if (paso === "tension") {
    const m = t.replace(/\./g, "").match(/^(\d+)\s*(v|volts?|voltios?)?$/i);
    if (!m || Number(m[1]) <= 0) return { ok: false };
    return { ok: true, valor: Number(m[1]) };
  }
  if (paso === "corriente") {
    if (/continu|\bcc\b|\bdc\b/i.test(t)) return { ok: true, valor: "cc" };
    if (/alterna|\bca\b|\bac\b/i.test(t)) return { ok: true, valor: "ca" };
    return { ok: false };
  }
  if (paso === "arco") {
    if (/^s[ií]/i.test(t)) return { ok: true, valor: true };
    if (/^no/i.test(t)) return { ok: true, valor: false };
    return { ok: false };
  }
  return { ok: false };
}

function pesosV(v) {
  return v != null ? `${Number(v).toLocaleString("es-CL")} V` : "—";
}

function construirHistorial(listaMensajes) {
  return listaMensajes
    .map((m) => ({
      rol: m.de === "usuario" ? "usuario" : "asistente",
      texto: m.resultado ? (m.resultado.orientacion ?? "") : (m.texto ?? ""),
    }))
    .filter((t) => t.texto.trim() !== "")
    .slice(-10);
}

function Resultado({ r, agregados, onAgregar }) {
  const v = r.validacion_tecnica ?? {};
  return (
    <div className="space-y-3">
      <p className="whitespace-pre-line">{r.orientacion}</p>

      {v.es_valido && (
        <dl className="bg-white border border-slate-200 rounded-md p-3 text-xs space-y-1">
          <div className="flex justify-between gap-2">
            <dt className="text-slate-500">Clase recomendada</dt>
            <dd className="font-semibold">{v.clase_recomendada}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-slate-500">Etiqueta de color</dt>
            <dd className="font-medium">{v.color_etiqueta}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-slate-500">Tensión máxima de uso</dt>
            <dd className="font-medium">{pesosV(v.voltaje_maximo)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-slate-500">Tensión de ensayo</dt>
            <dd className="font-medium">{pesosV(v.tension_ensayo)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-slate-500">Fuente</dt>
            <dd className="font-medium text-right">{v.fuente}</dd>
          </div>
        </dl>
      )}

      {r.derivada_a_asesora && (
        <p className="text-xs text-yellow-800 bg-yellow-100 rounded-md p-2">
          Tu caso fue derivado a una asesora técnica (solicitud N° {r.solicitud_asesoria_id}). Mientras tanto,
          no uses este resultado como autorización para ejecutar el trabajo.
        </p>
      )}

      {r.productos_sugeridos?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-600 mb-1">Productos disponibles en el catálogo</p>
          <ul className="space-y-2">
            {r.productos_sugeridos.map((p) => (
              <li key={p.id} className="bg-white border border-slate-200 rounded-md p-2 text-xs flex items-center justify-between gap-2">
                <span>
                  <span className="font-medium">{p.nombre}</span>
                  <span className="block text-slate-400">{p.codigo}</span>
                </span>
                {agregados.has(p.id) ? (
                  <Link to="/cotizacion" className="text-green-700 font-medium whitespace-nowrap hover:underline">
                    Agregado · ver
                  </Link>
                ) : (
                  <button
                    onClick={() => onAgregar(p)}
                    className="text-blue-600 font-medium border border-blue-600 rounded px-2 py-1 whitespace-nowrap hover:bg-blue-50"
                  >
                    Agregar a cotización
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function AsistenteChat() {
  const { agregar } = useCotizacion();
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState([]);
  const [indice, setIndice] = useState(0);
  const [datos, setDatos] = useState({});
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [agregados, setAgregados] = useState(new Set());
  const contador = useRef(0);
  const fin = useRef(null);

  function nuevoMensaje(m) {
    contador.current += 1;
    return { id: contador.current, ...m };
  }

  function publicar(...items) {
    setMensajes((actuales) => [...actuales, ...items.map(nuevoMensaje)]);
  }

  function reiniciar() {
    setIndice(0);
    setDatos({});
    setTexto("");
    setAgregados(new Set());
    setMensajes([
      nuevoMensaje({
        de: "bot",
        texto:
          "Hola, soy el asistente de ACOMSE. Te haré unas preguntas sobre tu trabajo para orientarte sobre qué protección podrías necesitar.",
      }),
      nuevoMensaje({ de: "bot", texto: PREGUNTAS.tarea }),
    ]);
  }

  useEffect(() => {
    if (abierto && mensajes.length === 0) reiniciar();
  }, [abierto]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fin.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, enviando]);

  const terminado = indice >= PASOS.length;
  const paso = PASOS[indice];

  async function consultar(d) {
    setEnviando(true);
    try {
      const r = await consultarAsistente({
        tarea: d.tarea,
        entorno: d.entorno,
        tension_maxima: d.tension,
        tipo_corriente: d.corriente,
        riesgo_arco: d.arco,
        consulta: d.tarea,
      });
      publicar({ de: "bot", resultado: r });
    } catch (e) {
      publicar({
        de: "bot",
        texto:
          e.estado === 429
            ? "Alcanzaste el límite de consultas por minuto. Espera un momento y vuelve a intentarlo. Mientras tanto puedes revisar el catálogo y enviar tu solicitud de cotización."
            : `${e.message} Mientras tanto puedes revisar el catálogo y enviar tu solicitud de cotización.`,
      });
    } finally {
      setEnviando(false);
      setIndice(PASOS.length);
    }
  }

  async function consultarSeguimiento(preguntaUsuario, historialActual) {
    setEnviando(true);
    try {
      const r = await consultarAsistente({
        tarea: datos.tarea,
        entorno: datos.entorno,
        tension_maxima: datos.tension,
        tipo_corriente: datos.corriente,
        riesgo_arco: datos.arco,
        consulta: preguntaUsuario,
        historial: historialActual,
      });
      publicar({ de: "bot", texto: r.orientacion });
    } catch (e) {
      publicar({
        de: "bot",
        texto:
          e.estado === 429
            ? "Alcanzaste el límite de consultas por minuto. Espera un momento y vuelve a intentarlo."
            : `${e.message} Puedes continuar revisando el catálogo o reiniciar la asesoría.`,
      });
    } finally {
      setEnviando(false);
    }
  }

  function responder(textoUsuario, valor) {
    if (enviando) return;

    // RF 033: preguntas de seguimiento manteniendo el contexto de la sesión
    if (terminado) {
      const limpia = textoUsuario.trim();
      if (!limpia) return;
      const historialActual = construirHistorial(mensajes);
      publicar({ de: "usuario", texto: limpia });
      setTexto("");
      consultarSeguimiento(limpia, historialActual);
      return;
    }

    const interpretado = valor !== undefined ? { ok: true, valor } : interpretar(paso, textoUsuario);
    publicar({ de: "usuario", texto: textoUsuario });
    setTexto("");

    if (!interpretado.ok) {
      publicar({ de: "bot", texto: AYUDA[paso] });
      return;
    }

    const nuevos = { ...datos, [paso]: interpretado.valor };
    setDatos(nuevos);

    if (indice + 1 < PASOS.length) {
      setIndice(indice + 1);
      publicar({ de: "bot", texto: PREGUNTAS[PASOS[indice + 1]] });
    } else {
      consultar(nuevos);
    }
  }

  async function agregarProducto(p) {
    try {
      const { productos } = await listarProductos({ busqueda: p.codigo });
      const producto = productos.find((x) => x.id === p.id) ?? productos[0];
      if (!producto) return;
      agregar(producto, { talla: producto.tallas[0] ?? "", color: producto.colores[0] ?? "" });
      setAgregados((s) => new Set(s).add(p.id));
    } catch {
      publicar({ de: "bot", texto: "No pude agregar el producto. Inténtalo desde el catálogo." });
    }
  }

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="fixed bottom-4 right-4 z-50 bg-blue-600 text-white font-medium px-5 py-3 rounded-full shadow-lg hover:bg-blue-700 transition"
      >
        Asistente técnico
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[22rem] max-w-[calc(100vw-2rem)] h-[34rem] max-h-[80vh] bg-slate-50 border border-slate-300 rounded-lg shadow-xl flex flex-col">
      <div className="flex items-center justify-between bg-blue-600 text-white px-4 py-3 rounded-t-lg">
        <span className="font-semibold">Asistente técnico ACOMSE</span>
        <div className="flex items-center gap-3 text-xs">
          <button onClick={reiniciar} className="hover:underline">Reiniciar asesoría</button>
          <button onClick={() => setAbierto(false)} aria-label="Cerrar" className="text-lg leading-none">×</button>
        </div>
      </div>

      <p className="text-[11px] leading-snug text-yellow-900 bg-yellow-100 px-3 py-2">{AVISO}</p>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 text-sm">
        {mensajes.map((m) =>
          m.de === "usuario" ? (
            <div key={m.id} className="flex justify-end">
              <p className="bg-blue-600 text-white rounded-lg px-3 py-2 max-w-[85%]">{m.texto}</p>
            </div>
          ) : (
            <div key={m.id} className="bg-slate-200 text-slate-800 rounded-lg px-3 py-2 max-w-[92%]">
              {m.resultado ? (
                <Resultado r={m.resultado} agregados={agregados} onAgregar={agregarProducto} />
              ) : (
                <p className="whitespace-pre-line">{m.texto}</p>
              )}
            </div>
          )
        )}

        {!terminado && !enviando && OPCIONES[paso] && (
          <div className="flex flex-wrap gap-2">
            {OPCIONES[paso].map((o) => (
              <button
                key={o.texto}
                onClick={() => responder(o.texto, o.valor)}
                className="text-xs border border-blue-600 text-blue-600 rounded-full px-3 py-1 hover:bg-blue-50"
              >
                {o.texto}
              </button>
            ))}
          </div>
        )}

        {enviando && <p className="text-slate-500 text-xs">Analizando tu consulta…</p>}

        {terminado && !enviando && (
          <div className="flex flex-wrap gap-3 text-xs">
            <button onClick={reiniciar} className="text-blue-600 font-medium hover:underline">
              Reiniciar asesoría
            </button>
            <Link to="/" className="text-blue-600 font-medium hover:underline">Ir al catálogo</Link>
          </div>
        )}
        <div ref={fin} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (texto.trim()) responder(texto, undefined);
        }}
        className="flex gap-2 border-t border-slate-200 p-3"
      >
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          disabled={enviando}
          placeholder={terminado ? "Haz una pregunta de seguimiento…" : "Escribe tu respuesta…"}
          className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
        />
        <button
          type="submit"
          disabled={enviando || !texto.trim()}
          className="bg-blue-600 text-white text-sm font-medium px-3 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
