# Postmortem — v0.1 scaffold

Date: 2026-05-11
Mode chosen: A (Pure GitHub Pages)

## What we built

A local-first voice reflection vault that records audio, transcribes via Whisper-tiny WASM, embeds via MiniLM, encrypts with age, indexes with DuckDB-WASM, and exports Markdown/HTML clips. Everything runs in the browser; the only "backend" is `npm run build` writing into `docs/`. The full Mode A toolchain is wired: dev server, build, ESLint, Prettier, Vitest unit tests, Playwright smoke test, git hooks (pre-commit, commit-msg, pre-push), and seventeen ADRs.

Initial shell bundle: ~88 KB gzipped (React + crypto). DuckDB and the two ML workers are lazy and cached.

## Was Mode A the right choice?

**Yes, decisively.** The brief asked for a memory vault for retreat reflections — the use case is single-user and inherently private. Putting any of this on a server would have:

1. Created a place reflections *could* leak from.
2. Introduced TLS, abuse handling, and uptime as ongoing costs for zero user benefit.
3. Made the live demo URL depend on whether a paid host is up.

Mode B (precomputed data) was clearly wrong — the data is the user's own reflections; there's nothing to precompute. Mode C (Pages + Docker backend) was tempting only because the brief mentioned tools that *sound* server-side (DuckDB, Pandoc). But every one of those has a WASM equivalent, and the substitutes are good enough.

The closest thing to a regret is the model-weights download — first-time Record takes minutes on a slow connection. A Mode C backend doing transcription server-side would be faster *for first use*. But we'd pay for it forever in trust, complexity, and cost. The right path if speed becomes a real complaint is to ship smaller models, not a backend.

## What worked

- **TypeScript strict + Vite + workers** is the right shape for this. Lazy WASM loading is the difference between a 200 MB first paint and a 70 KB first paint.
- **age-encryption.js** worked first-try; the API is small and obvious.
- **transformers.js v3** handled both Whisper and MiniLM without bespoke worker wiring beyond the standard pattern.
- **DuckDB-WASM** + inlined SQL is the simplest hybrid text/vector index we could build. Parametric queries through `prepare()` were brittle around array binding; inlining the embedding literal proved more robust.
- **Smoke test caught a real bug** on first run — the `'`/`'` (rsquo vs ASCII apostrophe) mismatch in a Playwright locator. Without the smoke gate this would have shipped silently and broken the e2e in the wild.

## What didn't (or surprised us)

- **Pandoc-WASM is impractical for v1.** ~50 MB and a Haskell runtime to render Markdown to HTML is a bad trade. Substituted `marked` (12 KB). The brief's Pandoc mention was treated as "produce shareable transcript artifacts", which marked + browser-print satisfies. Re-evaluate if a user demands LaTeX or ePub output.
- **COOP/COEP on Pages.** GitHub Pages cannot set response headers. The `coi-serviceworker.js` shim works but means **first page load lacks SharedArrayBuffer** — the service worker registers, then the second navigation has it. ONNX runtime falls back to single-threaded mode the first time, so first-time transcription is slower than it could be. Acceptable but documented.
- **`Recorder.tsx` vs `recorder.ts` case clash on macOS** — case-insensitive filesystem + case-sensitive TS module resolution = a confusing build error. Renamed the lib file to `media.ts`. Cheap to fix once spotted but easy to miss on Linux.
- **transformers.js types are wide** — the dynamic pipeline API doesn't narrow well from `pipeline(task, model)`. We `as unknown as` cast to a narrow `AnyPipe` shape internally; not pretty but tracked in the ADRs as deliberate.

## Tech debt accepted

1. **Vault export/import (`.castle-vault` files)** is documented in ADR 0004 but not implemented in v0.1. Currently a clear-site-data event wipes the vault. **High priority for v0.2.**
2. **Audio is unencrypted in OPFS** (relying on origin isolation). Per-blob age encryption is a reasonable addition; deferred because playback latency was the open question.
3. **No PWA install / offline manifest.** The service worker exists for COI, not for offline caching. A proper `manifest.json` + asset precache would make the app installable. Low-effort but not v0.1.
4. **No cross-attendee clip sharing UI.** The age primitives are in place — just the recipient-management UI is unwritten.
5. **DuckDB index is rebuilt fully on every session.** For ~30 reflections it's instant; if a user accumulates hundreds it'll feel slow. Cache the indexed Arrow batch in IndexedDB next.
6. **Whisper-tiny is good but not great** at non-English. Adding a language selector in the recorder and using `Xenova/whisper-base` for accents could lift accuracy materially.
7. **No telemetry-blocker pre-commit test.** The grep is in place; an actual test that tries to commit a fake Plausible script and asserts it's rejected would be nice.

## Time vs estimate

Estimated 4–6 hours for the scaffold, realistic happy-path implementation, and verification. Actual: roughly that range, with the bulk in (a) wiring the workers correctly through Vite and (b) chasing the DuckDB binding/casing details.

## Next 3 most valuable improvements

1. **`.castle-vault` export/import** — closes the data-loss footgun. ~half day.
2. **Cross-attendee clip sharing UI** — turns this from a personal app into a retreat app. Recipients management view + "encrypt to..." picker on a reflection. ~1 day.
3. **Larger Whisper option + language hints** — better transcripts make every downstream feature better. Add a model picker in settings. ~half day.

## Verdict

Brief satisfied. Mode A held. v0.1 is publishable.
