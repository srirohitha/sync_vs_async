import hashlib
import time
from typing import Any

ITERATIONS_PER_CYCLE = 50000
DEFAULT_ALGORITHM = "sha256"
HASH_ALGORITHMS: dict[str, Any] = {
    "sha256": hashlib.sha256,
    "sha512": hashlib.sha512,
    "sha3_256": hashlib.sha3_256,
    "sha3_512": hashlib.sha3_512,
    "blake2b": hashlib.blake2b,
}


def normalize_difficulty(value: Any) -> int:
    try:
        difficulty = int(value)
    except (TypeError, ValueError):
        difficulty = 1
    return max(1, difficulty)


def normalize_algorithm(value: Any) -> str:
    if not isinstance(value, str):
        return DEFAULT_ALGORITHM
    return value if value in HASH_ALGORITHMS else DEFAULT_ALGORITHM


def hash_seed(seed: str, difficulty: int, algorithm: str) -> tuple[str, int]:
    """Hash the seed using the specified algorithm for difficulty cycles."""
    data = seed.encode("utf-8")
    hash_fn = HASH_ALGORITHMS.get(algorithm, hashlib.sha256)
    total_iterations = difficulty * ITERATIONS_PER_CYCLE
    for _ in range(difficulty):
        for _ in range(ITERATIONS_PER_CYCLE):
            data = hash_fn(data).digest()
    return data.hex(), total_iterations


def compute_seed_result(
    seed: str,
    difficulty: int,
    algorithm: str,
    cycle: int,
) -> dict[str, Any]:
    start = time.perf_counter()
    status = "done"
    hash_value = None
    nonce = None
    try:
        hash_value, nonce = hash_seed(seed, difficulty, algorithm)
    except Exception:
        status = "failed"
    latency_ms = (time.perf_counter() - start) * 1000
    return {
        "cycle": cycle,
        "seed": seed,
        "status": status,
        "latencyMs": round(latency_ms, 2),
        "hash": hash_value,
        "nonce": nonce,
    }
