"""
Rate limiting and backpressure using Redis.
Rate limit keys are per-identifier (IP or API key); backpressure uses Celery broker queue length.
"""
import logging
from typing import Optional

from django.conf import settings

LOGGER = logging.getLogger("pow_demo.api")

_redis_client = None


def _get_redis():
    global _redis_client
    if _redis_client is not None:
        return _redis_client
    url = getattr(settings, "RATE_LIMIT_REDIS_URL", None) or getattr(
        settings, "CELERY_BROKER_URL", ""
    )
    if not url or not url.startswith("redis://"):
        return None
    try:
        import redis
        _redis_client = redis.Redis.from_url(url, decode_responses=True)
        _redis_client.ping()
        return _redis_client
    except Exception as e:
        LOGGER.warning("Rate limit Redis unavailable: %s", e)
        return None


def check_rate_limit(
    identifier: str,
    limit: int,
    window_seconds: int,
    key_prefix: str = "rl",
) -> tuple[bool, Optional[int]]:
    """
    Returns (allowed, remaining). remaining is None if Redis unavailable (allow request).
    """
    r = _get_redis()
    if r is None:
        return True, None
    key = f"{key_prefix}:{identifier}"
    try:
        pipe = r.pipeline()
        pipe.incr(key)
        pipe.ttl(key)
        n, ttl = pipe.execute()
        if n == 1:
            r.expire(key, window_seconds)
            ttl = window_seconds
        remaining = max(0, limit - n)
        allowed = n <= limit
        return allowed, remaining
    except Exception as e:
        LOGGER.warning("Rate limit check failed: %s", e)
        return True, None


def get_queue_length() -> Optional[int]:
    """Return current Celery queue length for pow_demo queue, or None if unavailable."""
    url = getattr(settings, "RATE_LIMIT_REDIS_URL", None) or getattr(
        settings, "CELERY_BROKER_URL", ""
    )
    if not url or not url.startswith("redis://"):
        return None
    try:
        import redis
        client = redis.Redis.from_url(url, decode_responses=False)
        key = getattr(settings, "QUEUE_LENGTH_REDIS_KEY", "pow_demo")
        length = client.llen(key)
        return length
    except Exception as e:
        LOGGER.warning("Queue length check failed: %s", e)
        return None
