# 0012. Metrics & observability

- Status: accepted
- Date: 2026-05-11

## Decision

**No analytics. No telemetry. No remote endpoints of any kind.**

The project's defining quality is privacy. Even Plausible-style "privacy-respecting" analytics would betray that — they would still beacon out which retreats are being recorded. We will not.

If we ever need usage insight, the path is:

1. Opt-in local-only counters surfaced in a "Your stats" view (records this week, words transcribed, search count). The user sees their own data and that's it.
2. Aggregate community surveys, sent voluntarily, never automatic.

## Consequences

- No `<script>` tags for analytics, ever.
- `docs/privacy.md` makes this commitment explicit and visible from the footer.
- The CI-equivalent pre-commit hook greps for `googletagmanager`, `plausible.io`, `sentry-cdn`, `posthog.com`, and rejects any commit that adds them. (Implemented in `.githooks/pre-commit`.)
