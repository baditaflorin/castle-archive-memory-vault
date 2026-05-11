# 0009. Configuration & secrets management

- Status: accepted
- Date: 2026-05-11

## Decision

There are **no runtime secrets**. The only configuration is build-time:

| Var                              | Purpose                                          | Default                              |
| -------------------------------- | ------------------------------------------------ | ------------------------------------ |
| `VITE_BASE`                      | URL base path                                    | `/castle-archive-memory-vault/`      |
| `VITE_TRANSFORMERS_REMOTE_HOST`  | Override the model CDN                           | unset → Hugging Face                 |

User-supplied "secrets" (the age passphrase) are processed in-browser and **never** logged or persisted unencrypted. They are scrypt-stretched and discarded immediately.

`.env.example` is committed; `.env`, `.env.local` are gitignored.

## Why this matters for a Mode A project

Mode A means the frontend MUST NEVER hold a real secret — there's no server to gate access. Any external API key would be visible to anyone who opened the bundle. The only "key" the application handles is the user's own age key, which is generated and stored on their device.

If a future feature requires a third-party API key (transcription via OpenAI, etc.), the design rule is **BYO-key**: the user pastes it into a form, we keep it in `sessionStorage` for the tab's lifetime, and we never commit it to disk. That rule must be defended in a new ADR before implementation.
