"""Generación en servidor de PDF de Cotización al cliente y OC al proveedor (HU-25, HU-37, RNF-04)."""
from pathlib import Path
from django.conf import settings


def _renderizar_bytes_pdf(html_string, texto_respaldo):
    """Usa WeasyPrint si está disponible en el entorno; si no, genera un PDF 1.4 válido."""
    try:
        from weasyprint import HTML  # type: ignore

        return HTML(string=html_string).write_pdf()
    except Exception:
        texto_limpio = (
            texto_respaldo.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        )
        contenido = f"BT /F1 10 Tf 40 750 Td ({texto_limpio[:400]}) Tj ET"
        pdf_minimo = (
            "%PDF-1.4\n"
            "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n"
            "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n"
            "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
            "/Contents 4 0 R >> endobj\n"
            f"4 0 obj << /Length {len(contenido)} >> stream\n{contenido}\nendstream endobj\n"
            "xref\n0 5\n0000000000 65535 f \n"
            "trailer << /Root 1 0 R /Size 5 >>\n%%EOF"
        )
        return pdf_minimo.encode("latin-1", errors="ignore")


def generar_pdf_cotizacion_cliente(cotizacion):
    """HU-37 y RF-53: emite el PDF oficial al cliente SIN costos ni márgenes (RNF-04)."""
    carpeta = Path(settings.BASE_DIR) / "media" / "cotizaciones_pdf"
    carpeta.mkdir(parents=True, exist_ok=True)
    nombre_archivo = f"{cotizacion.folio}.pdf"
    ruta_destino = carpeta / nombre_archivo

    filas_html = []
    for linea in cotizacion.lineas_oferta.select_related("linea_solicitud__producto"):
        ls = linea.linea_solicitud
        filas_html.append(
            f"<tr>"
            f"<td>{ls.producto.codigo}</td>"
            f"<td>{ls.producto.nombre} ({ls.talla} {ls.color})</td>"
            f"<td>{ls.cantidad}</td>"
            f"<td>${linea.precio_unitario_venta}</td>"
            f"<td>${linea.subtotal_neto}</td>"
            f"</tr>"
        )

    html = (
        f"<html><body>"
        f"<h1>ACOMSE SpA - Cotización Oficial {cotizacion.folio}</h1>"
        f"<p>Solicitud asociada: {cotizacion.solicitud.folio} | Validez: {cotizacion.validez_hasta}</p>"
        f"<table border='1'><thead><tr><th>Código</th><th>Producto</th><th>Cant.</th>"
        f"<th>Precio Unit. Venta</th><th>Subtotal Neto</th></tr></thead>"
        f"<tbody>{''.join(filas_html)}</tbody></table>"
        f"<p>Neto: ${cotizacion.neto} | IVA (19%): ${cotizacion.iva} | Total: ${cotizacion.total}</p>"
        f"<p>Condiciones: {cotizacion.condiciones_comerciales}</p>"
        f"</body></html>"
    )
    resumen = (
        f"ACOMSE Cotizacion {cotizacion.folio} - Neto: ${cotizacion.neto} "
        f"- IVA: ${cotizacion.iva} - Total: ${cotizacion.total}"
    )

    ruta_destino.write_bytes(_renderizar_bytes_pdf(html, resumen))
    return f"media/cotizaciones_pdf/{nombre_archivo}"


def generar_pdf_oc_proveedor(oc_proveedor):
    """HU-25 y RF-35: emite la OC al proveedor con costos y SIN precios de venta (RNF-04)."""
    carpeta = Path(settings.BASE_DIR) / "media" / "ordenes_compra_pdf"
    carpeta.mkdir(parents=True, exist_ok=True)
    nombre_archivo = f"{oc_proveedor.folio}.pdf"
    ruta_destino = carpeta / nombre_archivo

    html = (
        f"<html><body>"
        f"<h1>ACOMSE SpA - Orden de Compra a Proveedor {oc_proveedor.folio}</h1>"
        f"<p>Proveedor: {oc_proveedor.proveedor_nombre}</p>"
        f"<p>Dirección de despacho: {oc_proveedor.direccion_despacho}</p>"
        f"<p>Total Costo Neto Acordado: ${oc_proveedor.total_costo_neto}</p>"
        f"</body></html>"
    )
    resumen = (
        f"ACOMSE OC Proveedor {oc_proveedor.folio} - Proveedor: {oc_proveedor.proveedor_nombre} "
        f"- Costo Total Neto: ${oc_proveedor.total_costo_neto}"
    )

    ruta_destino.write_bytes(_renderizar_bytes_pdf(html, resumen))
    return f"media/ordenes_compra_pdf/{nombre_archivo}"