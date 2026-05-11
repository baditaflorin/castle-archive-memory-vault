# Privacy

This is a local-first app. The defining quality is that **your reflections never leave your device unless you, the user, take an explicit action to export them**.

## What stays on your device

- The audio recording (in OPFS).
- The Whisper transcript and timestamps.
- The MiniLM embedding vector.
- Your age private key (encrypted with your passphrase).
- The DuckDB search index (rebuilt from the above on every session).
- UI preferences (theme, last-active identity id) in `localStorage`.

## What is sent over the network

- **The static site itself** (HTML/JS/CSS), from `*.github.io`. No first-party request carries any vault content.
- **Model weights**, fetched once per device per model from `https://huggingface.co`. These are public weights downloaded by every transformers.js user; the request reveals only that *somebody at your IP fetched Whisper-tiny / MiniLM-L6* — which is true of millions of people.

Both of these are unauthenticated GETs. There are no cookies, no tracking pixels, no error-reporting endpoints. The Network tab in your devtools is the source of truth: after the page and models load, no further outbound requests are made.

## What is *not* collected

- No analytics, anywhere. Not even "privacy-respecting" ones. See [ADR 0012](adr/0012-observability.md).
- No usage counters or A/B telemetry.
- No crash reports.
- No identifying information.

## Threat model

The assumed adversary is:

- A passive network observer on the same Wi-Fi.
- Another person using the same browser profile.

The user's own device, and its operating system and browser, are trusted. A compromised device or a malicious browser extension is out of scope — there is no defence against an attacker who already owns the runtime.

## Encryption details

- **Identity**: age X25519 keypair (`age1...`).
- **At rest**: each reflection's bundle (transcript + embedding + metadata) is age-encrypted to your recipient and stored in IndexedDB. The audio Blob in OPFS is **not** encrypted — it sits inside the browser's origin-isolated filesystem, which other origins cannot read. If full audio encryption is required, see the next section.
- **In transit when sharing a clip**: a single age-encrypted file. Exported clips go through Markdown/HTML rendering — they are *not* encrypted unless you choose to encrypt to a recipient explicitly.
- **Passphrase derivation**: scrypt (via age's built-in passphrase mode).

## "What if I want stronger audio protection?"

Right now we trust browser-origin isolation for the OPFS audio Blob. Open an issue or [ADR 0018+] proposing per-blob age encryption — the cost is read/write latency on playback. We've not done it because the cost/benefit hadn't argued for it given the threat model above.

## Vault portability

- Export your full vault (`Vault export`, planned for v0.2) to a single `.castle-vault` file encrypted to your own age recipient.
- Re-import on another device by entering the same passphrase.
- The export format is documented in [ADR 0004](adr/0004-static-data-contract.md) and is stable across non-breaking schema versions.

## Clearing site data

Browsers ship a "Clear site data" affordance. If you use it, **your vault is gone**. There is no recovery — that's the trade for storing nothing on a server. Export a backup before clearing.

## Contact

Questions about privacy? `baditaflorin+privacy@gmail.com`.
