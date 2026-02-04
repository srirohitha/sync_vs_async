export const HASH_ALGORITHMS = [
  { value: 'sha256', label: 'SHA-256' },
  { value: 'sha512', label: 'SHA-512' },
  { value: 'sha3_256', label: 'SHA3-256' },
  { value: 'sha3_512', label: 'SHA3-512' },
  { value: 'blake2b', label: 'BLAKE2b' },
] as const;

export type HashAlgorithm = (typeof HASH_ALGORITHMS)[number]['value'];

export const DEFAULT_HASH_ALGORITHM: HashAlgorithm = 'sha256';

// Keep in sync with backend/api/views.py.
export const HASH_ITERATIONS_PER_CYCLE = 50000;
