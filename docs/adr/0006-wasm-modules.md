# 0006. WASM modules used

- Status: accepted
- Date: 2026-05-11

## Decision

Four WASM payloads, all lazy-loaded behind explicit user actions:

| Module                       | Purpose                              | Size (gz, approx) | Loaded when                          |
| ---------------------------- | ------------------------------------ | ----------------- | ------------------------------------ |
| `@huggingface/transformers`  | ONNX runtime + Whisper-tiny          | 75 MB (weights)   | First "Record" tap, runs in a worker |
| `@huggingface/transformers`  | `all-MiniLM-L6-v2` (shared runtime)  | 25 MB (weights)   | After transcription completes        |
| `@duckdb/duckdb-wasm`        | SQL engine for search                | 10 MB             | First "Search" tap                   |
| `age-encryption`             | X25519 + ChaCha20-Poly1305           | 30 KB             | Eager (tiny, used everywhere)        |

`age-encryption` is small enough to load eagerly. The three big ones are lazy.

## COOP/COEP

Multi-threaded WASM (ONNX runtime, DuckDB) needs `SharedArrayBuffer`, which requires the response to have:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

GitHub Pages **does not** let us set response headers. We work around this with a **service worker shim** (`public/coi-serviceworker.js`, the well-known `coi-serviceworker` pattern) which intercepts the page's own responses and adds these headers. The service worker is registered on first load; the second load gives us cross-origin isolation.

The service worker scope must match the Pages base path (`/castle-archive-memory-vault/`), set in `vite.config.ts`.

## Pandoc substitution

The original brief mentions Pandoc. Pandoc-WASM exists but is ~50 MB and brings in Haskell runtime overhead for what reduces to "render Markdown to HTML". For v1 we substitute:

| Original    | Substitute                                  |
| ----------- | ------------------------------------------- |
| Pandoc → MD | Generated directly (string templating)      |
| Pandoc → HTML | `marked` (12 KB)                          |
| Pandoc → PDF | Browser print dialog (`window.print()`) into the HTML view |

If a future feature requires Pandoc-grade format conversion (LaTeX, Org, ePub), we re-evaluate.

## Model fetch policy

- Default origin: `https://huggingface.co` (transformers.js default).
- The `VITE_TRANSFORMERS_REMOTE_HOST` env var overrides it for users running a private mirror.
- On first fetch we display a "Downloading ~75 MB of model weights — one-time per device" message with a cancel button.
- The browser cache and our service worker both retain the weights; subsequent loads are < 1 s.

## Consequences

- First-time Record is slow over a poor connection; the UI states this clearly.
- Repeat visits are fast.
- We need a documented offline-first flow: once weights are cached, the app is fully usable offline.
