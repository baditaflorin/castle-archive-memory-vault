# 0011. Logging strategy

- Status: accepted
- Date: 2026-05-11

## Decision

A tiny `Logger` (`src/shared/utils/logger.ts`) with three levels — `debug`, `info`, `warn`, `error` — that wraps `console.*`. Production builds collapse `debug` and `info` to no-ops via Vite's `import.meta.env.PROD`.

### Rules

1. **No vault content is ever logged.** Not transcripts, not embeddings, not titles, not even truncated previews. The error/log layer asserts this by accepting only `{tag, code, meta?}` where `meta` is `Record<string, string | number | boolean>` — no strings holding user data.
2. **Errors carry a stable `code`** so issues can be discussed without context. Codes are kebab-case and live in `src/shared/utils/errors.ts`.
3. **Production console output is minimal.** Only `warn` and `error` reach the console, and only with codes — no stack traces by default. Users opening DevTools should not see internals dumped.
4. **Crash reporting** is not wired up. There is no remote logging endpoint to send to — that would violate ADR 0001.

## Consequences

- Debugging a user report happens by asking them to flip a local `localStorage.setItem('debug', '1')` flag, which raises the threshold to `debug` and re-emits the last 100 entries from an in-memory ring buffer.
- Tests use the same logger with the threshold pinned to `error` to keep test output clean.
