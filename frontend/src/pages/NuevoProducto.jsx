import { useState } from "react";

function NuevoProducto() {
  const [nombre, setNombre] = useState("");
  const [foto, setFoto] = useState(null);
  const [ficha, setFicha] = useState(null);

  function handleSubmit(e) {
    e.preventDefault();

    // Cuando exista el backend, este FormData es lo que se enviará
    const datos = new FormData();
    datos.append("nombre", nombre);
    datos.append("imagen", foto);
    datos.append("ficha", ficha);

    console.log("Nuevo producto:", {
      nombre,
      foto: foto.name,
      ficha: ficha.name,
    });
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-lg shadow w-full max-w-lg space-y-5"
      >
        <h1 className="text-2xl font-bold text-slate-800 text-center">
          Agregar producto al catálogo
        </h1>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            Nombre del producto
          </label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Guantes dieléctricos clase 0"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            Foto del producto
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFoto(e.target.files[0])}
            className="w-full text-sm text-slate-600"
            required
          />
          {foto && (
            <img
              src={URL.createObjectURL(foto)}
              alt="Vista previa de la foto"
              className="mt-3 w-full h-48 object-cover rounded-md border border-slate-200"
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            Ficha técnica (imagen)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFicha(e.target.files[0])}
            className="w-full text-sm text-slate-600"
            required
          />
          {ficha && (
            <img
              src={URL.createObjectURL(ficha)}
              alt="Vista previa de la ficha técnica"
              className="mt-3 w-full rounded-md border border-slate-200"
            />
          )}
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white font-semibold py-2 rounded-md hover:bg-blue-700 transition"
        >
          Guardar producto
        </button>
      </form>
    </div>
  );
}

export default NuevoProducto;