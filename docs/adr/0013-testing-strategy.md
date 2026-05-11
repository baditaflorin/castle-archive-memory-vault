# 0013. Testing strategy

- Status: accepted
- Date: 2026-05-11

## Decision

Three tiers, fast enough to run in the `pre-push` hook (<60 s total):

| Tier             | Runner    | Scope                                                        |
| ---------------- | --------- | ------------------------------------------------------------ |
| Unit             | Vitest    | Pure logic in `features/` and `shared/`                      |
| Build smoke      | shell     | `npm run build` + grep `docs/index.html` for known markers   |
| End-to-end smoke | Playwright | Boots `npm run pages-preview`, asserts homepage + identity create flow |

Coverage target: **≥70% on `src/features/*/` modules that have non-trivial logic** (crypto, storage, search-ranking). UI components are exercised by the e2e smoke test, not by exhaustive unit tests — the cost/benefit is poor for React presentational components.

### What we do not test

- The Whisper or MiniLM weights themselves. We trust upstream; we only test that our wrapper produces a `Float32Array` of the expected dimensionality.
- The browser's IndexedDB / OPFS implementation. We test against the real APIs (via `happy-dom` for unit + Playwright for e2e) instead of mocking them.

### Mocks are forbidden for

- The DuckDB schema (test against the real `@duckdb/duckdb-wasm` in a worker).
- The `age-encryption` library (test against the real library — crypto wrappers are the part most likely to break).

### Flaky tests

A test that fails intermittently must be either fixed within a day or removed. There is no "skip in CI" quarantine — we don't have CI, and a quarantined test rapidly becomes a non-test.

## Consequences

- The e2e smoke is the most important test. It must always pass on `main`.
- `pre-push` runs `lint`, `test`, `build`, `smoke` in that order. The smoke takes ~20 s once Playwright's browser is cached.
