from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APIClient

from .models import RolUsuario, Usuario
from .verificacion import generar_token

class AutenticacionTests(TestCase):
    def setUp(self):
        self.api = APIClient()
        Usuario.objects.create_user(
            username="ana@empresa.cl",
            email="ana@empresa.cl",
            password="Clave1234",
            first_name="Ana",
            rol=RolUsuario.CLIENTE,
        )

    def iniciar(self, correo="Ana@Empresa.cl", password="Clave1234"):
        return self.api.post(
            "/api/usuarios/login/", {"correo": correo, "password": password}, format="json"
        )

    def test_login_correcto_devuelve_perfil_y_rol(self):
        r = self.iniciar()
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["rol"], "cliente")
        self.assertEqual(self.api.get("/api/usuarios/perfil/").status_code, 200)

    def test_login_con_clave_incorrecta(self):
        r = self.iniciar(password="otra")
        self.assertEqual(r.status_code, 401)

    def test_perfil_sin_sesion_no_se_entrega(self):
        r = self.api.get("/api/usuarios/perfil/")
        self.assertIn(r.status_code, (401, 403))

    def test_logout_cierra_la_sesion(self):
        self.iniciar()
        self.assertEqual(self.api.post("/api/usuarios/logout/").status_code, 200)
        self.assertIn(self.api.get("/api/usuarios/perfil/").status_code, (401, 403))

    def test_login_exige_token_csrf(self):
        estricto = APIClient(enforce_csrf_checks=True)
        r = estricto.post(
            "/api/usuarios/login/",
            {"correo": "ana@empresa.cl", "password": "Clave1234"},
            format="json",
        )
        self.assertEqual(r.status_code, 403)

    def test_csrf_entrega_cookie(self):
        r = self.api.get("/api/usuarios/csrf/")
        self.assertIn("csrftoken", r.cookies)


class RegistroTests(TestCase):
    def setUp(self):
        self.api = APIClient()

    def datos(self, **cambios):
        base = {
            "tipo_cliente": "empresa",
            "razon_social": "Eléctrica Norte SpA",
            "rut_empresa": "76.123.456-0",
            "nombre_contacto": "María González",
            "cargo": "Jefa de compras",
            "correo": "maria@electricanorte.cl",
            "telefono": "+56911112222",
            "password": "Clave1234",
            "acepta_politica": True,
        }
        base.update(cambios)
        return base

    def registrar(self, **cambios):
        return self.api.post("/api/usuarios/registro/", self.datos(**cambios), format="json")

    def test_registro_de_empresa(self):
        r = self.registrar()
        self.assertEqual(r.status_code, 201)
        usuario = Usuario.objects.get(email="maria@electricanorte.cl")
        self.assertFalse(usuario.correo_verificado)
        self.assertEqual(usuario.rol, RolUsuario.CLIENTE)
        self.assertEqual(usuario.empresa.rut, "76123456-0")

    def test_registro_de_persona_natural_sin_razon_social(self):
        r = self.registrar(
            tipo_cliente="persona",
            razon_social="",
            rut_empresa="15.111.222-6",
            nombre_contacto="Pedro Soto",
            correo="pedro@correo.cl",
        )
        self.assertEqual(r.status_code, 201)
        usuario = Usuario.objects.get(email="pedro@correo.cl")
        self.assertEqual(usuario.empresa.razon_social, "Pedro Soto")
        self.assertEqual(usuario.empresa.rut, "15111222-6")

    def test_empresa_exige_razon_social(self):
        self.assertEqual(self.registrar(razon_social="").status_code, 400)

    def test_rut_con_digito_verificador_incorrecto(self):
        self.assertEqual(self.registrar(rut_empresa="76.123.456-5").status_code, 400)

    def test_rut_duplicado(self):
        self.registrar()
        r = self.registrar(correo="otra@electricanorte.cl")
        self.assertEqual(r.status_code, 400)

    def test_correo_duplicado(self):
        self.registrar()
        r = self.registrar(rut_empresa="77.888.999-4")
        self.assertEqual(r.status_code, 400)

    def test_clave_sin_mayuscula(self):
        self.assertEqual(self.registrar(password="clave1234").status_code, 400)

    def test_exige_aceptar_la_politica(self):
        self.assertEqual(self.registrar(acepta_politica=False).status_code, 400)


class VerificacionCorreoTests(TestCase):
    def setUp(self):
        self.api = APIClient()
        self.usuario = Usuario.objects.create_user(
            username="ana@empresa.cl", email="ana@empresa.cl", password="Clave1234"
        )

    def verificar(self, token):
        return self.api.post("/api/usuarios/verificar-correo/", {"token": token}, format="json")

    def test_enlace_valido_activa_la_cuenta(self):
        r = self.verificar(generar_token(self.usuario))
        self.assertEqual(r.status_code, 200)
        self.usuario.refresh_from_db()
        self.assertTrue(self.usuario.correo_verificado)

    def test_enlace_alterado(self):
        self.assertEqual(self.verificar("no-es-un-token").status_code, 400)

    def test_enlace_vencido(self):
        token = generar_token(self.usuario)
        with patch("usuarios.verificacion.VIGENCIA_SEGUNDOS", -1):
            r = self.verificar(token)
        self.assertEqual(r.status_code, 400)
        self.usuario.refresh_from_db()
        self.assertFalse(self.usuario.correo_verificado)

    def test_reenviar_exige_sesion(self):
        r = self.api.post("/api/usuarios/reenviar-verificacion/")
        self.assertIn(r.status_code, (401, 403))

    def test_reenviar_con_sesion(self):
        self.api.force_login(self.usuario)
        r = self.api.post("/api/usuarios/reenviar-verificacion/")
        self.assertEqual(r.status_code, 200)