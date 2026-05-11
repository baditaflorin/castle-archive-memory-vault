# Contributing

Thank you for considering a contribution.

## Local setup

```bash
npm install
npm run hooks:install
npm run dev
```

## Workflow

1. Open an issue describing what you want to change, especially for non-trivial work. Architecture-shaping changes should land an ADR in `docs/adr/` first.
2. Branch from `main`: `git checkout -b <type>/<short-name>` where `<type>` is one of `feat`, `fix`, `docs`, `chore`, `refactor`, `test`.
3. Make focused commits using [Conventional Commits](https://www.conventionalcommits.org/). The `commit-msg` hook enforces the format.
4. Before pushing: `npm run lint && npm run test && npm run build && npm run smoke`. The `pre-push` hook runs these automatically.
5. Open a pull request. The diff should be small and the description should explain _why_, not just _what_.

## Code style

- TypeScript strict; no `any` without a `// reason:` comment.
- ESLint + Prettier — formatters are non-negotiable, run `npm run fmt` before committing.
- One concern per file, single default export when sensible.
- No `console.log` in production code; use `src/shared/utils/logger.ts`.
- Error handling: wrap with `withResult` / `handleErrorOrLog` from `src/shared/utils/errors.ts` so error sources are consistent.

## Testing

- Unit tests live next to source as `tests/unit/<module>.test.ts`.
- The Playwright smoke test in `tests/e2e/smoke.spec.ts` is the only end-to-end test and must always pass on `main`.

## ADRs

Significant decisions get an ADR. Copy an existing one in `docs/adr/` and follow the MADR template:

- Status: proposed | accepted | superseded
- Context, Decision, Consequences, Alternatives considered.

## Reporting bugs

Open an issue. Include browser, version, and exact reproduction steps. **Never** attach your vault export or any encrypted material to a public issue.
