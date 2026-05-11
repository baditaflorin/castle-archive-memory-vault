// Error catalog + helpers. See docs/adr/0014-error-handling.md.

export const ERROR_CODES = Object.freeze({
  IDENTITY_PASSPHRASE_TOO_SHORT: 'identity/passphrase-too-short',
  IDENTITY_DECRYPT_FAILED: 'identity/decrypt-failed',
  IDENTITY_NO_ACTIVE: 'identity/no-active',
  STORAGE_QUOTA_EXCEEDED: 'storage/quota-exceeded',
  STORAGE_OPFS_WRITE_FAILED: 'storage/opfs-write-failed',
  STORAGE_OPFS_READ_FAILED: 'storage/opfs-read-failed',
  STORAGE_OPFS_UNSUPPORTED: 'storage/opfs-unsupported',
  STORAGE_DB_OPEN_FAILED: 'storage/db-open-failed',
  RECORDING_PERMISSION_DENIED: 'recording/permission-denied',
  RECORDING_UNSUPPORTED: 'recording/unsupported',
  TRANSCRIPTION_MODEL_FETCH_FAILED: 'transcription/model-fetch-failed',
  TRANSCRIPTION_WORKER_CRASH: 'transcription/worker-crash',
  EMBEDDING_MODEL_FETCH_FAILED: 'embedding/model-fetch-failed',
  SEARCH_DUCKDB_INIT_FAILED: 'search/duckdb-init-failed',
  EXPORT_FORMAT_UNSUPPORTED: 'export/format-unsupported',
  EXPORT_NO_REFLECTIONS_SELECTED: 'export/no-reflections-selected',
  GENERIC_UNKNOWN: 'generic/unknown',
} as const);

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export type ErrorMeta = Record<string, string | number | boolean>;

export interface AppError {
  readonly isAppError: true;
  readonly code: ErrorCode;
  readonly cause?: unknown;
  readonly meta?: ErrorMeta;
}

export function appError(code: ErrorCode, cause?: unknown, meta?: ErrorMeta): AppError {
  return { isAppError: true, code, cause, meta };
}

export function isAppError(x: unknown): x is AppError {
  return typeof x === 'object' && x !== null && (x as { isAppError?: unknown }).isAppError === true;
}

export function assert(cond: unknown, code: ErrorCode, meta?: ErrorMeta): asserts cond {
  if (!cond) throw appError(code, undefined, meta);
}

import { logger } from './logger.js';

// Per project convention: log success or error with a stable code, never the user's data.
export async function handleErrorOrLog<T>(
  promise: Promise<T>,
  opts: { errCode: ErrorCode; successCode?: string; meta?: ErrorMeta }
): Promise<T | undefined> {
  try {
    const result = await promise;
    if (opts.successCode) logger.info(opts.successCode, opts.meta);
    return result;
  } catch (cause) {
    const code = isAppError(cause) ? cause.code : opts.errCode;
    const meta = isAppError(cause) ? { ...opts.meta, ...cause.meta } : opts.meta;
    logger.error(code, meta);
    return undefined;
  }
}
