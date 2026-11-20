import { useEffect, useRef } from "react";

const ZOOM_MIN = 80;
const ZOOM_MAX = 125;
const PASO = 5;

export default function ControlZoom() {
  const nivelRef = useRef(100);

  useEffect(() => {
    function aplicarZoom(nuevoNivel) {
      const limitado = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, nuevoNivel));
      nivelRef.current = limitado;
      document.documentElement.style.zoom = `${limitado}%`;
    }

    function alRueda(e) {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const delta = e.deltaY < 0 ? PASO : -PASO;
      aplicarZoom(nivelRef.current + delta);
    }

    function alTecla(e) {
      if (!e.ctrlKey && !e.metaKey) return;

      if (e.key === "+" || e.key === "=" || e.key === "Add") {
        e.preventDefault();
        aplicarZoom(nivelRef.current + PASO);
      } else if (e.key === "-" || e.key === "_" || e.key === "Subtract") {
        e.preventDefault();
        aplicarZoom(nivelRef.current - PASO);
      } else if (e.key === "0") {
        e.preventDefault();
        aplicarZoom(100);
      }
    }

    window.addEventListener("wheel", alRueda, { passive: false });
    window.addEventListener("keydown", alTecla);

    return () => {
      window.removeEventListener("wheel", alRueda);
      window.removeEventListener("keydown", alTecla);
      document.documentElement.style.zoom = "100%";
    };
  }, []);

  return null;
}
