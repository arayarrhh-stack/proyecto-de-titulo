const PASOS = [
  { codigo: "aceptado", etiqueta: "Aceptado" },
  { codigo: "comprado_proveedor", etiqueta: "Comprado al proveedor" },
  { codigo: "despachado", etiqueta: "Despachado" },
  { codigo: "entregado", etiqueta: "Entregado" },
  { codigo: "pagado", etiqueta: "Pagado" },
  { codigo: "cerrado", etiqueta: "Cerrado" },
];

export default function LineaTiempoPedido({ estado }) {
  const actual = Math.max(
    0,
    PASOS.findIndex((p) => p.codigo === estado)
  );

  return (
    <ol className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
      {PASOS.map((p, i) => {
        const hecho = i < actual;
        const esActual = i === actual;
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
              {p.etiqueta}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export const etiquetaPedido = (codigo) => PASOS.find((p) => p.codigo === codigo)?.etiqueta ?? codigo;
