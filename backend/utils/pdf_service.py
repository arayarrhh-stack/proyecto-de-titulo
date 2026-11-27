"""Generación en servidor de PDF de Cotización al cliente, OC al proveedor y Solicitud (HU-25, HU-37, RNF-04)."""

from decimal import Decimal, ROUND_HALF_UP
from io import BytesIO
from pathlib import Path
from xml.sax.saxutils import escape

from django.conf import settings


# =============================================================================
# 1. UTILIDADES DE FORMATO Y DATOS
# =============================================================================

def formatear_pesos(valor):
    """Formato chileno: $40.459 (sin decimales y con punto como separador de miles)."""
    entero = Decimal(str(valor)).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    return "$" + f"{entero:,}".replace(",", ".")


def _formatear_fecha(valor):
    """dd-mm-aaaa para fechas y fechas con hora."""
    return valor.strftime("%d-%m-%Y") if valor else "-"


def _formatear_variante(talla, color):
    """Une talla y color si están presentes."""
    partes = (f"Talla {talla}" if talla else "", color)
    return " · ".join(x for x in partes if x)


def _datos_cliente(cotizacion):
    """Datos del cliente para el encabezado (nunca costos ni márgenes, RNF-04)."""
    cliente = cotizacion.solicitud.cliente
    empresa = getattr(cliente, "empresa", None)
    nombre = (getattr(cliente, "first_name", "") or "").strip()
    return {
        "razon_social": getattr(empresa, "razon_social", "") or "-",
        "rut": getattr(empresa, "rut", "") or "-",
        "contacto": nombre or "-",
        "correo": getattr(cliente, "email", "") or "-",
        "telefono": getattr(empresa, "telefono", "") or "",
    }


# =============================================================================
# 2. MOTORES DE RENDERIZADO (WEASYPRINT / RESPALDO PDF 1.4)
# =============================================================================

def _weasyprint_disponible():
    """WeasyPrint necesita librerías del sistema; si no cargan, se usa otro generador."""
    try:
        import weasyprint  # type: ignore  # noqa: F401
        return True
    except Exception:
        return False


def _renderizar_bytes_pdf(html_string, texto_respaldo):
    """Usa WeasyPrint si está disponible en el entorno; si no, genera un PDF 1.4 válido."""
    try:
        from weasyprint import HTML  # type: ignore
        return HTML(string=html_string).write_pdf()
    except Exception:
        texto_limpio = (
            texto_respaldo.replace("\\", "\\\\")
            .replace("(", "\\(")
            .replace(")", "\\)")
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


# =============================================================================
# 3. COMPONENTES COMPARTIDOS DE REPORTLAB
# =============================================================================

def _obtener_estilos_reportlab():
    """Devuelve paleta de colores y estilos base reutilizables para ReportLab."""
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_RIGHT
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet

    paleta = {
        "azul": colors.HexColor("#0b192c"),
        "amarillo": colors.HexColor("#facc15"),
        "gris": colors.HexColor("#64748b"),
        "borde": colors.HexColor("#cbd5e1"),
        "blanco": colors.white,
    }

    base = getSampleStyleSheet()["Normal"]
    normal = ParagraphStyle("normal", parent=base, fontName="Helvetica", fontSize=9, leading=12)
    derecha = ParagraphStyle("derecha", parent=normal, alignment=TA_RIGHT)

    estilos = {
        "normal": normal,
        "chico": ParagraphStyle("chico", parent=normal, fontSize=8, textColor=paleta["gris"]),
        "marca": ParagraphStyle("marca", parent=normal, fontName="Helvetica-Bold", fontSize=20, leading=24, textColor=paleta["azul"]),
        "titulo": ParagraphStyle("titulo", parent=normal, fontName="Helvetica-Bold", fontSize=16, leading=20, textColor=paleta["azul"]),
        "subtitulo": ParagraphStyle("subtitulo", parent=normal, fontName="Helvetica-Bold", textColor=paleta["azul"]),
        "cabecera": ParagraphStyle("cabecera", parent=normal, fontName="Helvetica-Bold", textColor=paleta["blanco"]),
        "derecha": derecha,
        "derecha_gris": ParagraphStyle("derecha_gris", parent=derecha, textColor=paleta["gris"]),
        "derecha_negrita": ParagraphStyle("derecha_negrita", parent=derecha, fontName="Helvetica-Bold", fontSize=11, leading=14),
        "derecha_titulo": ParagraphStyle("derecha_titulo", parent=derecha, fontName="Helvetica-Bold", fontSize=13, leading=16),
    }
    return paleta, estilos


def _crear_parrafo(texto, estilo):
    from reportlab.platypus import Paragraph
    return Paragraph(escape(str(texto)), estilo)


def _crear_encabezado_reportlab(titulo_der, subtitulo_der, paleta, estilos):
    """Tabla de encabezado corporativo ACOMSE SpA."""
    from reportlab.lib.units import mm
    from reportlab.platypus import Table, TableStyle

    encabezado = Table(
        [
            [_crear_parrafo("ACOMSE SpA", estilos["marca"]), _crear_parrafo(titulo_der, estilos["derecha_titulo"])],
            [_crear_parrafo("Soluciones en Seguridad Industrial", estilos["chico"]), _crear_parrafo(subtitulo_der, estilos["derecha_gris"])],
        ],
        colWidths=[95 * mm, 85 * mm],
    )
    encabezado.setStyle(
        TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
            ("LINEBELOW", (0, -1), (-1, -1), 2, paleta["amarillo"]),
            ("BOTTOMPADDING", (0, -1), (-1, -1), 6),
        ])
    )
    return encabezado


def _construir_pdf_reportlab(historia, titulo_doc, texto_pie, color_pie):
    """Construye el documento A4 con márgenes y pie de página estándar."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.platypus import SimpleDocTemplate

    def pie(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(color_pie)
        canvas.drawString(15 * mm, 10 * mm, texto_pie)
        canvas.drawRightString(195 * mm, 10 * mm, f"Página {doc.page}")
        canvas.restoreState()

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=15 * mm,
        rightMargin=15 * mm,
        topMargin=15 * mm,
        bottomMargin=18 * mm,
        title=titulo_doc,
        author="ACOMSE SpA",
    )
    doc.build(historia, onFirstPage=pie, onLaterPages=pie)
    return buffer.getvalue()


# =============================================================================
# 4. CONSTRUCTORES INTERNOS DE COTIZACIÓN
# =============================================================================

def _html_cotizacion_cliente(cotizacion, lineas):
    """Genera el HTML de la cotización para renderizar con WeasyPrint."""
    filas_html = []
    for linea in lineas:
        ls = linea.linea_solicitud
        filas_html.append(
            f"<tr>"
            f"<td>{escape(str(ls.producto.codigo))}</td>"
            f"<td>{escape(str(ls.producto.nombre))} ({escape(str(ls.talla))} {escape(str(ls.color))})</td>"
            f"<td>{ls.cantidad}</td>"
            f"<td>{formatear_pesos(linea.precio_unitario_venta)}</td>"
            f"<td>{formatear_pesos(linea.subtotal_neto)}</td>"
            f"</tr>"
        )
    return (
        f"<html><body>"
        f"<h1>ACOMSE SpA - Cotización Oficial {cotizacion.folio}</h1>"
        f"<p>Solicitud asociada: {cotizacion.solicitud.folio} | Validez: {cotizacion.validez_hasta}</p>"
        f"<table border='1'><thead><tr><th>Código</th><th>Producto</th><th>Cant.</th>"
        f"<th>Precio Unit. Venta</th><th>Subtotal Neto</th></tr></thead>"
        f"<tbody>{''.join(filas_html)}</tbody></table>"
        f"<p>Neto: {formatear_pesos(cotizacion.neto)} | IVA (19%): {formatear_pesos(cotizacion.iva)} "
        f"| Total: {formatear_pesos(cotizacion.total)}</p>"
        f"<p>Condiciones: {escape(str(cotizacion.condiciones_comerciales))}</p>"
        f"</body></html>"
    )


def _pdf_cotizacion_reportlab(cotizacion, lineas):
    """PDF completo con ReportLab (solo Python): sirve igual en cualquier computador."""
    from reportlab.lib.units import mm
    from reportlab.platypus import Paragraph, Spacer, Table, TableStyle

    paleta, est = _obtener_estilos_reportlab()
    p = lambda texto, estilo=est["normal"]: _crear_parrafo(texto, estilo)

    cliente = _datos_cliente(cotizacion)
    contacto = cliente["contacto"]
    if cliente["telefono"]:
        contacto = f"{contacto} · {cliente['telefono']}"

    # 1. Encabezado
    encabezado = _crear_encabezado_reportlab(
        f"Cotización {cotizacion.folio}",
        f"Solicitud asociada {cotizacion.solicitud.folio}",
        paleta,
        est,
    )
    historia = [encabezado, Spacer(1, 8 * mm), p("Cotización oficial", est["titulo"]), Spacer(1, 4 * mm)]

    # 2. Datos del cliente y oferta
    datos = Table(
        [
            [p("Cliente", est["chico"]), p(cliente["razon_social"]), p("Fecha de emisión", est["chico"]), p(_formatear_fecha(cotizacion.emitida_en))],
            [p("RUT", est["chico"]), p(cliente["rut"]), p("Válida hasta", est["chico"]), p(_formatear_fecha(cotizacion.validez_hasta))],
            [p("Contacto", est["chico"]), p(contacto), p("Plazo de entrega", est["chico"]), p(f"{cotizacion.plazo_entrega_dias} días")],
            [p("Correo", est["chico"]), p(cliente["correo"]), "", ""],
        ],
        colWidths=[22 * mm, 68 * mm, 32 * mm, 58 * mm],
    )
    datos.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
    ]))
    historia += [datos, Spacer(1, 6 * mm)]

    # 3. Tabla de líneas
    cabecera = [p(t, est["cabecera"]) for t in ("Código", "Producto", "Cant.", "Precio unit.", "Subtotal")]
    filas = [cabecera]
    for linea in lineas:
        ls = linea.linea_solicitud
        variante = _formatear_variante(ls.talla, ls.color)
        nombre = escape(str(ls.producto.nombre))
        if variante:
            nombre += f"<br/><font size='7' color='#64748b'>{escape(variante)}</font>"
        filas.append([
            p(ls.producto.codigo),
            Paragraph(nombre, est["normal"]),
            p(ls.cantidad, est["derecha"]),
            p(formatear_pesos(linea.precio_unitario_venta), est["derecha"]),
            p(formatear_pesos(linea.subtotal_neto), est["derecha"]),
        ])

    tabla = Table(filas, colWidths=[24 * mm, 76 * mm, 16 * mm, 32 * mm, 32 * mm], repeatRows=1)
    tabla.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), paleta["azul"]),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LINEBELOW", (0, 1), (-1, -1), 0.5, paleta["borde"]),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    historia += [tabla, Spacer(1, 5 * mm)]

    # 4. Totales
    totales = Table(
        [
            [p("Neto", est["derecha"]), p(formatear_pesos(cotizacion.neto), est["derecha"])],
            [p("IVA (19%)", est["derecha"]), p(formatear_pesos(cotizacion.iva), est["derecha"])],
            [p("Total", est["derecha_negrita"]), p(formatear_pesos(cotizacion.total), est["derecha_negrita"])],
        ],
        colWidths=[40 * mm, 35 * mm],
        hAlign="RIGHT",
    )
    totales.setStyle(TableStyle([
        ("LINEABOVE", (0, 2), (-1, 2), 1, paleta["azul"]),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    historia += [totales, Spacer(1, 8 * mm)]

    # 5. Condiciones comerciales
    historia += [
        p("Condiciones comerciales", est["subtitulo"]),
        Spacer(1, 1.5 * mm),
        p(cotizacion.condiciones_comerciales or "-"),
        Spacer(1, 6 * mm),
        p(
            "Los valores corresponden a pesos chilenos (CLP) y no incluyen otros cargos fuera de lo indicado. "
            "Esta cotización es válida hasta la fecha señalada.",
            est["chico"],
        ),
    ]

    return _construir_pdf_reportlab(
        historia,
        titulo_doc=f"Cotización {cotizacion.folio}",
        texto_pie=f"ACOMSE SpA · Cotización {cotizacion.folio}",
        color_pie=paleta["gris"],
    )


# =============================================================================
# 5. FUNCIONES PÚBLICAS DE GENERACIÓN DE PDF
# =============================================================================

def generar_pdf_cotizacion_cliente(cotizacion):
    """HU-37 y RF-53: emite el PDF oficial al cliente SIN costos ni márgenes (RNF-04)."""
    carpeta = Path(settings.BASE_DIR) / "media" / "cotizaciones_pdf"
    carpeta.mkdir(parents=True, exist_ok=True)
    nombre_archivo = f"{cotizacion.folio}.pdf"
    ruta_destino = carpeta / nombre_archivo

    lineas = list(cotizacion.lineas_oferta.select_related("linea_solicitud__producto"))
    contenido = None

    # 1) WeasyPrint (producción, con Docker) y 2) ReportLab (cualquier equipo local).
    if _weasyprint_disponible():
        try:
            from weasyprint import HTML  # type: ignore
            contenido = HTML(string=_html_cotizacion_cliente(cotizacion, lineas)).write_pdf()
        except Exception:
            contenido = None

    if contenido is None:
        try:
            contenido = _pdf_cotizacion_reportlab(cotizacion, lineas)
        except ImportError:
            resumen = (
                f"ACOMSE Cotizacion {cotizacion.folio} - Neto: {formatear_pesos(cotizacion.neto)} "
                f"- IVA: {formatear_pesos(cotizacion.iva)} - Total: {formatear_pesos(cotizacion.total)}"
            )
            contenido = _renderizar_bytes_pdf("", resumen)

    ruta_destino.write_bytes(contenido)
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
        f"<p>Total Costo Neto Acordado: {formatear_pesos(oc_proveedor.total_costo_neto)}</p>"
        f"</body></html>"
    )
    resumen = (
        f"ACOMSE OC Proveedor {oc_proveedor.folio} - Proveedor: {oc_proveedor.proveedor_nombre} "
        f"- Costo Total Neto: {formatear_pesos(oc_proveedor.total_costo_neto)}"
    )

    ruta_destino.write_bytes(_renderizar_bytes_pdf(html, resumen))
    return f"media/ordenes_compra_pdf/{nombre_archivo}"


def generar_pdf_solicitud(solicitud):
    """RF 038: PDF de la solicitud del cliente para pedir cotización al proveedor.

    No incluye datos del cliente ni precios: solo folio, productos, variantes,
    cantidades y observaciones.
    """
    from reportlab.lib.units import mm
    from reportlab.platypus import Paragraph, Spacer, Table, TableStyle

    paleta, est = _obtener_estilos_reportlab()
    p = lambda texto, estilo=est["normal"]: _crear_parrafo(texto, estilo)

    # 1. Encabezado e introducción
    encabezado = _crear_encabezado_reportlab(
        f"Solicitud {solicitud.folio}",
        f"Fecha: {_formatear_fecha(solicitud.creado_en)}",
        paleta,
        est,
    )
    historia = [
        encabezado,
        Spacer(1, 8 * mm),
        p("Solicitud de cotización", est["titulo"]),
        Spacer(1, 2 * mm),
        p("Favor cotizar los siguientes productos, indicando precio unitario, plazo de entrega y vigencia de la oferta."),
        Spacer(1, 6 * mm),
    ]

    # 2. Tabla de productos
    filas = [[p(t, est["cabecera"]) for t in ("Código", "Producto", "Cant.")]]
    for linea in solicitud.lineas.select_related("producto"):
        prod = linea.producto
        detalle = []
        variante = _formatear_variante(linea.talla, linea.color)
        if variante:
            detalle.append(variante)
        if getattr(prod, "clase_dielectrica", ""):
            detalle.append(f"Clase {prod.clase_dielectrica}")
        if getattr(prod, "tension_max_uso_v", None):
            detalle.append(f"Tensión máx. de uso {prod.tension_max_uso_v} V")
        if getattr(prod, "normativa", ""):
            detalle.append(prod.normativa)
        if getattr(prod, "codigo_proveedor", ""):
            detalle.append(f"Cód. proveedor {prod.codigo_proveedor}")

        nombre = escape(str(prod.nombre))
        if detalle:
            nombre += f"<br/><font size='7' color='#64748b'>{escape(' · '.join(detalle))}</font>"
        filas.append([p(prod.codigo), Paragraph(nombre, est["normal"]), p(linea.cantidad, est["derecha"])])

    tabla = Table(filas, colWidths=[30 * mm, 122 * mm, 28 * mm], repeatRows=1)
    tabla.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), paleta["azul"]),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LINEBELOW", (0, 1), (-1, -1), 0.5, paleta["borde"]),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    historia.append(tabla)

    # Lugar de despacho (sin indicar de quién es)
    direccion = (getattr(solicitud, "direccion_despacho", "") or "").strip()
    if direccion:
        historia += [
            Spacer(1, 6 * mm),
            p("Lugar de despacho", est["subtitulo"]),
            Spacer(1, 1.5 * mm),
            p(direccion),
        ]

    # 3. Observaciones opcionales
    # 3. Observaciones opcionales (se descartan los datos de contacto que
    #    versiones anteriores del formulario guardaban dentro del texto)
    prefijos_cliente = ("empresa:", "rut:", "cargo:", "teléfono:", "telefono:")
    partes = [
        parte.strip()
        for parte in (solicitud.observaciones or "").split("|")
        if parte.strip() and not parte.strip().lower().startswith(prefijos_cliente)
    ]
    observaciones = " | ".join(partes)
    if observaciones:
        historia += [
            Spacer(1, 8 * mm),
            p("Observaciones", est["subtitulo"]),
            Spacer(1, 1.5 * mm),
            p(observaciones),
        ]

    return _construir_pdf_reportlab(
        historia,
        titulo_doc=f"Solicitud {solicitud.folio}",
        texto_pie=f"ACOMSE SpA · Solicitud {solicitud.folio}",
        color_pie=paleta["gris"],
    )