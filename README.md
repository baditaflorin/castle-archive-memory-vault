# castle-archive-memory-vault

[![live site](https://img.shields.io/badge/live-baditaflorin.github.io%2Fcastle--archive--memory--vault-blue)](https://baditaflorin.github.io/castle-archive-memory-vault/)
[![license: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![mode A: pure GitHub Pages](https://img.shields.io/badge/mode-A%20pure%20Pages-success)](docs/adr/0001-deployment-mode.md)

A private, **local-first voice reflection vault** for retreats. Each attendee voice-records their daily reflections in the browser; everything is transcribed, embedded, and encrypted to their own [age](https://age-encryption.org) key. Nothing leaves the device unless the attendee explicitly exports a transcript clip after the retreat.

Replaces the "lost in the moment, never written down" problem with a vault that's searchable, shareable, and yours.

## Live site

https://baditaflorin.github.io/castle-archive-memory-vault/

## Quickstart

```bash
git clone https://github.com/baditaflorin/castle-archive-memory-vault.git
cd castle-archive-memory-vault
npm install
npm run hooks:install
npm run dev          # http://localhost:5173/castle-archive-memory-vault/
```

Five commands. The dev server sets `COOP`/`COEP` headers so multi-threaded WASM (DuckDB, ONNX runtime) loads correctly.

## What it does

1. **Generate an identity.** A fresh [age](https://age-encryption.org) X25519 keypair is created in your browser. The private key is stored only in your device's IndexedDB; the public recipient string is what other attendees use to send you encrypted clips.
2. **Record a reflection.** Browser `MediaRecorder` captures audio into OPFS. No upload, no server.
3. **Transcribe locally.** Whisper-tiny runs in a Web Worker via `@huggingface/transformers` (ONNX runtime, WASM). First run downloads ~75 MB of model weights from Hugging Face; subsequent runs are cached.
4. **Embed for search.** Sentence-transformer `all-MiniLM-L6-v2` (~25 MB) generates a 384-dim vector for each transcript.
5. **Encrypt.** Transcript + embedding + audio pointer are encrypted with your age recipient and stored in IndexedDB and OPFS.
6. **Search.** DuckDB-WASM holds the encrypted-at-rest index but operates on a decrypted in-memory view during the session; full-text + cosine similarity.
7. **Export a clip.** Pick a reflection, render it through `marked` to HTML/Markdown, and download it — or share by encrypting with another attendee's age recipient.

See [docs/architecture.md](docs/architecture.md) for the system diagram.

## Deployment mode: A — Pure GitHub Pages

No backend. Ever. The entire app, including all crypto, ML, and database work, runs in the browser. See [ADR 0001](docs/adr/0001-deployment-mode.md) for the full justification.

## Architecture

```
Browser
├── React 18 + Vite app shell      (~70 KB gz, ships immediately)
├── age-encryption.js              (~30 KB gz, eager)
├── idb wrapper over IndexedDB     (vault metadata)
├── OPFS                            (raw audio blobs)
├── Web Worker: Whisper            (~75 MB, lazy, cached)
├── Web Worker: MiniLM             (~25 MB, lazy, cached)
└── DuckDB-WASM                    (~10 MB, lazy on first search)
```

Initial-load JS payload target: **< 200 KB gzipped**. Heavy WASM modules sit behind explicit user actions (the first record / first search) and the service worker caches them.

## Privacy

- No accounts, no telemetry, no analytics — see [docs/privacy.md](docs/privacy.md).
- All encryption keys live in your browser only. If you clear site data, **your reflections are gone**. Export an encrypted backup before clearing.
- The Hugging Face model CDN is contacted **once per model**, for weights only. If you mirror models privately set `VITE_TRANSFORMERS_REMOTE_HOST`.

## Development

| Task              | Command                 |
| ----------------- | ----------------------- |
| Dev server        | `npm run dev`           |
| Type-check + lint | `npm run lint`          |
| Format            | `npm run fmt`           |
| Unit tests        | `npm run test`          |
| Smoke test        | `npm run smoke`         |
| Build for Pages   | `npm run build`         |
| Preview Pages     | `npm run pages-preview` |

Or use `make help`.

## ADRs

All architecture decisions are recorded in [docs/adr/](docs/adr/). Start with [0001 deployment mode](docs/adr/0001-deployment-mode.md) and [0002 architecture overview](docs/adr/0002-architecture-overview.md).

## Security

If you find a vulnerability, please follow [SECURITY.md](SECURITY.md). **Do not** open a public issue for security reports.

## License

MIT — see [LICENSE](LICENSE).
