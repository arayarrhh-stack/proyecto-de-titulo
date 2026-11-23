import { BrowserRouter, Routes, Route, useLocation , Navigate } from "react-router-dom"; 
import { AuthProvider } from "./context/AuthContext";
import { CotizacionProvider } from "./context/CotizacionContext";

import BarraSuperior from "./components/compartidos/BarraSuperior";
import Navbar from "./components/compartidos/Navbar";
import PiePagina from "./components/compartidos/PiePagina";
import RutaProtegida from "./components/compartidos/RutaProtegida";
import AsistenteChat from "./components/compartidos/AsistenteChat";
import ControlZoom from "./components/compartidos/ControlZoom";

import Inicio from "./pages/portada/Inicio";
import Catalogo from "./pages/catalogo/Catalogo";
import Login from "./pages/autenticacion/Login";
import Registro from "./pages/autenticacion/Registro";
import VerificarCorreo from "./pages/autenticacion/VerificarCorreo";
import ValidadoraFichas from "./pages/validadora/ValidadoraFichas";

import ClienteLayout from "./pages/cliente/ClienteLayout";
import Cotizacion from "./pages/cliente/Cotizacion";
import MisCotizaciones from "./pages/cliente/MisCotizaciones";
import Pedidos from "./pages/cliente/Pedidos";

import AdminLayout from "./pages/admin/AdminLayout";
import DashboardAdmin from "./pages/admin/DashboardAdmin";
import AdminCotizaciones from "./pages/admin/AdminCotizaciones";
import NuevaSolicitud from "./pages/admin/NuevaSolicitud";
import NuevoProducto from "./pages/admin/NuevoProducto";
import AdminProductos from "./pages/admin/AdminProductos";
import AdminCategorias from "./pages/admin/AdminCategorias";
import AdminMensajes from "./pages/admin/AdminMensajes";

function ContenidoApp() {
  const location = useLocation();
  const esPanelDedicado =
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/cliente") ||
    location.pathname.startsWith("/validadora");

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <ControlZoom />
      {!esPanelDedicado && <BarraSuperior />}
      {!esPanelDedicado && <Navbar />}

      <div className="flex-1">
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/catalogo" element={<Catalogo />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/verificar-correo" element={<VerificarCorreo />} />
          <Route path="/cotizacion" element={<Cotizacion />} />

          {/* Panel de la Validadora técnica */}
          <Route
            path="/validadora"
            element={
              <RutaProtegida rol="validadora">
                <ValidadoraFichas />
              </RutaProtegida>
            }
          />

          {/* Panel del Cliente */}
          <Route
            path="/cliente"
            element={
              <RutaProtegida rol="cliente">
                <ClienteLayout />
              </RutaProtegida>
            }
          >
            <Route path="cotizacion" element={<Navigate to="/cotizacion" replace />} />
            <Route path="mis-cotizaciones" element={<MisCotizaciones />} />
            <Route path="mis-pedidos" element={<Pedidos />} />
          </Route>

          <Route
            path="/mis-cotizaciones"
            element={
              <RutaProtegida rol="cliente">
                <MisCotizaciones />
              </RutaProtegida>
            }
          />
          <Route
            path="/mis-pedidos"
            element={
              <RutaProtegida rol="cliente">
                <Pedidos />
              </RutaProtegida>
            }
          />

          {/* Panel del Administrador */}
          <Route
            path="/admin"
            element={
              <RutaProtegida rol="admin">
                <AdminLayout />
              </RutaProtegida>
            }
          >
            <Route index element={<DashboardAdmin />} />
            <Route path="cotizaciones" element={<AdminCotizaciones />} />
            <Route path="solicitudes/nueva" element={<NuevaSolicitud />} />
            <Route path="pedidos" element={<Pedidos admin />} />
            <Route path="productos" element={<AdminProductos />} />
            <Route path="productos/nuevo" element={<NuevoProducto />} />
            <Route path="productos/editar/:id" element={<NuevoProducto />} />
            <Route path="categorias" element={<AdminCategorias />} />
            <Route path="mensajes" element={<AdminMensajes />} />
          </Route>
        </Routes>
      </div>

      {!esPanelDedicado && <PiePagina />}
      {!esPanelDedicado && <AsistenteChat />}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CotizacionProvider>
          <ContenidoApp />
        </CotizacionProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;




