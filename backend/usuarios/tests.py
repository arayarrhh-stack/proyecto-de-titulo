from django.test import TestCase
from rest_framework.test import APIClient

from .models import RolUsuario, Usuario


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