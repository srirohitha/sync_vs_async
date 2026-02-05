# Consuma

A small PoW (proof-of-work) demo with a Django backend, Celery workers, and a React dashboard. You can run hashes synchronously or enqueue them and poll (or get results via webhook).

---

## Running locally

You need **Redis** for the broker and rate limiting. The app expects Redis on port **6380** by default (to avoid clashing with a local Redis on 6379). If you use a different port or URL, set `CELERY_BROKER_URL` and `CELERY_RESULT_BACKEND` (and `RATE_LIMIT_REDIS_URL` if you want rate limits).

1. **Start Redis** (e.g. `redis-server --port 6380` or Docker).

2. **Backend** (from `backend/`):
   - Create a venv, install deps: `python -m venv .venv`, `source .venv/bin/activate`, `pip install -r requirements.txt`.
   - Run migrations if you add any: `python manage.py migrate`.
   - Start Django: `./run_server.sh` (or `python manage.py runserver`). API is at `http://localhost:8000/api/`.
   - In another terminal, start the Celery worker: `./run_celery.sh` (or `celery -A pow_demo worker -l info`).

3. **Frontend** (from `Frontend/`):
   - `npm i` then `npm run dev`. It talks to `http://localhost:8000` unless you set `VITE_API_BASE_URL`.

4. Open the dashboard, run sync or async jobs; for async you can poll status or use a callback URL.

---

## Generating load

There’s no separate load-generator binary. You can create load in a few ways:

- **From the UI**: Increase “Number of Input Values” (cycles) and difficulty, then run async requests. Each request can send many seeds (up to the server limit, e.g. 500). Fire a few async requests in a row or from multiple tabs to fill the queue.
- **With curl**: Loop on the sync or async endpoint. Example (sync, 3 seeds, difficulty 2):
  ```bash
  for i in $(seq 1 20); do
    curl -s -X POST http://localhost:8000/api/sync \
      -H "Content-Type: application/json" \
      -d '{"seeds":["a","b","c"],"difficulty":2,"algorithm":"sha256"}' \
      -o /dev/null -w "%{http_code}\n"
  done
  ```
  For async, POST to `/api/async` with the same body (optional `callbackUrl`), then poll `/api/async/status` with the returned `requestId`s.

Rate limits and queue backpressure apply: if you hit 429 or 503, back off or increase limits in settings for local testing.

---

## Design decisions and tradeoffs

- **Sync vs async**: Sync does the same hash work in the request; async enqueues one Celery task per seed and returns immediately. Sync is simpler and good for small batches; async avoids blocking the server and scales with workers, at the cost of polling or implementing callbacks.

- **Celery + Redis**: Redis is the broker and result backend, and is reused for rate limiting and queue-length checks. That keeps dependencies minimal. If Redis is down, the app still runs but rate limits and backpressure are skipped (fail open so the demo doesn’t hard-depend on Redis for basic use).

- **Rate limiting and backpressure**: Per-IP (or per API key if `API_KEY` is set) limits on sync, async, and status endpoints; plus a max queue length for async so we don’t accept unbounded work. Tuning is via env vars. Tradeoff: under heavy load some clients get 429/503 instead of a slow, overloaded server.

- **Callbacks**: Optional `callbackUrl` on async requests. A separate Celery task POSTs the result to that URL with retries and backoff. Same queue as PoW tasks, so heavy callback traffic can delay hashes; for production you’d often use a dedicated queue or worker.

- **PoW implementation**: Fixed iterations per difficulty level, multiple hash algorithms. Purely CPU-bound and used as a stand-in for “work”; no real crypto or mining guarantees.

- **Storage**: SQLite and no DB models for PoW results; results live in Celery’s result backend (Redis) and in callback payloads. Keeps the demo simple and stateless; you don’t get a durable history without adding your own store.

- **API key**: Optional. If `API_KEY` is set, clients must send it in `X-API-Key`. Useful for locking down a deployed instance without adding full auth.

- **CORS**: Allow-all for the demo so the frontend can call the API from another origin. For production you’d restrict origins and methods.
