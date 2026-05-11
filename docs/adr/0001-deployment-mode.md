# 0001. Deployment mode: A — Pure GitHub Pages

- Status: accepted
- Date: 2026-05-11

## Context

The brief calls for a memory vault that records, transcribes, encrypts, indexes, and exports voice reflections during a retreat. The user-facing pain is "lost in the moment, never written down" — a personal, private problem. The natural trust boundary is the attendee's own device.

The deployment mode must be chosen before anything else; it shapes every downstream decision.

## Decision

**Mode A — Pure GitHub Pages.** No runtime backend in v1. The entire application — recording, transcription (Whisper), embedding (sentence-transformers), encryption (age), search (DuckDB), and export — runs in the browser.

## Why this is feasible

Every dependency in the brief has a viable WASM/JS counterpart:

| Brief                    | In-browser substitute                                         |
| ------------------------ | ------------------------------------------------------------- |
| Whisper                  | `@huggingface/transformers` running ONNX Whisper-tiny in WASM |
| sentence-transformers    | `@huggingface/transformers` with `all-MiniLM-L6-v2`           |
| age encryption           | `age-encryption` (pure JS, audited port of FiloSottile/age)   |
| DuckDB                   | `@duckdb/duckdb-wasm` (official)                              |
| Pandoc                   | `marked` for MD→HTML; browser print → PDF (see ADR 0006)      |
| Persistent local storage | OPFS for audio; IndexedDB for metadata + encrypted records    |

Computation that would traditionally live server-side fits inside a Web Worker. The model weights are the only large external dependency, fetched from the public Hugging Face CDN on first use and cached by the browser + service worker.

## Why a backend would be wrong

A runtime backend would:

1. **Increase privacy risk.** A server is a place reflections could leak from. Mode A makes that impossible by construction.
2. **Add operational cost** (TLS, uptime, abuse handling) for no functional gain — v1 has no shared state.
3. **Violate the non-goal** of "no server-side storage of audio, transcripts, keys, or memories."

Mode B (precomputed data) is also wrong: the data is entirely user-generated and never precomputable.

## Consequences

- Sections §3, §8, §9 (backend), §10 (containerization) of the bootstrap brief do not apply. They are deliberately omitted from the repo.
- The "backend" reduces to `npm run build` — Vite compiling the SPA into `docs/`.
- Model assets are heavy on first load (~100 MB total). They sit behind explicit user actions and the service worker caches them.
- Cross-device sync is out of scope. If users want it, they export an encrypted vault dump and import it elsewhere.
- The frontend bundle MUST never contain secrets (this is a hard rule from §17).
- The app must be usable when the Hugging Face CDN is unreachable, *after* models have been cached once. Cold first-run requires network.

## Alternatives considered

- **Mode B** (precomputed data + static frontend): rejected. The data is the user's own reflections; nothing to precompute.
- **Mode C** (Pages + Docker backend): rejected. No multi-user flows in v1. A backend would either be vestigial or change the privacy model — the brief explicitly rejects the latter.
- **Local-only Electron/Tauri app**: tempting but loses the "open a URL and start recording" friction-free property of Pages. Could be added later as a wrapper around the same SPA.

## Re-evaluation triggers

Re-open this ADR if:

- Cross-device or cross-attendee real-time sync becomes a v1 requirement.
- Model weights cannot be reliably cached and the network round-trip becomes unacceptable.
- A regulatory requirement forces server-side audit logs.
