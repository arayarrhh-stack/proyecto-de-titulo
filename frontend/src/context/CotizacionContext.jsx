import { createContext, useContext, useEffect, useState } from "react";

const CotizacionContext = createContext();
const CLAVE_STORAGE = "acomse_carro_cotizacion";
export const MAX_CANTIDAD_PRODUCTO = 30;

function generarClave(id, talla = "", color = "") {
  return `${id}::${talla || ""}::${color || ""}`;
}

function limitarCantidad(valor) {
  const n = Math.floor(Number(valor) || 1);
  return Math.min(MAX_CANTIDAD_PRODUCTO, Math.max(1, n));
}

export function CotizacionProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const guardado = localStorage.getItem(CLAVE_STORAGE);
      const parsed = guardado ? JSON.parse(guardado) : [];
      return Array.isArray(parsed)
        ? parsed.map((it) => ({ ...it, cantidad: limitarCantidad(it.cantidad) }))
        : [];
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
            ? { ...it, cantidad: limitarCantidad((it.cantidad || 1) + 1) }
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
    const cantidad = limitarCantidad(nuevaCantidad);
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
      value={{ items, agregar, quitar, actualizarCantidad, vaciar, maxCantidad: MAX_CANTIDAD_PRODUCTO }}
    >
      {children}
    </CotizacionContext.Provider>
  );
}

export function useCotizacion() {
  return useContext(CotizacionContext);
}
