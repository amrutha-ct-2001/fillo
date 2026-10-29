"""
Django settings for Fillo.
"""

from datetime import timedelta
from pathlib import Path
import os

from dotenv import load_dotenv
import dj_database_url

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

# Secure by default: DEBUG must be switched on explicitly (see .env.example).
DEBUG = os.getenv('DEBUG', 'False').lower() in ('1', 'true', 'yes')

_DEV_SECRET_KEY = 'unsafe-dev-key'
SECRET_KEY = os.getenv('SECRET_KEY', '').strip()
if not SECRET_KEY:
    if not DEBUG:
        raise RuntimeError('SECRET_KEY must be set when DEBUG is off')
    SECRET_KEY = _DEV_SECRET_KEY
ALLOWED_HOSTS = [
    h.strip() for h in os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',') if h.strip()
]

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'accounts',
    'vehicles',
    'transactions',
    'points',
    'stations',
    'rewards',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

DATABASE_URL = os.getenv('DATABASE_URL', '').strip()
if DATABASE_URL:
    DATABASES = {
        'default': dj_database_url.parse(DATABASE_URL, conn_max_age=600),
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

AUTH_USER_MODEL = 'accounts.User'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [BASE_DIR / 'static'] if (BASE_DIR / 'static').exists() else []

MEDIA_URL = '/media/'
_media = os.getenv('MEDIA_ROOT', '').strip()
MEDIA_ROOT = Path(_media) if _media else BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 25,
    'DEFAULT_THROTTLE_RATES': {
        # PIN login is also limited per username (see accounts.throttles).
        'pin_login': os.getenv('THROTTLE_PIN_LOGIN', '10/hour'),
        'pin_login_ip': os.getenv('THROTTLE_PIN_LOGIN_IP', '30/hour'),
        'otp_request': os.getenv('THROTTLE_OTP_REQUEST', '10/hour'),
        'otp_request_phone': os.getenv('THROTTLE_OTP_REQUEST_PHONE', '5/hour'),
        'otp_verify': os.getenv('THROTTLE_OTP_VERIFY', '10/hour'),
    },
}

# Throttle counters must be shared by all gunicorn workers, so locmem is not enough.
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.filebased.FileBasedCache',
        'LOCATION': os.getenv('CACHE_DIR', '').strip() or str(BASE_DIR / '.cache'),
    }
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=7),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30),
    'ROTATE_REFRESH_TOKENS': False,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# The mobile app is not a browser, so CORS only matters for web clients.
# Default to no cross-origin access unless configured (or DEBUG).
CORS_ALLOW_ALL_ORIGINS = os.getenv(
    'CORS_ALLOWED_ORIGINS', '*' if DEBUG else ''
).strip() == '*'
if not CORS_ALLOW_ALL_ORIGINS:
    CORS_ALLOWED_ORIGINS = [
        o.strip() for o in os.getenv('CORS_ALLOWED_ORIGINS', '').split(',') if o.strip()
    ]

# 'static' = one fixed code (development only); 'sms' = random codes sent by text.
OTP_MODE = os.getenv('OTP_MODE', 'static')
STATIC_OTP = os.getenv('STATIC_OTP', '123456')
if OTP_MODE not in ('static', 'sms'):
    raise RuntimeError("OTP_MODE must be 'static' or 'sms'")

# Used when OTP_MODE=sms. 'console' prints the code in the server log (dev only).
SMS_BACKEND = os.getenv('SMS_BACKEND', 'console')
MSG91_AUTH_KEY = os.getenv('MSG91_AUTH_KEY', '')
MSG91_TEMPLATE_ID = os.getenv('MSG91_TEMPLATE_ID', '')
OTP_TTL_SECONDS = int(os.getenv('OTP_TTL_SECONDS', '300'))
OTP_RESEND_SECONDS = int(os.getenv('OTP_RESEND_SECONDS', '30'))
OTP_MAX_ATTEMPTS = int(os.getenv('OTP_MAX_ATTEMPTS', '5'))

# A static OTP lets anyone log in as any customer by phone number. It is only
# acceptable for local development.
if not DEBUG:
    if OTP_MODE == 'static' and os.getenv('ALLOW_STATIC_OTP', '').lower() not in ('1', 'true', 'yes'):
        raise RuntimeError(
            'OTP_MODE=static is insecure outside DEBUG. Configure SMS OTP, or set '
            'ALLOW_STATIC_OTP=True to knowingly accept the risk (e.g. a closed pilot).'
        )
    if STATIC_OTP == '123456' and OTP_MODE == 'static':
        raise RuntimeError('Change STATIC_OTP from the default 123456')
    if OTP_MODE == 'sms':
        if SMS_BACKEND == 'console':
            raise RuntimeError('SMS_BACKEND=console never delivers codes; use a real provider')
        if SMS_BACKEND == 'msg91' and not (MSG91_AUTH_KEY and MSG91_TEMPLATE_ID):
            raise RuntimeError('SMS_BACKEND=msg91 needs MSG91_AUTH_KEY and MSG91_TEMPLATE_ID')

    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    if os.getenv('SECURE_SSL_REDIRECT', 'True').lower() in ('1', 'true', 'yes'):
        SECURE_SSL_REDIRECT = True
