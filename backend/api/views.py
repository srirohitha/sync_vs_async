import json
import logging
import os
import time
import uuid
from typing import Any, Optional

from celery.result import AsyncResult
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt

from pow_demo.celery import app as celery_app

from .pow import compute_seed_result, normalize_algorithm, normalize_difficulty
from .tasks import process_seed_task

LOGGER = logging.getLogger("pow_demo.api")


def _cors_headers(response: HttpResponse) -> HttpResponse:
    response["Access-Control-Allow-Origin"] = "*"
    response["Access-Control-Allow-Methods"] = "GET, HEAD, POST, OPTIONS"
    response["Access-Control-Allow-Headers"] = "Content-Type"
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
    if not request.body:
        return {}
    try:
        return json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return None


@csrf_exempt
def sync_view(request: HttpRequest) -> HttpResponse:
    if request.method == "OPTIONS":
        return _handle_options()
    if request.method != "POST":
        return _cors_json({"error": "Method not allowed"}, status=405)

    payload = _parse_json(request)
    if payload is None:
        return _cors_json({"error": "Invalid JSON body"}, status=400)

    seeds = payload.get("seeds") or []
    difficulty = normalize_difficulty(payload.get("difficulty"))
    algorithm = normalize_algorithm(payload.get("algorithm"))

    if not isinstance(seeds, list) or not all(isinstance(seed, str) for seed in seeds):
        return _cors_json({"error": "Seeds must be a list of strings."}, status=400)

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
    """
    if request.method == "OPTIONS":
        return _handle_options()
    if request.method != "POST":
        return _cors_json({"error": "Method not allowed"}, status=405)

    payload = _parse_json(request)
    if payload is None:
        return _cors_json({"error": "Invalid JSON body"}, status=400)

    seeds = payload.get("seeds") or []
    difficulty = normalize_difficulty(payload.get("difficulty"))
    algorithm = normalize_algorithm(payload.get("algorithm"))
    if not isinstance(seeds, list) or not all(isinstance(seed, str) for seed in seeds):
        return _cors_json({"error": "Seeds must be a list of strings."}, status=400)

    acks = []
    
    for index, seed in enumerate(seeds, start=1):
        request_id = str(uuid.uuid4())
        enqueued_at_ms = int(time.time() * 1000)
        ack_start = time.perf_counter()
        process_seed_task.apply_async(
            args=(seed, difficulty, algorithm, enqueued_at_ms),
            task_id=request_id,
            queue="pow_demo",
            routing_key="pow_demo",
        )
        ack_time_ms = (time.perf_counter() - ack_start) * 1000
        
        # Create ACK entry
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

    payload = _parse_json(request)
    if payload is None:
        return _cors_json({"error": "Invalid JSON body"}, status=400)

    request_ids = payload.get("requestIds") or []
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
