# 0017. Dependency policy

- Status: accepted
- Date: 2026-05-11

## Decision

Only battle-tested libraries. Specifically:

| Need                | Library                       | Why                                                  |
| ------------------- | ----------------------------- | ---------------------------------------------------- |
| UI framework        | `react` + `react-dom`          | Standard, well-typed, large ecosystem.               |
| Bundler             | `vite`                         | Excellent WASM + worker handling.                    |
| Styling             | `tailwindcss`                  | Lightweight when purged; no runtime overhead.        |
| Encryption          | `age-encryption`               | Pure-JS port of audited age spec.                    |
| IndexedDB wrapper   | `idb`                          | Tiny, promise-y, by Jake Archibald.                  |
| Local SQL + vectors | `@duckdb/duckdb-wasm`          | Official, fast, supports vector cosine.              |
| ML runtime          | `@huggingface/transformers`    | The reference WASM/ONNX runner for HF models.        |
| Markdown rendering  | `marked`                       | 12 KB, no plugins, exactly the surface we need.      |
| Test runner         | `vitest` + `@playwright/test`  | Vite-native unit; Playwright is the smoke gold std. |

### What we do NOT add

- A state management library (Redux, Zustand, Jotai). React state + a few `useSyncExternalStore` shims suffice.
- A form library. The forms are trivial (passphrase, recipient).
- A toast library. ~30 lines in `shared/components/Toast.tsx`.
- A router. Hash-based view state.
- `lodash` / `ramda`. The stdlib is enough.

### Update cadence

- `npm audit` is run by the `pre-commit` hook (warns; does not block). Critical advisories block.
- Dependabot is **not** used (no GitHub Actions). Maintainer manually `npm outdated` once a month.

## Consequences

- The dependency tree stays small. The initial install is fast.
- Every dep is justified above; adding a new one requires updating this ADR (or a follow-on).
