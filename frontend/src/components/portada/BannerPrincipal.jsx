export default function BannerPrincipal() {
  return (
    <section
      className="relative bg-[#0b192c] text-white overflow-hidden bg-cover bg-right"
      style={{ backgroundImage: "url('/img/portada/portada.png')" }}
    >
      {/* Degradado azul oscuro a la izquierda para que el texto se lea nítido y el electricista destaque a la derecha */}
      <div className="bg-gradient-to-r from-[#0b192c] via-[#0b192c]/85 to-transparent">
        <div className="max-w-7xl mx-auto px-6 py-14 lg:py-20 grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6 space-y-5 z-10">
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight">
              Elementos de <br />
              <span className="text-[#facc15]">Protección Eléctrica</span>
            </h1>

            <p className="text-lg text-slate-100 max-w-xl font-medium">
              Trabaja seguro, protege tu equipo y tu vida.
            </p>

            <div className="grid grid-cols-3 gap-4 pt-6 max-w-md text-center">
              <div className="border-r border-slate-500/60 pr-3 flex flex-col items-center">
                <svg className="w-8 h-8 text-white mb-1.5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M13 8l-3 5h4l-3 5" />
                </svg>
                <p className="text-xs font-bold leading-tight">Máxima<br />seguridad</p>
              </div>
              <div className="border-r border-slate-500/60 pr-3 flex flex-col items-center">
                <svg className="w-8 h-8 text-white mb-1.5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <circle cx="12" cy="8" r="6" />
                  <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
                </svg>
                <p className="text-xs font-bold leading-tight">Calidad<br />certificada</p>
              </div>
              <div className="flex flex-col items-center">
                <svg className="w-8 h-8 text-white mb-1.5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                  <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                </svg>
                <p className="text-xs font-bold leading-tight">Asesoría<br />especializada</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
