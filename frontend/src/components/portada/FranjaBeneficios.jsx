const BENEFICIOS = [
  { icono: "\u{1F6E1}\u{FE0F}", texto: "Productos certificados bajo normas internacionales" },
  { icono: "\u{1F69A}", texto: "Despacho a todo Chile" },
  { icono: "\u{1F3A7}", texto: "Soporte técnico especializado" },
  { icono: "\u{1F91D}", texto: "Atención personalizada para empresas" },
];

export default function FranjaBeneficios() {
  return (
    <section className="bg-[#132a4a] text-white border-y-4 border-yellow-400">
      <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {BENEFICIOS.map((beneficio, indice) => (
          <div key={indice} className="flex items-center gap-3">
            <span className="text-3xl text-yellow-400">{beneficio.icono}</span>
            <p className="text-xs sm:text-sm font-semibold">{beneficio.texto}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
