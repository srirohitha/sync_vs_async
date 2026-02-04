export const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

type SyncResponse = {
  results: Array<{
    cycle: number;
    seed: string;
    status: string;
    latencyMs: number;
    hash: string | null;
    nonce: number | null;
    processingTimeMs: number;
    wallTimeMs: number;
    queueTimeMs: null;
    totalTimeMs: number;
    enqueuedAtMs: number;
    startedAtMs: number;
    completedAtMs: number;
  }>;
  totalMs: number;
};

type AsyncAckResponse = {
  acks: Array<{
    cycle: number;
    seed: string;
    requestId: string;
    ackTimeMs: number;
  }>;
  results?: Array<{
    requestId: string;
    status: string;
    attempts: number;
    callbackTimeMs: number | null;
    hash: string | null;
    seed?: string;
  }>;
};

export type AsyncStatusResult = {
  requestId: string;
  status: string;
  attempts: number;
  callbackTimeMs: number | null;
  hash: string | null;
  enqueuedAtMs?: number | null;
  startedAtMs?: number | null;
  completedAtMs?: number | null;
};

type AsyncStatusResponse = {
  results: AsyncStatusResult[];
};

type HealthResponse = {
  status: string;
  service?: string;
  timestamp?: number;
};

async function parseJson<T>(response: Response, path: string): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    throw new Error(`Invalid JSON response from ${API_BASE}${path}`);
  }
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Request failed");
  }

  return parseJson<T>(response, path);
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: {
      "Accept": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Request failed");
  }

  return parseJson<T>(response, path);
}

export async function runSync(seeds: string[], difficulty: number, algorithm: string) {
  return postJson<SyncResponse>("/api/sync", { seeds, difficulty, algorithm });
}

export async function runAsync(seeds: string[], difficulty: number, algorithm: string) {
  return postJson<AsyncAckResponse>("/api/async", { seeds, difficulty, algorithm });
}

export async function getAsyncStatus(requestIds: string[]) {
  return postJson<AsyncStatusResponse>("/api/async/status", { requestIds });
}

export async function getHealth() {
  return getJson<HealthResponse>("/api/health");
}
