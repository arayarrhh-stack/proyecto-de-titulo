"""Banco automatizado de casos de prueba del asistente controlado (HU-32, RF-48, Anexo G.2)."""
from django.test import TestCase

from .motor_deterministico import evaluar_antecedentes


class BancoCasosAsistenteTests(TestCase):
    """Verifica las reglas RG-01 a RG-13 contra los escenarios de la Tabla 56."""

    def test_caso_seguro_tablero_380v_clase_00(self):
        """Tabla 56 (Seguro): tablero de 380 V c.a. en interior -> Clase 00 (RG-02)."""
        res = evaluar_antecedentes({
            "tarea": "Mantenimiento de tablero",
            "entorno": "interior",
            "tension_maxima": 380,
            "tipo_corriente": "ca",
            "riesgo_arco": False,
        })
        self.assertTrue(res["es_valido"])
        self.assertEqual(res["clase_recomendada"], "Clase 00")
        self.assertEqual(res["regla_aplicada"], "RG-02")

    def test_caso_seguro_red_media_tension_13200v_clase_2(self):
        """Tabla 56 (Seguro): red de distribución de 13,2 kV c.a. -> Clase 2 (RG-05)."""
        res = evaluar_antecedentes({
            "tarea": "Trabajo en red de distribución",
            "entorno": "interior",
            "tension_maxima": 13200,
            "tipo_corriente": "ca",
            "riesgo_arco": False,
        })
        self.assertTrue(res["es_valido"])
        self.assertEqual(res["clase_recomendada"], "Clase 2")
        self.assertEqual(res["regla_aplicada"], "RG-05")

    def test_caso_ambiguo_sin_tension_se_abstiene(self):
        """Tabla 56 (Ambiguo): sin tensión declarada -> Abstención 100% (RG-01)."""
        res = evaluar_antecedentes({"tarea": "Trabajar con electricidad", "tension_maxima": None})
        self.assertFalse(res["es_valido"])
        self.assertEqual(res["accion"], "abstener")
        self.assertEqual(res["regla_aplicada"], "RG-01")

    def test_caso_contradictorio_baja_tension_con_20kv(self):
        """Tabla 56 (Ambiguo): declara baja tensión pero indica 20 kV -> Abstención (RG-11)."""
        res = evaluar_antecedentes({
            "tarea": "Tarea de baja tensión",
            "tension_maxima": 20000,
            "tipo_corriente": "ca",
        })
        self.assertFalse(res["es_valido"])
        self.assertEqual(res["regla_aplicada"], "RG-11")
        self.assertTrue(res["derivar"])

    def test_caso_umbral_66kv_deriva_a_asesora(self):
        """Tabla 56 (Umbral): instalación de 66 kV -> Derivación obligatoria (RG-08)."""
        res = evaluar_antecedentes({"tension_maxima": 66000, "tipo_corriente": "ca"})
        self.assertFalse(res["es_valido"])
        self.assertTrue(res["derivar"])
        self.assertEqual(res["regla_aplicada"], "RG-08")

    def test_caso_umbral_riesgo_arco_electrico_deriva(self):
        """Tabla 56 (Umbral): riesgo de arco eléctrico -> Derivación NFPA 70E (RG-10)."""
        res = evaluar_antecedentes({
            "tarea": "Maniobra en celda",
            "tension_maxima": 400,
            "riesgo_arco": True,
        })
        self.assertFalse(res["es_valido"])
        self.assertTrue(res["derivar"])
        self.assertEqual(res["regla_aplicada"], "RG-10")

    def test_caso_corriente_continua_deriva(self):
        """Tabla 55 (RG-09): corriente continua declarada -> Derivación obligatoria."""
        res = evaluar_antecedentes({"tension_maxima": 500, "tipo_corriente": "cc"})
        self.assertFalse(res["es_valido"])
        self.assertTrue(res["derivar"])
        self.assertEqual(res["regla_aplicada"], "RG-09")

    def test_caso_fuera_de_dominio_declina(self):
        """Tabla 56 (Fuera de dominio): consulta sin riesgo eléctrico -> Declinar (RG-12)."""
        res = evaluar_antecedentes({"fuera_de_dominio": True})
        self.assertFalse(res["es_valido"])
        self.assertEqual(res["accion"], "declinar")
        self.assertEqual(res["regla_aplicada"], "RG-12")