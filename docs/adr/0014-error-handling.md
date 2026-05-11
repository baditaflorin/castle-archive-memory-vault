# 0014. Error handling conventions

- Status: accepted
- Date: 2026-05-11

## Decision

### Result-style helpers

`src/shared/utils/errors.ts` exports:

```ts
type AppError = { code: string; cause?: unknown; meta?: Record<string, string | number | boolean> };

handleErrorOrLog<T>(
  promise: Promise<T>,
  opts: { errCode: string; successMsg?: string; errMsg?: string }
): Promise<T | undefined>;

assert(cond: unknown, code: string, meta?: ...): asserts cond;

isAppError(x: unknown): x is AppError;
```

Per the user's standing convention, the helper logs success and error messages with a stable code rather than free-form strings.

### Throw vs return

- **Throw** when the caller cannot reasonably continue (decryption failure on a passphrase the user provided).
- **Return `{ ok: false, error }`** when the caller plausibly retries (transient network on a model fetch).

### UI surface

A single `ErrorBoundary` at the App root catches anything that escapes. Routine errors are surfaced as toasts. **Vault content is never included in an error message** — only the error code and any structured `meta` fields.

### Error codes

Codes live in `src/shared/utils/errors.ts` as a frozen object so the set is enumerable. New codes get added to the list, not invented inline.

```
identity/passphrase-too-short
identity/decrypt-failed
storage/quota-exceeded
storage/opfs-write-failed
transcription/model-fetch-failed
transcription/worker-crash
search/duckdb-init-failed
export/format-unsupported
…
```

## Consequences

- Errors are diagnosable without exposing user data.
- The error catalog is a single file, easy to audit.
- No `throw new Error('something failed')` strings sprinkled in the codebase — `assert()` or a code-based `AppError`.
