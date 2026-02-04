import json
import logging
import time
import uuid
from typing import Any, Optional
from urllib.parse import urlparse

from celery.result import AsyncResult
from django.conf import settings
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt

from pow_demo.celery import app as celery_app

from .pow import compute_seed_result, normalize_algorithm, normalize_difficulty
from .rate_limit import check_rate_limit, get_queue_length
from .tasks import process_seed_task

LOGGER = logging.getLogger("pow_demo.api")

MAX_SEEDS = getattr(settings, "MAX_SEEDS_PER_REQUEST", 500)
MAX_SEED_LEN = getattr(settings, "MAX_SEED_LENGTH", 2048)
MAX_BODY_BYTES = getattr(settings, "MAX_REQUEST_BODY_BYTES", 1024 * 1024)
MAX_DIFFICULTY = getattr(settings, "MAX_DIFFICULTY", 100)
MAX_STATUS_IDS = getattr(settings, "MAX_STATUS_REQUEST_IDS", 500)
API_KEY = getattr(settings, "API_KEY", "").strip()
CALLBACK_URL_MAX_LEN = getattr(settings, "CALLBACK_URL_MAX_LENGTH", 2048)
QUEUE_BACKPRESSURE = getattr(settings, "QUEUE_BACKPRESSURE_LENGTH", 10000)


def _cors_headers(response: HttpResponse) -> HttpResponse:
    response["Access-Control-Allow-Origin"] = "*"
    response["Access-Control-Allow-Methods"] = "GET, HEAD, POST, OPTIONS"
    response["Access-Control-Allow-Headers"] = "Content-Type, X-API-Key"
    return response


def _cors_json(payload: dict[str, Any], status: int = 200) -> JsonResponse:
    response = JsonResponse(payload, status=status)
    return _cors_headers(response)


def _handle_options() -> HttpResponse:
    response = HttpResponse(status=204)
    return _cors_headers(response)


@csrf_exempt
def health_view(request: HttpRequest) -> HttpResponse:
    if request.method == "OPTIONS":
        return _handle_options()
    if request.method not in {"GET", "HEAD"}:
        return _cors_json({"error": "Method not allowed"}, status=405)
    payload = {
        "status": "ok",
        "service": "pow-demo",
        "timestamp": int(time.time() * 1000),
    }
    return _cors_json(payload)


def _parse_json(request: HttpRequest) -> Optional[dict[str, Any]]:
    body = request.body
    if not body:
        return {}
    if len(body) > MAX_BODY_BYTES:
        return None
    try:
        return json.loads(body.decode("utf-8"))
    except json.JSONDecodeError:
        return None


def _get_rate_limit_id(request: HttpRequest) -> str:
    if API_KEY:
        key = (request.headers.get("X-API-Key") or request.META.get("HTTP_X_API_KEY") or "").strip()
        if key:
            return f"key:{key}"
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    ip = (xff.split(",")[0].strip() if xff else None) or request.META.get("REMOTE_ADDR", "unknown")
    return f"ip:{ip}"


def _require_api_key(request: HttpRequest) -> Optional[JsonResponse]:
    if not API_KEY:
        return None
    key = (request.headers.get("X-API-Key") or request.META.get("HTTP_X_API_KEY") or "").strip()
    if key != API_KEY:
        return _cors_json({"error": "Invalid or missing API key"}, status=401)
    return None


def _validate_callback_url(url: Any) -> Optional[str]:
    if url is None:
        return None
    if not isinstance(url, str) or not url.strip():
        return None
    url = url.strip()
    if len(url) > CALLBACK_URL_MAX_LEN:
        return None
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        return None
    return url


@csrf_exempt
def sync_view(request: HttpRequest) -> HttpResponse:
    if request.method == "OPTIONS":
        return _handle_options()
    if request.method != "POST":
        return _cors_json({"error": "Method not allowed"}, status=405)

    err = _require_api_key(request)
    if err is not None:
        return err

    payload = _parse_json(request)
    if payload is None:
        return _cors_json({"error": "Invalid JSON body or body too large"}, status=400)

    seeds = payload.get("seeds") or []
    difficulty = normalize_difficulty(payload.get("difficulty"))
    algorithm = normalize_algorithm(payload.get("algorithm"))

    if not isinstance(seeds, list) or not all(isinstance(seed, str) for seed in seeds):
        return _cors_json({"error": "Seeds must be a list of strings."}, status=400)
    if len(seeds) > MAX_SEEDS:
        return _cors_json(
            {"error": f"At most {MAX_SEEDS} seeds per request."},
            status=400,
        )
    if any(len(seed) > MAX_SEED_LEN for seed in seeds):
        return _cors_json(
            {"error": f"Each seed must be at most {MAX_SEED_LEN} characters."},
            status=400,
        )
    if difficulty > MAX_DIFFICULTY:
        return _cors_json(
            {"error": f"Difficulty must be at most {MAX_DIFFICULTY}."},
            status=400,
        )

    limit = getattr(settings, "RATE_LIMIT_SYNC_REQUESTS", 30)
    window = getattr(settings, "RATE_LIMIT_SYNC_WINDOW_SECONDS", 60)
    rid = _get_rate_limit_id(request)
    allowed, remaining = check_rate_limit(rid, limit, window, "sync")
    if not allowed:
        r = _cors_json({"error": "Rate limit exceeded. Try again later."}, status=429)
        r["Retry-After"] = str(window)
        return r

    # Process all seeds sequentially but include timing for each
    results = []
    
    for index, seed in enumerate(seeds, start=1):
        # Add timing metadata to match async task timing
        enqueued_at_ms = int(time.time() * 1000)
        started_at_ms = int(time.time() * 1000)
        wall_start = time.perf_counter()

        result = compute_seed_result(
            seed=seed,
            difficulty=difficulty,
            algorithm=algorithm,
            cycle=index,
        )

        wall_ms = (time.perf_counter() - wall_start) * 1000
        completed_at_ms = int(time.time() * 1000)

        # Enhance result with timing metadata matching async task
        enhanced_result = {
            **result,
            "processingTimeMs": round(wall_ms, 2),
            "wallTimeMs": round(wall_ms, 2),
            "queueTimeMs": None,  # No queue time for sync
            "totalTimeMs": round(wall_ms, 2),
            "enqueuedAtMs": enqueued_at_ms,
            "startedAtMs": started_at_ms,
            "completedAtMs": completed_at_ms,
        }
        results.append(enhanced_result)

    return _cors_json({"results": results})



@csrf_exempt
def async_view(request: HttpRequest) -> HttpResponse:
    """
    Async endpoint - enqueues Celery tasks and returns ACKs immediately.
    Optional callback_url: when set, result is POSTed there (with retries) on completion.
    """
    if request.method == "OPTIONS":
        return _handle_options()
    if request.method != "POST":
        return _cors_json({"error": "Method not allowed"}, status=405)

    err = _require_api_key(request)
    if err is not None:
        return err

    payload = _parse_json(request)
    if payload is None:
        return _cors_json({"error": "Invalid JSON body or body too large"}, status=400)

    seeds = payload.get("seeds") or []
    difficulty = normalize_difficulty(payload.get("difficulty"))
    algorithm = normalize_algorithm(payload.get("algorithm"))
    if not isinstance(seeds, list) or not all(isinstance(seed, str) for seed in seeds):
        return _cors_json({"error": "Seeds must be a list of strings."}, status=400)
    if len(seeds) > MAX_SEEDS:
        return _cors_json(
            {"error": f"At most {MAX_SEEDS} seeds per request."},
            status=400,
        )
    if any(len(seed) > MAX_SEED_LEN for seed in seeds):
        return _cors_json(
            {"error": f"Each seed must be at most {MAX_SEED_LEN} characters."},
            status=400,
        )
    if difficulty > MAX_DIFFICULTY:
        return _cors_json(
            {"error": f"Difficulty must be at most {MAX_DIFFICULTY}."},
            status=400,
        )

    callback_url = _validate_callback_url(payload.get("callbackUrl") or payload.get("callback_url"))
    if payload.get("callbackUrl") is not None or payload.get("callback_url") is not None:
        if callback_url is None:
            return _cors_json(
                {"error": "callbackUrl must be a valid http(s) URL and within length limit."},
                status=400,
            )

    limit = getattr(settings, "RATE_LIMIT_ASYNC_REQUESTS", 60)
    window = getattr(settings, "RATE_LIMIT_ASYNC_WINDOW_SECONDS", 60)
    rid = _get_rate_limit_id(request)
    allowed, remaining = check_rate_limit(rid, limit, window, "async")
    if not allowed:
        r = _cors_json({"error": "Rate limit exceeded. Try again later."}, status=429)
        r["Retry-After"] = str(window)
        return r

    qlen = get_queue_length()
    if qlen is not None and qlen >= QUEUE_BACKPRESSURE:
        r = _cors_json(
            {"error": "Server busy. Try again later."},
            status=503,
        )
        r["Retry-After"] = "60"
        return r

    acks = []
    for index, seed in enumerate(seeds, start=1):
        request_id = str(uuid.uuid4())
        enqueued_at_ms = int(time.time() * 1000)
        ack_start = time.perf_counter()
        process_seed_task.apply_async(
            args=(seed, difficulty, algorithm, enqueued_at_ms, callback_url),
            task_id=request_id,
            queue="pow_demo",
            routing_key="pow_demo",
        )
        ack_time_ms = (time.perf_counter() - ack_start) * 1000
        acks.append({
            "cycle": index,
            "seed": seed,
            "requestId": request_id,
            "ackTimeMs": round(ack_time_ms, 2),
        })

    LOGGER.info(
        "ASYNC ENQUEUED: count=%d difficulty=%d algorithm=%s queue=pow_demo",
        len(acks),
        difficulty,
        algorithm,
    )
    return _cors_json({"acks": acks})


@csrf_exempt
def async_status_view(request: HttpRequest) -> HttpResponse:
    """Status endpoint - returns Celery task results."""
    if request.method == "OPTIONS":
        return _handle_options()
    if request.method != "POST":
        return _cors_json({"error": "Method not allowed"}, status=405)

    err = _require_api_key(request)
    if err is not None:
        return err

    payload = _parse_json(request)
    if payload is None:
        return _cors_json({"error": "Invalid JSON body or body too large"}, status=400)

    request_ids = payload.get("requestIds") or []
    if not isinstance(request_ids, list) or not all(isinstance(i, str) for i in request_ids):
        return _cors_json({"error": "requestIds must be a list of strings."}, status=400)
    if len(request_ids) > MAX_STATUS_IDS:
        return _cors_json(
            {"error": f"At most {MAX_STATUS_IDS} requestIds per request."},
            status=400,
        )

    limit = getattr(settings, "RATE_LIMIT_STATUS_REQUESTS", 120)
    window = getattr(settings, "RATE_LIMIT_STATUS_WINDOW_SECONDS", 60)
    rid = _get_rate_limit_id(request)
    allowed, remaining = check_rate_limit(rid, limit, window, "status")
    if not allowed:
        r = _cors_json({"error": "Rate limit exceeded. Try again later."}, status=429)
        r["Retry-After"] = str(window)
        return r

    LOGGER.info("ASYNC STATUS: count=%d", len(request_ids))
    
    results: list[dict[str, Any]] = []
    for request_id in request_ids:
        task_result = AsyncResult(request_id, app=celery_app)
        state = task_result.state
        status = "queued"
        payload = None
        if state == "STARTED":
            status = "running"
        elif state == "RETRY":
            status = "retrying"
        elif state == "FAILURE":
            status = "failed"
        elif state == "SUCCESS":
            status = "done"
            if isinstance(task_result.result, dict):
                payload = task_result.result
                status = payload.get("status", status)

        results.append({
            "requestId": request_id,
            "status": status,
            "attempts": payload.get("attempts", 1) if payload else 1,
            "callbackTimeMs": payload.get("callbackTimeMs") if payload else None,
            "hash": payload.get("hash") if payload else None,
            "seed": payload.get("seed") if payload else None,
            "processingTimeMs": payload.get("processingTimeMs") if payload else None,
            "wallTimeMs": payload.get("wallTimeMs") if payload else None,
            "queueTimeMs": payload.get("queueTimeMs") if payload else None,
            "totalTimeMs": payload.get("totalTimeMs") if payload else None,
            "enqueuedAtMs": payload.get("enqueuedAtMs") if payload else None,
            "startedAtMs": payload.get("startedAtMs") if payload else None,
            "completedAtMs": payload.get("completedAtMs") if payload else None,
        })

    return _cors_json({"results": results})
