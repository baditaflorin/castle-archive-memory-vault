# 0010. GitHub Pages publishing strategy

- Status: accepted
- Date: 2026-05-11

## Decision

- **Source**: `main` branch, `/docs` folder.
- **Build output**: `docs/` (Vite `outDir: 'docs'`, `emptyOutDir: false`).
- **Base path**: `/castle-archive-memory-vault/`.
- **Custom domain**: not in scope for v1. The default `*.github.io` URL is the canonical address.
- **404.html SPA shim**: included; routes back to `index.html` with the original path preserved in `sessionStorage`.
- **Cache busting**: Vite hashes JS/CSS filenames; `index.html` is served with no-cache by Pages so new deploys are picked up immediately.
- **Service worker scope**: matches the base path; registered at `/${BASE}/sw.js`.

## .gitignore reconciliation

`docs/` is **not** ignored, because GitHub Pages serves from it. Within `docs/`:

- `docs/index.html`, `docs/assets/*` — built artifacts, committed.
- `docs/adr/*.md`, `docs/architecture.md`, etc. — hand-written docs, committed.
- `docs/data/` — none in Mode A.

`emptyOutDir: false` in `vite.config.ts` makes sure the build does not wipe the markdown when it writes the SPA bundle.

## Initial publication

After `gh repo create` + initial push, GitHub Pages is enabled with:

```
gh api -X POST repos/baditaflorin/castle-archive-memory-vault/pages \
  -f source[branch]=main \
  -f source[path]=/docs
```

The live URL `https://baditaflorin.github.io/castle-archive-memory-vault/` typically becomes reachable within ~60 seconds of the first push.

## Rollback

Reverting the publishing commit on `main` rolls the live site back. There is no separate deploy log to consult — Pages publishes whatever `main/docs` contains. Force-push is **not** an acceptable rollback because it rewrites the history other contributors rely on.

## Consequences

- Builds **must** produce a self-contained `docs/` directory that can be served as-is.
- The `pre-push` hook verifies `docs/index.html` exists and has the expected `<script type="module">` tag pointing at a hashed asset.
- Markdown docs and built assets coexist in the same directory — see ADR 0006 service worker note for the COI-headers workaround.
