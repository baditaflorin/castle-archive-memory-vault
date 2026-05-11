# 0002. Architecture overview & module boundaries

- Status: accepted
- Date: 2026-05-11

## Context

Mode A (ADR 0001) constrains the architecture to a single SPA. Within that, we still need clear module boundaries so the project stays maintainable and so contributors can locate concerns quickly.

## Decision

Feature-first directory layout. Each `src/features/<name>/` owns one capability end-to-end (logic + UI + types). Cross-cutting concerns (logging, errors, primitive UI) live under `src/shared/`. WASM/ML services are isolated behind narrow interfaces so they can be swapped or mocked.

```
src/
├── App.tsx                  # Top-level shell + routing
├── main.tsx                 # React entrypoint + error boundary
├── index.css                # Tailwind + base styles
├── features/
│   ├── identity/            # age keypair gen, vault unlock, recipients
│   ├── recording/           # MediaRecorder, audio capture
│   ├── transcription/       # Whisper worker + transcribe() API
│   ├── embedding/           # MiniLM worker + embed() API
│   ├── storage/             # OPFS + IndexedDB + DuckDB-WASM
│   ├── search/              # Query orchestration over the storage layer
│   ├── vault/               # Reflection list + detail views
│   └── export/              # Markdown/HTML/PDF clip export
├── shared/
│   ├── components/          # Button, Toast, ErrorBoundary, …
│   ├── utils/               # logger, errors, time, ids
│   └── types.ts             # Cross-feature types (Reflection, Recipient, …)
```

## Module contracts

Each feature exposes a small, intentional surface. Internal implementation details are not re-exported.

| Feature        | Exposes                                                          |
| -------------- | ---------------------------------------------------------------- |
| `identity`     | `createIdentity`, `unlockIdentity`, `lockIdentity`, `useIdentity` |
| `recording`    | `useRecorder`, `RecorderControls`                                |
| `transcription`| `transcribe(audio: Blob): Promise<TranscriptionResult>`          |
| `embedding`    | `embed(text: string): Promise<Float32Array>`                     |
| `storage`      | `vault.put`, `vault.get`, `vault.list`, `vault.search`           |
| `search`       | `useSearch`, `SearchView`                                        |
| `vault`        | `VaultList`, `ReflectionView`                                    |
| `export`       | `exportClip(reflection, format)`                                 |

## Data flow

```
[mic] → MediaRecorder ─► OPFS audio blob
                       └► transcribe (worker) ─► transcript text
                                              └► embed (worker) ─► vector
                                                                 └► encrypt (age) ─► encrypted record
                                                                                   └► IndexedDB + DuckDB index
```

A search flows in reverse: query → embed → DuckDB cosine + FTS → decrypt matched records → render.

## Workers

Two dedicated Web Workers (`transcription.worker.ts`, `embedding.worker.ts`) keep the main thread responsive during ML work. They communicate via structured-clone `postMessage`. DuckDB-WASM runs in its own worker managed by the library.

## Consequences

- Adding a feature means adding a `features/<name>/` directory, not threading code through shared modules.
- Workers are an implementation detail; UI talks to `transcribe()` / `embed()` and does not know there's a worker.
- Crypto stays inside `features/identity/`. No other module touches age internals directly.
