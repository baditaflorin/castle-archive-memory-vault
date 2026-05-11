# Architecture

A C4-style sketch of the system. The boundary that matters most: **nothing leaves the browser** without an explicit user action. GitHub Pages is the only network surface — and it only serves static assets.

## C4 — Context

```mermaid
flowchart LR
  Attendee([Retreat attendee])
  Pages[(GitHub Pages<br/>static hosting)]
  HF[(Hugging Face CDN<br/>model weights, lazy)]
  Browser[Browser<br/>SPA + WASM + IndexedDB + OPFS]

  Attendee -->|opens URL| Pages
  Pages -->|HTML/JS/CSS| Browser
  Browser -.->|one-time per model| HF
  Browser -->|local mic| Browser
  Browser -->|local storage| Browser
```

The trust boundary is the device. No backend speaks to the browser at runtime except the asset CDNs above.

## C4 — Container

```mermaid
flowchart TB
  subgraph Browser[Browser tab]
    direction TB

    UI[App shell<br/>React + Tailwind]
    Identity[Identity feature<br/>age keypair + unlock]
    Recorder[Recording feature<br/>MediaRecorder]
    TWorker[Transcription Worker<br/>Whisper-tiny via ONNX]
    EWorker[Embedding Worker<br/>MiniLM-L6 via ONNX]
    Search[Search feature<br/>DuckDB-WASM index]
    Storage[Storage layer<br/>IndexedDB + OPFS]
    Export[Export feature<br/>Markdown / HTML]
    COI[COI Service Worker<br/>COOP+COEP shim]

    UI --> Identity
    UI --> Recorder
    UI --> Search
    UI --> Export

    Recorder --> TWorker
    Recorder --> EWorker
    Recorder --> Storage

    Search --> EWorker
    Search --> Storage

    Identity --> Storage
    Export --> Storage

    COI -. enables threads .-> TWorker
    COI -. enables threads .-> EWorker
    COI -. enables threads .-> Search
  end
```

## Recording → vault flow

```mermaid
sequenceDiagram
  participant U as User
  participant R as Recorder
  participant T as Transcription Worker
  participant E as Embedding Worker
  participant V as Vault (Storage)

  U->>R: Tap "Start recording"
  R->>R: getUserMedia + MediaRecorder.start
  U->>R: Tap "Stop & save"
  R->>R: Stop, collect Blob
  R->>T: postMessage(audioPcm)
  T-->>R: { text, segments }
  R->>E: postMessage(text)
  E-->>R: Float32Array embedding
  R->>V: put({ audio, payload, identity })
  V->>V: age-encrypt payload → IndexedDB
  V->>V: write audio Blob → OPFS
  V-->>R: ReflectionRecord
  R-->>U: "Sealed in your vault"
```

## Search flow

```mermaid
sequenceDiagram
  participant U as User
  participant S as SearchView
  participant V as Vault
  participant D as DuckDB-WASM
  participant E as Embedding Worker

  U->>S: open "Search" tab (once per session)
  S->>V: decryptAll(identity)
  V-->>S: DecryptedReflection[]
  S->>D: rebuildIndex(reflections)
  U->>S: type query, press Enter
  S->>E: embed(query)
  E-->>S: Float32Array
  S->>D: combined text+vector search
  D-->>S: SearchHit[]
  S-->>U: ranked results
```

## Why each piece exists

- **age-encryption** — auditable spec, simple X25519 + ChaCha20-Poly1305, lets each attendee carry their own key.
- **OPFS** — audio Blobs would bloat IndexedDB; OPFS is the right place for opaque binaries.
- **IndexedDB via idb** — typed transactional store for the structured records.
- **DuckDB-WASM** — combines full-text and vector cosine in one engine. The rebuild cost is paid once per session.
- **Whisper-tiny + MiniLM-L6** — small enough to run in a tab, accurate enough for retreat notes. Tiny Whisper is ~75 MB; "base" or "small" can be substituted later if memory allows.
- **COI service worker** — bridges the gap between GitHub Pages (no header control) and SharedArrayBuffer requirements.

## What is *not* in the architecture

- No server. No proxy. No queue. No background sync.
- No analytics pixels. No CDN beacons. No "anonymous error reporting".
- No third-party auth provider.
- No precomputed data artifacts (the brief's Mode B). All data is user-generated.

These absences are intentional and load-bearing for the privacy story.
