import { createContext, useContext, useEffect, useState } from "react";

const CotizacionContext = createContext();
const CLAVE_STORAGE = "acomse_carro_cotizacion";

function generarClave(id, talla = "", color = "") {
  return `${id}::${talla || ""}::${color || ""}`;
}

export function CotizacionProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const guardado = localStorage.getItem(CLAVE_STORAGE);
      return guardado ? JSON.parse(guardado) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_STORAGE, JSON.stringify(items));
    } catch {
      // ignora error de almacenamiento
    }
  }, [items]);

  function agregar(producto, { talla = "", color = "" } = {}) {
    const clave = generarClave(producto.id, talla, color);
    setItems((prev) => {
      const existe = prev.find(
        (it) => generarClave(it.id, it.talla, it.color) === clave
      );
      if (existe) {
        return prev.map((it) =>
          generarClave(it.id, it.talla, it.color) === clave
            ? { ...it, cantidad: (it.cantidad || 1) + 1 }
            : it
        );
      }
      return [
        ...prev,
        {
          id: producto.id,
          codigo: producto.codigo || "",
          nombre: producto.nombre,
          imagen: producto.imagen || null,
          talla,
          color,
          cantidad: 1,
        },
      ];
    });
  }

  function quitar(id, { talla = "", color = "" } = {}) {
    const clave = generarClave(id, talla, color);
    setItems((prev) =>
      prev.filter((it) => generarClave(it.id, it.talla, it.color) !== clave)
    );
  }

  function actualizarCantidad(id, nuevaCantidad, { talla = "", color = "" } = {}) {
    const cantidad = Math.max(1, Number(nuevaCantidad) || 1);
    const clave = generarClave(id, talla, color);
    setItems((prev) =>
      prev.map((it) =>
        generarClave(it.id, it.talla, it.color) === clave
          ? { ...it, cantidad }
          : it
      )
    );
  }

  function vaciar() {
    setItems([]);
  }

  return (
    <CotizacionContext.Provider
      value={{ items, agregar, quitar, actualizarCantidad, vaciar }}
    >
      {children}
    </CotizacionContext.Provider>
  );
}

export function useCotizacion() {
  return useContext(CotizacionContext);
}
