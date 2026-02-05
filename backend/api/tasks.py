# api/tasks.py — PoW async task with retries and optional webhook callback delivery

import time
from typing import Any, Optional

from celery import shared_task
from django.conf import settings

from .pow import compute_seed_result


@shared_task(
    bind=True,
    name="api.process_seed",
    autoretry_for=(MemoryError, OSError, ConnectionError),
    retries=3,
    retry_backoff=True,
    retry_backoff_max=60,
    retry_jitter=True,
)
def process_seed_task(
    self,
    seed: str,
    difficulty: int,
    algorithm: str,
    enqueued_at_ms: Optional[int] = None,
    callback_url: Optional[str] = None,
) -> dict[str, Any]:
    """
    Same CPU work as sync path; only difference is async scheduling.
    On transient errors (memory, OS, connection) the task is retried with backoff.
    If callback_url is provided, result is also delivered via deliver_callback_task (with its own retries).
    """
    started_at_ms = int(time.time() * 1000)
    wall_start = time.perf_counter()

    result = compute_seed_result(
        seed=seed,
        difficulty=difficulty,
        algorithm=algorithm,
        cycle=1,
    )

    wall_ms = (time.perf_counter() - wall_start) * 1000
    completed_at_ms = int(time.time() * 1000)
    latency_ms = result.get("latencyMs")

    queue_time_ms = (
        max(0, started_at_ms - enqueued_at_ms) if enqueued_at_ms is not None else None
    )
    total_time_ms = (
        max(0, completed_at_ms - enqueued_at_ms) if enqueued_at_ms is not None else None
    )

    payload: dict[str, Any] = {
        **result,
        "attempts": self.request.retries + 1,
        # Use the same latency metric as sync (`latencyMs`) so per-request
        # timings match across sync/async. Fall back to wall_ms if needed.
        "processingTimeMs": latency_ms if latency_ms is not None else round(wall_ms, 2),
        "wallTimeMs": latency_ms if latency_ms is not None else round(wall_ms, 2),
        "queueTimeMs": round(queue_time_ms, 2) if queue_time_ms is not None else None,
        "totalTimeMs": round(total_time_ms, 2) if total_time_ms is not None else None,
        "enqueuedAtMs": enqueued_at_ms,
        "startedAtMs": started_at_ms,
        "completedAtMs": completed_at_ms,
        "requestId": self.request.id,
    }

    if callback_url:
        deliver_callback_task.apply_async(
            args=[callback_url, self.request.id, payload],
            queue="pow_demo",
            routing_key="pow_demo",
        )

    return payload


def _deliver_callback_max_retries() -> int:
    return getattr(settings, "CALLBACK_DELIVERY_MAX_RETRIES", 5)


@shared_task(
    bind=True,
    name="api.deliver_callback",
    autoretry_for=(Exception,),
    retries=10,
    retry_backoff=True,
    retry_backoff_max=600,
    retry_jitter=True,
)
def deliver_callback_task(
    self,
    callback_url: str,
    request_id: str,
    payload: dict[str, Any],
) -> None:
    """
    POST the result payload to callback_url. Retries with exponential backoff on failure
    (timeout, connection error, 5xx). Stops after CALLBACK_DELIVERY_MAX_RETRIES.
    """
    import requests
    from celery.exceptions import Reject

    max_retries = _deliver_callback_max_retries()
    if self.request.retries >= max_retries:
        raise Reject("Callback delivery failed after max retries", requeue=False)

    timeout = getattr(settings, "CALLBACK_DELIVERY_TIMEOUT_SECONDS", 10)
    body = {"requestId": request_id, "result": payload}

    try:
        resp = requests.post(
            callback_url,
            json=body,
            timeout=timeout,
            headers={"Content-Type": "application/json"},
        )
        resp.raise_for_status()
    except requests.RequestException:
        raise
