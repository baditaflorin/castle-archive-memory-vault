# Security Policy

## Reporting a vulnerability

Email `baditaflorin+security@gmail.com` with subject `castle-archive-memory-vault: <short summary>`. Please **do not** open a public GitHub issue for security reports.

We aim to acknowledge within 72 hours and fix or mitigate within 14 days for high-severity issues.

## Scope

In scope:

- Cryptographic issues in vault encryption (`src/features/identity/`).
- Storage issues that could leak vault data across origins or between users on the same device.
- Cross-site scripting, supply chain, or build-time injection.
- Privacy regressions (anything that causes vault data to leave the browser unintentionally).

Out of scope:

- Issues that require physical access to an already-unlocked device.
- Browser extensions modifying the running page.
- Issues in third-party model weights downloaded from Hugging Face (report upstream).

## Threat model

This app is Mode A (pure GitHub Pages, no backend). The assumed adversary is a passive network observer plus other users on the same device. The trust boundary is the user's browser profile. A compromised device or a malicious browser extension is out of scope.

## Cryptography

- Identity keys: [age](https://age-encryption.org) X25519 via the `age-encryption` library.
- Symmetric encryption: ChaCha20-Poly1305 (provided by age).
- Random sources: `crypto.getRandomValues` exclusively.
- Storage at rest: encrypted blobs in IndexedDB and OPFS. Decryption happens only into in-memory structures and only during an authenticated session.
- Lock screen: after `IDLE_LOCK_MS` of inactivity, the in-memory decrypted state is purged and the user must re-enter their passphrase.

If you find a deviation from this model, that is a vulnerability worth reporting.
