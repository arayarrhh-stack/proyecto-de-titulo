export default function BarraSuperior() {
  return (
    <div className="bg-[#0b192c] text-slate-200 text-xs py-2 px-6">
      <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2 font-medium">
          <span className="text-yellow-400">{"\u{1F6E1}\u{FE0F}"}</span>
          <span>Seguridad que impulsa tu trabajo</span>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <span>{"\u{2709}\u{FE0F}"} ventas@acomse.cl</span>
          <span>{"\u{1F4DE}"} +56 2 2345 6789</span>
          <span className="hidden sm:inline">| {"\u{1F552}"} Lun - Vie: 08:30 a 18:00 hrs</span>
        </div>
      </div>
    </div>
  );
}
