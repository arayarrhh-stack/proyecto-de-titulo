"""Atiende las consultas públicas del catálogo (M3) y su administración (M2).

Base de HU-15 (lista de productos) y HU-16 (detalle de un producto).
HU-17 añade la búsqueda por nombre o código mediante ?busqueda=texto y el
filtro combinable por categoría mediante ?categoria=id.
urls.py dirige aquí las consultas. Esta vista busca los datos en models.py
y usa serializers.py para preparar la respuesta.
Catalogo.jsx enviará el texto del buscador a esta API y mostrará sus resultados.
"""
from django.core.exceptions import PermissionDenied, ValidationError
# HU-17: Q permite unir las condiciones de búsqueda por nombre y por código.
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
# HU-15 / HU-16: AllowAny permite que un visitante consulte sin iniciar sesión.
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
# HU-15 / HU-16: esta clase proporciona las consultas de lista y detalle.
from rest_framework.viewsets import ReadOnlyModelViewSet

# HU-07 / HU-17: importa los modelos del catálogo técnico.
from .models import Categoria, EstadoValidacionFicha, Producto, Proveedor
# HU-15 / HU-16: importa la conversión de productos a los campos públicos y administrativos.
from .serializers import (
    CategoriaAdminSerializer,
    CategoriaPublicaSerializer,
    ProductoAdminSerializer,
    ProductoSerializer,
    ProveedorAdminSerializer,
)
from .services import (
    actualizar_producto,
    registrar_producto,
    validar_ficha_tecnica,
    verificar_vigencia_fichas,
)


def _es_administradora(user):
    """Verifica si el usuario autenticado tiene rol Administrador."""
    return bool(
        user
        and user.is_authenticated
        and (user.is_staff or getattr(user, "rol", "") == "administradora")
    )


def _puede_ver_fichas(user):
    """La administradora y la validadora técnica pueden listar productos con su estado de ficha."""
    return _es_administradora(user) or bool(
        user and user.is_authenticated and getattr(user, "rol", "") == "validadora"
    )


# HU-15 / HU-16 / HU-17: reúne la lista, el detalle y la búsqueda del catálogo.
class ProductoViewSet(ReadOnlyModelViewSet):
    """Permite consultar la lista y un producto concreto, sin modificar datos."""

    # HU-12 / HU-13: muestra solo productos activos con su ficha validada.
    # Los demás se omiten de la lista. Si se consulta su detalle, responde
    # 404 ("no encontrado"). La regla se aplica a ambas formas de consulta.
    queryset = Producto.objects.filter(
        activo=True
    ).prefetch_related("variantes", "imagenes")

    # HU-15 / HU-16: prepara los campos públicos mediante ProductoSerializer.
    serializer_class = ProductoSerializer

    # HU-15 / HU-16: cualquier visitante puede consultar sin iniciar sesión.
    # ReadOnlyModelViewSet permite leer; no ofrece crear, editar ni borrar.
    permission_classes = [AllowAny]

    # HU-17: prepara los productos que responderán a cada consulta del catálogo.
    def get_queryset(self):
        verificar_vigencia_fichas()
        # HU-12 / HU-13 / HU-17: parte del filtro de productos activos y validados.
        productos = super().get_queryset()
        # HU-16 / HU-17: aplica la búsqueda solo a la lista, no al detalle por id.
        if self.action != "list":
            # HU-16: el detalle conserva las reglas de publicación del catálogo.
            return productos

        # HU-17: lee ?busqueda=texto; si no existe usa vacío y quita espacios externos.
        busqueda = self.request.query_params.get("busqueda", "").strip()
        # HU-17: solo filtra cuando el visitante ha escrito algún texto.
        if busqueda:
            # HU-17: busca una coincidencia parcial en nombre O código; | significa «o».
            coincidencias = Q(nombre__icontains=busqueda) | Q(
                codigo__icontains=busqueda
            )
            # HU-17: añade la búsqueda sin quitar el filtro de productos publicados.
            productos = productos.filter(coincidencias)

        # HU-10 / HU-17: filtro combinable por categoría (?categoria=id).
        categoria_id = self.request.query_params.get("categoria", "").strip()
        if categoria_id.isdigit():
            productos = productos.filter(categoria_id=int(categoria_id))

        # HU-14 / RF-19: filtro opcional de productos destacados (?destacado=true).
        destacado = self.request.query_params.get("destacado", "").strip().lower()
        if destacado in ("true", "1"):
            productos = productos.filter(destacado=True)

        # HU-15 / HU-17: entrega la consulta para paginarla en grupos de 24 productos.
        return productos


class CategoriaPublicaListView(APIView):
    """Lista pública de categorías ordenadas sin exponer márgenes ni recargos (HU-10, RNF-04)."""

    permission_classes = [AllowAny]

    def get(self, request):
        categorias = Categoria.objects.all()
        serializer = CategoriaPublicaSerializer(categorias, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class CategoriaAdminListCreateView(APIView):
    """Administración de categorías con margen y recargos por defecto (HU-10, HU-11)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not _es_administradora(request.user):
            return Response(status=status.HTTP_403_FORBIDDEN)
        serializer = CategoriaAdminSerializer(Categoria.objects.all(), many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        if not _es_administradora(request.user):
            return Response(status=status.HTTP_403_FORBIDDEN)
        serializer = CategoriaAdminSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ProveedorAdminListCreateView(APIView):
    """Registro y consulta administrativa de proveedores (HU-11, RF-13)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not _es_administradora(request.user):
            return Response(status=status.HTTP_403_FORBIDDEN)
        serializer = ProveedorAdminSerializer(Proveedor.objects.all(), many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        if not _es_administradora(request.user):
            return Response(status=status.HTTP_403_FORBIDDEN)
        serializer = ProveedorAdminSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ProductoAdminListCreateView(APIView):
    """Listado completo y creación de productos para el panel administrativo (HU-07, RF-09)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not _puede_ver_fichas(request.user):
            return Response(status=status.HTTP_403_FORBIDDEN)
        productos = Producto.objects.all()
        serializer = ProductoAdminSerializer(productos, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        if not _es_administradora(request.user):
            return Response(status=status.HTTP_403_FORBIDDEN)
        serializer = ProductoAdminSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        try:
            producto = registrar_producto(
                datos=serializer.validated_data,
                variantes=request.data.get("variantes", []),
                imagenes=request.data.get("imagenes", []),
            )
            if not producto.activo:
                producto.activo = True
                producto.save(update_fields=["activo"])
        except ValidationError as exc:
            return Response({"detalle": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            ProductoAdminSerializer(producto).data, status=status.HTTP_201_CREATED
        )


class ProductoAdminDetailView(APIView):
    """Edición e inactivación de productos desde el panel administrativo (HU-08, HU-12)."""

    permission_classes = [IsAuthenticated]

    def patch(self, request, producto_id):
        if not _es_administradora(request.user):
            return Response(status=status.HTTP_403_FORBIDDEN)
        producto = get_object_or_404(Producto, id=producto_id)
        serializer = ProductoAdminSerializer(producto, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        try:
            actualizado = actualizar_producto(producto, serializer.validated_data)
        except ValidationError as exc:
            return Response({"detalle": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            ProductoAdminSerializer(actualizado).data, status=status.HTTP_200_OK
        )


class ValidarFichaTecnicaView(APIView):
    """Aprobación de fichas técnicas exclusiva para el rol Validadora técnica (HU-13, RF-04, RF-17)."""

    permission_classes = [IsAuthenticated]

    def post(self, request, producto_id):
        producto = get_object_or_404(Producto, id=producto_id)
        try:
            actualizado = validar_ficha_tecnica(
                producto=producto,
                usuario_validador=request.user,
                nuevo_estado=request.data.get(
                    "estado_validacion", EstadoValidacionFicha.VALIDADA
                ),
                fuente_ficha=request.data.get("fuente_ficha", ""),
                version_ficha=request.data.get("version_ficha", "1.0"),
                fecha_vigencia=request.data.get("fecha_vigencia_ficha"),
            )
        except PermissionDenied as exc:
            return Response({"detalle": str(exc)}, status=status.HTTP_403_FORBIDDEN)
        except ValidationError as exc:
            return Response({"detalle": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            ProductoAdminSerializer(actualizado).data, status=status.HTTP_200_OK
        )