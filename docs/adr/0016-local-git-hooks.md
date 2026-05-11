# 0016. Local git hooks (no GitHub Actions)

- Status: accepted
- Date: 2026-05-11

## Decision

All quality gates run locally via `.githooks/`, wired via `core.hooksPath` (set by `npm run hooks:install`). No GitHub Actions.

### Hooks

| Hook         | Runs                                                                                                 |
| ------------ | ---------------------------------------------------------------------------------------------------- |
| `pre-commit` | `prettier --check`, `eslint`, `tsc --noEmit`, gitleaks-style secret scan, telemetry-blocker grep     |
| `commit-msg` | Conventional Commits validator (regex; rejects non-conforming messages)                              |
| `pre-push`   | `npm run test`, `npm run build`, `npm run smoke`. Build must produce a valid `docs/index.html`.      |

`gitleaks` is not vendored — the hook uses a simple regex grep for common token patterns (`AKIA...`, `sk-...`, `ghp_...`, `github_pat_...`, private-key headers). If a stricter scan is needed, install `gitleaks` and the hook will prefer it.

### Idempotence & manual invocation

Each hook is a shell script that can be invoked manually (`bash .githooks/pre-commit`). The `make` targets wrap them.

### Bypass policy

`--no-verify` is **forbidden** in normal workflows. If a hook is wrong, fix the hook. The pre-push hook is the only gate keeping broken `main/docs` from going live to Pages — bypassing it would publish a broken site.

## Consequences

- Contributors must run `npm run hooks:install` after cloning. The README highlights this in the Quickstart.
- The hooks are slow only the first time (Playwright browser download). Subsequent runs cache.
