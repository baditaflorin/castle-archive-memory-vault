# 0015. Deployment topology

- Status: accepted
- Date: 2026-05-11

## Decision

**GitHub Pages only.** There is no server, no container, no compose file, no nginx.

Sections §10 (Containerization) and §11 (Deployment Artifacts) of the bootstrap brief are intentionally not implemented; per ADR 0001 they do not apply to a Mode A project.

### Topology diagram

```
            ┌──────────────────────────────────────────┐
            │ github.com/baditaflorin/                 │
            │   castle-archive-memory-vault            │
            │                                          │
            │  main branch → docs/  ─────────────────► │  GitHub Pages CDN
            └──────────────────────────────────────────┘
                              │
                              ▼
            https://baditaflorin.github.io/castle-archive-memory-vault/
                              │
                              ▼
                       ┌──────────────┐
                       │   Browser    │
                       │              │
                       │  - SPA shell │
                       │  - WASM      │
                       │  - IndexedDB │
                       │  - OPFS      │
                       └──────────────┘
                              │ (one-time, lazy)
                              ▼
                       huggingface.co  (model weights only)
```

The only outbound network call after first load is to the model CDN. After cache warm, the app works fully offline.

### Promotion path

1. Merge to `main`.
2. `pre-push` hook builds `docs/`.
3. Push to GitHub.
4. Pages publishes within ~60 s.

There is no staging environment. If a staging environment becomes necessary, we add a `gh-pages-staging` branch served from a sibling repo with `VITE_BASE` overridden. We won't add one until there's a concrete need.

## Consequences

- Zero hosting cost.
- Rollback is `git revert` + push.
- The "deploy" step is the same as the "commit" step.
