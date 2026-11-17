import { createContext, useContext, useEffect, useState } from "react";

const CotizacionContext = createContext();
const CLAVE = "cotizacion-items";

function leerGuardado() {
  try {
    const guardado = sessionStorage.getItem(CLAVE);
    return guardado ? JSON.parse(guardado) : [];
  } catch {
    return [];
  }
}

export function CotizacionProvider({ children }) {
  const [items, setItems] = useState(leerGuardado);

  useEffect(() => {
    try {
      sessionStorage.setItem(CLAVE, JSON.stringify(items));
    } catch {
      // si el navegador no permite guardar, el carrito dura hasta recargar
    }
  }, [items]);

  function agregar(producto, variante = {}) {
    const talla = variante.talla || "";
    const color = variante.color || "";

    setItems((actuales) => {
      const existe = actuales.find(
        (i) => i.id === producto.id && i.talla === talla && i.color === color
      );
      if (existe) {
        return actuales.map((i) =>
          i.lineaId === existe.lineaId ? { ...i, cantidad: i.cantidad + 1 } : i
        );
      }
      return [
        ...actuales,
        {
          lineaId: `${producto.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          id: producto.id,
          nombre: producto.nombre,
          imagen: producto.imagen,
          tallas: producto.tallas || [],
          colores: producto.colores || [],
          talla,
          color,
          cantidad: 1,
        },
      ];
    });
  }

  function quitar(lineaId) {
    setItems((actuales) => actuales.filter((i) => i.lineaId !== lineaId));
  }

  function cambiarCantidad(lineaId, cantidad) {
    if (cantidad < 1) return;
    setItems((actuales) =>
      actuales.map((i) => (i.lineaId === lineaId ? { ...i, cantidad } : i))
    );
  }

  function cambiarVariante(lineaId, campo, valor) {
    setItems((actuales) => {
      const linea = actuales.find((i) => i.lineaId === lineaId);
      if (!linea) return actuales;

      const nueva = { ...linea, [campo]: valor };
      const duplicada = actuales.find(
        (i) =>
          i.lineaId !== lineaId &&
          i.id === nueva.id &&
          i.talla === nueva.talla &&
          i.color === nueva.color
      );

      // si la variante elegida ya existe en otra línea, se unen las cantidades
      if (duplicada) {
        return actuales
          .filter((i) => i.lineaId !== lineaId)
          .map((i) =>
            i.lineaId === duplicada.lineaId
              ? { ...i, cantidad: i.cantidad + linea.cantidad }
              : i
          );
      }
      return actuales.map((i) => (i.lineaId === lineaId ? nueva : i));
    });
  }

  function vaciar() {
    setItems([]);
  }

  const totalProductos = items.reduce((suma, i) => suma + i.cantidad, 0);

  return (
    <CotizacionContext.Provider
      value={{
        items,
        agregar,
        quitar,
        cambiarCantidad,
        cambiarVariante,
        vaciar,
        totalProductos,
      }}
    >
      {children}
    </CotizacionContext.Provider>
  );
}

export function useCotizacion() {
  return useContext(CotizacionContext);
}