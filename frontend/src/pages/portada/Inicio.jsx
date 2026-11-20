import { useEffect, useState } from "react";
import { listarCategorias, listarProductos, eliminarProducto } from "../../services/catalogo";
import BannerPrincipal from "../../components/portada/BannerPrincipal";
import SeccionCategorias from "../../components/portada/SeccionCategorias";
import ProductosDestacados from "../../components/portada/ProductosDestacados";
import FranjaBeneficios from "../../components/portada/FranjaBeneficios";
import SeccionPorQueElegirnos from "../../components/portada/SeccionPorQueElegirnos";

export default function Inicio() {
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);

  function cargarDatos() {
    setCargando(true);
    Promise.all([
      listarCategorias().catch(() => []),
      listarProductos({ pagina: 1 }).catch(() => ({ productos: [] })),
    ]).then(([listaCategorias, resultadoProductos]) => {
      setCategorias(listaCategorias);
      setProductos(resultadoProductos.productos || []);
      setCargando(false);
    });
  }

  useEffect(() => {
    cargarDatos();
  }, []);

  async function manejarEliminar(id) {
    await eliminarProducto(id);
    cargarDatos();
  }

  return (
    <div className="flex flex-col bg-slate-50 text-slate-800">
      <BannerPrincipal />
      <SeccionCategorias categorias={categorias} productos={productos} />
      <ProductosDestacados
        productos={productos.slice(0, 4)}
        cargando={cargando}
        onEliminar={manejarEliminar}
      />
      <FranjaBeneficios />
      <SeccionPorQueElegirnos />
    </div>
  );
}
