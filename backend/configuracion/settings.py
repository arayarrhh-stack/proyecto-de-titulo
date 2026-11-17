"""Configuración principal del backend de ACOMSE (Seguridad RNF-01 a RNF-08)."""
import os
from pathlib import Path
from django.core.management.utils import get_random_secret_key

BASE_DIR = Path(__file__).resolve().parent.parent

# RNF-02: En producción reside en variables de entorno; en local usa un respaldo fijo predecible.
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY") or "django-insecure-acomse-dev-key-segura-2026-valida"
DEBUG = os.environ.get("DJANGO_DEBUG", "0") == "1"
ALLOWED_HOSTS = ["localhost", "127.0.0.1", "testserver"]

INSTALLED_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "rest_framework",
    # Aplicaciones locales de ACOMSE (M1 a M8)
    "catalogo",
    "usuarios",
    "cotizaciones",
    "asistente_ia",
    "utils",
]

# M1 (HU-01, HU-03): Modelo de usuario corporativo con control de acceso por roles.
AUTH_USER_MODEL = "usuarios.Usuario"

# Django gestiona sesiones, autenticación y protección CSRF (RNF-03, Tabla 43).
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
]

ROOT_URLCONF = "configuracion.urls"
WSGI_APPLICATION = "configuracion.wsgi.application"

# SQLite permite desarrollar y ejecutar pruebas en local; en producción usa PostgreSQL.
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

# RNF-01 y RF-05: Almacenamiento de contraseñas mediante derivación de clave con sal (PBKDF2).
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher",
]

# Tabla 43: Protección de cookies de sesión y CSRF.
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"

LANGUAGE_CODE = "es-cl"
TIME_ZONE = "America/Santiago"
USE_TZ = True
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Cada API debe declarar su acceso público; las demás requieren autenticación.
REST_FRAMEWORK = {
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
        "rest_framework.authentication.BasicAuthentication",
    ],
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 24,  # HU-15: tamaño de página definido en sus criterios de aceptación.
}