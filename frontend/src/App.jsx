import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CotizacionProvider } from "./context/CotizacionContext";
import Navbar from "./components/Navbar";
import RutaProtegida from "./components/RutaProtegida";
import Catalogo from "./pages/Catalogo";
import Login from "./pages/Login";
import Registro from "./pages/Registro";
import Cotizacion from "./pages/Cotizacion";
import MisCotizaciones from "./pages/MisCotizaciones";
import NuevoProducto from "./pages/NuevoProducto";
import AdminCotizaciones from "./pages/AdminCotizaciones";
import VerificarCorreo from "./pages/VerificarCorreo";
import NuevaSolicitud from "./pages/NuevaSolicitud";
import AsistenteChat from "./components/AsistenteChat";
import Pedidos from "./pages/Pedidos";


function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CotizacionProvider>
          <Navbar />
          <Routes>
            <Route path="/" element={<Catalogo />} />
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Registro />} />
            <Route path="/verificar-correo" element={<VerificarCorreo />} />
            <Route path="/cotizacion" element={<Cotizacion />} />

            <Route
              path="/mis-cotizaciones"
              element={
                <RutaProtegida rol="cliente">
                  <MisCotizaciones />
                </RutaProtegida>
              }
            />
            <Route
              path="/admin/productos/nuevo"
              element={
                <RutaProtegida rol="admin">
                  <NuevoProducto />
                </RutaProtegida>
              }
            />
            <Route
              path="/admin/cotizaciones"
              element={
                <RutaProtegida rol="admin">
                  <AdminCotizaciones />
                </RutaProtegida>
              }
            />
            <Route
              path="/admin/solicitudes/nueva"
              element={
                <RutaProtegida rol="admin">
                  <NuevaSolicitud />
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
            <Route
              path="/admin/pedidos"
              element={
                <RutaProtegida rol="admin">
                  <Pedidos admin />
                </RutaProtegida>
              }
            />
          </Routes>
          <AsistenteChat />
        </CotizacionProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;