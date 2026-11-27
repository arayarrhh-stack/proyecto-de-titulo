const PASOS = [
  { codigo: "aceptado", etiqueta: "Aceptado" },
  { codigo: "comprado_proveedor", etiqueta: "En proceso", etiquetaAdmin: "Comprado al proveedor" },
  { codigo: "despachado", etiqueta: "Despachado" },
  { codigo: "entregado", etiqueta: "Entregado" },
];

// Si el backend entrega un estado posterior a la entrega, se muestra como entregado.
const ESTADOS_FINALES = ["pagado", "cerrado"];

function indiceActual(estado) {
  if (ESTADOS_FINALES.includes(estado)) return PASOS.length - 1;
  return Math.max(
    0,
    PASOS.findIndex((p) => p.codigo === estado)
  );
}

export default function LineaTiempoPedido({ estado, admin = false }) {
  const actual = indiceActual(estado);

  return (
    <ol className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
      {PASOS.map((p, i) => {
        const hecho = i < actual;
        const esActual = i === actual;
        const etiqueta = admin && p.etiquetaAdmin ? p.etiquetaAdmin : p.etiqueta;
        return (
          <li key={p.codigo} className="flex items-center gap-1.5">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                esActual
                  ? "bg-blue-600 text-white"
                  : hecho
                  ? "bg-green-500 text-white"
                  : "bg-slate-200 text-slate-500"
              }`}
            >
              {hecho ? "✓" : i + 1}
            </span>
            <span className={esActual ? "font-semibold text-slate-800" : hecho ? "text-slate-600" : "text-slate-400"}>
              {etiqueta}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export const etiquetaPedido = (codigo, admin = false) => {
  if (ESTADOS_FINALES.includes(codigo)) return "Entregado";
  const paso = PASOS.find((p) => p.codigo === codigo);
  if (!paso) return codigo;
  return admin && paso.etiquetaAdmin ? paso.etiquetaAdmin : paso.etiqueta;
};