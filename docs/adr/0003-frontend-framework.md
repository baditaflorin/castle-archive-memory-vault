# 0003. Frontend framework & build tooling

- Status: accepted
- Date: 2026-05-11

## Decision

- **React 18** + **TypeScript strict**.
- **Vite 6** as the build tool, outputting to `docs/` so GitHub Pages can serve directly from `main`.
- **TailwindCSS** for styling.
- **No client router** in v1 — a single SPA with hash-based view state. Adds zero KB and avoids 404.html shenanigans on Pages.
- **No state management library.** React state + a tiny IndexedDB-backed hook is enough.

## Alternatives considered

- **Preact**: ~5 KB smaller, but the WASM payloads dominate so the saving is meaningless. React's ecosystem (testing, types, hooks) is the practical default.
- **SvelteKit / Next.js**: too heavy for a single-page app whose entire reason to exist is "static and local".
- **Vanilla TS**: tempting for size, but the UI has enough state (recording, transcription progress, search, decryption) that a component model pays for itself.
- **Webpack / Parcel**: Vite's WASM and worker handling is better out of the box.

## Consequences

- The initial shell ships React + age + idb in ~70 KB gzipped. All ML/DB code is lazy.
- We rely on Vite's worker handling (`?worker` imports and `worker.format: 'es'`).
- Routing is via a `view` state in `App.tsx`. If/when routes proliferate, revisit with `wouter` (~1 KB).
