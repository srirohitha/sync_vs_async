import os
from pathlib import Path

from kombu import Exchange, Queue


BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = "django-insecure-change-me"

DEBUG = True

ALLOWED_HOSTS = ["*"]

INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.auth",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "api",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "pow_demo.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    }
]

WSGI_APPLICATION = "pow_demo.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

AUTH_PASSWORD_VALIDATORS: list[dict[str, str]] = []

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

APPEND_SLASH = False

CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6380/0")
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6380/0")
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TASK_TRACK_STARTED = True
CELERY_WORKER_CONCURRENCY = int(os.getenv("CELERY_WORKER_CONCURRENCY", "5"))
CELERY_WORKER_POOL = os.getenv("CELERY_WORKER_POOL", "threads")
CELERY_TASK_DEFAULT_QUEUE = os.getenv("CELERY_TASK_DEFAULT_QUEUE", "pow_demo")
CELERY_TASK_DEFAULT_EXCHANGE = os.getenv("CELERY_TASK_DEFAULT_EXCHANGE", "pow_demo")
CELERY_TASK_DEFAULT_ROUTING_KEY = os.getenv("CELERY_TASK_DEFAULT_ROUTING_KEY", "pow_demo")
CELERY_TASK_QUEUES = (
    Queue("pow_demo", Exchange("pow_demo", type="direct"), routing_key="pow_demo"),
)
CELERY_TASK_ROUTES = {
    "api.process_seed": {"queue": "pow_demo", "routing_key": "pow_demo"},
    "api.deliver_callback": {"queue": "pow_demo", "routing_key": "pow_demo"},
}
CELERY_RESULT_EXPIRES = 3600
# Late acks: task is redelivered if worker dies before ack (improves at-least-once delivery).
CELERY_TASK_ACKS_LATE = True
# Ordering: with a single worker, tasks run in queue order; with multiple workers, completion order is best-effort.
# Timing: results are available for CELERY_RESULT_EXPIRES seconds; poll within that window.

# --- Request and abuse prevention limits ---
MAX_SEEDS_PER_REQUEST = int(os.getenv("MAX_SEEDS_PER_REQUEST", "500"))
MAX_SEED_LENGTH = int(os.getenv("MAX_SEED_LENGTH", "2048"))
MAX_REQUEST_BODY_BYTES = int(os.getenv("MAX_REQUEST_BODY_BYTES", str(1024 * 1024)))  # 1MB
MAX_DIFFICULTY = int(os.getenv("MAX_DIFFICULTY", "100"))
MAX_STATUS_REQUEST_IDS = int(os.getenv("MAX_STATUS_REQUEST_IDS", "500"))

# --- Rate limiting backend (uses broker if Redis; else set RATE_LIMIT_REDIS_URL) ---
RATE_LIMIT_REDIS_URL = os.getenv("RATE_LIMIT_REDIS_URL", CELERY_BROKER_URL)

# --- Rate limiting (per-IP or per API key when API_KEY is set) ---
RATE_LIMIT_ASYNC_REQUESTS = int(os.getenv("RATE_LIMIT_ASYNC_REQUESTS", "60"))
RATE_LIMIT_ASYNC_WINDOW_SECONDS = int(os.getenv("RATE_LIMIT_ASYNC_WINDOW_SECONDS", "60"))
RATE_LIMIT_STATUS_REQUESTS = int(os.getenv("RATE_LIMIT_STATUS_REQUESTS", "120"))
RATE_LIMIT_STATUS_WINDOW_SECONDS = int(os.getenv("RATE_LIMIT_STATUS_WINDOW_SECONDS", "60"))
RATE_LIMIT_SYNC_REQUESTS = int(os.getenv("RATE_LIMIT_SYNC_REQUESTS", "30"))
RATE_LIMIT_SYNC_WINDOW_SECONDS = int(os.getenv("RATE_LIMIT_SYNC_WINDOW_SECONDS", "60"))

# --- Backpressure: reject new async work when queue length exceeds this ---
QUEUE_BACKPRESSURE_LENGTH = int(os.getenv("QUEUE_BACKPRESSURE_LENGTH", "10000"))
# Redis list key for queue length (Kombu uses queue name; override if using a prefix)
QUEUE_LENGTH_REDIS_KEY = os.getenv("QUEUE_LENGTH_REDIS_KEY", "pow_demo")

# --- Optional API key (if set, X-API-Key header must match) ---
API_KEY = os.getenv("API_KEY", "").strip()

# --- Webhook callback delivery ---
CALLBACK_DELIVERY_TIMEOUT_SECONDS = int(os.getenv("CALLBACK_DELIVERY_TIMEOUT_SECONDS", "10"))
CALLBACK_DELIVERY_MAX_RETRIES = int(os.getenv("CALLBACK_DELIVERY_MAX_RETRIES", "5"))
CALLBACK_URL_MAX_LENGTH = int(os.getenv("CALLBACK_URL_MAX_LENGTH", "2048"))

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "[{levelname}] {name}: {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        }
    },
    "loggers": {
        "pow_demo.api": {
            "handlers": ["console"],
            "level": "DEBUG",
            "propagate": False,
        },
        "django.server": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
    },
}
