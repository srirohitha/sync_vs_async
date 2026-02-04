# tasks.py — REPLACE process_seed_task WITH THIS

import time
from celery import shared_task
from .pow import compute_seed_result


@shared_task(bind=True, name="api.process_seed")
def process_seed_task(
    self,
    seed: str,
    difficulty: int,
    algorithm: str,
    enqueued_at_ms: int | None = None,
) -> dict:
    """
    CRITICAL:
    - Uses SAME function as sync_view
    - Same CPU work
    - Same timing semantics
    - Only difference = async scheduling
    """
    started_at_ms = int(time.time() * 1000)
    wall_start = time.perf_counter()

    result = compute_seed_result(
        seed=seed,
        difficulty=difficulty,
        algorithm=algorithm,
        cycle=1,  # cycle is UI-only
    )

    wall_ms = (time.perf_counter() - wall_start) * 1000
    completed_at_ms = int(time.time() * 1000)

    queue_time_ms = (
        max(0, started_at_ms - enqueued_at_ms) if enqueued_at_ms is not None else None
    )
    total_time_ms = (
        max(0, completed_at_ms - enqueued_at_ms) if enqueued_at_ms is not None else None
    )

    return {
        **result,
        "processingTimeMs": round(wall_ms, 2),
        "wallTimeMs": round(wall_ms, 2),
        "queueTimeMs": round(queue_time_ms, 2) if queue_time_ms is not None else None,
        "totalTimeMs": round(total_time_ms, 2) if total_time_ms is not None else None,
        "enqueuedAtMs": enqueued_at_ms,
        "startedAtMs": started_at_ms,
        "completedAtMs": completed_at_ms,
    }
