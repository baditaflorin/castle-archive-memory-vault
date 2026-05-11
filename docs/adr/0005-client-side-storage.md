# 0005. Client-side storage strategy

- Status: accepted
- Date: 2026-05-11

## Decision

Three storage surfaces, chosen for the kind of data each holds:

| Surface       | Holds                                              | Why                                                                 |
| ------------- | -------------------------------------------------- | ------------------------------------------------------------------- |
| **IndexedDB** | Identity, reflection metadata, recipients (encrypted) | Structured records, transactional, queryable; via `idb` wrapper. |
| **OPFS**      | Raw audio blobs (WebM/Opus)                        | Designed for opaque large binary files; no quota games.             |
| **DuckDB-WASM** | Derived search index (in-memory; persisted to OPFS) | Vector + FTS at native speed; cleared on lock.                    |

`localStorage` is used only for **UI preferences** (theme, last-active identity id). No vault data ever lands there — it's synchronous and easy to leak via `JSON.stringify` accidents.

## Lifecycle

1. **Cold start**: open IndexedDB, list identities, prompt for unlock if any exist.
2. **Unlock**: derive symmetric key from passphrase via scrypt, decrypt the chosen identity's private key in memory, hold for the session.
3. **Recording → storage**: audio written to OPFS streaming; metadata + transcript + embedding bundled, age-encrypted, written to IndexedDB.
4. **Search**: rebuild DuckDB index lazily on first query of a session by streaming decrypted bundles into a `vault_reflections` virtual table.
5. **Lock / tab close**: in-memory DuckDB state is dropped. IndexedDB and OPFS persist (encrypted at rest).

## Quotas

- Audio @ Opus 24 kbps mono ≈ 180 KB / minute. A 30-minute reflection ≈ 5 MB. A 7-day retreat at one reflection per day ≈ 35 MB. Well within the typical `navigator.storage.estimate()` quota of ~1 GB.
- We call `navigator.storage.persist()` after the first identity is created so the browser is less likely to evict the vault under storage pressure.

## Consequences

- The DuckDB index is **disposable**. If the schema changes we drop and rebuild it from IndexedDB.
- OPFS audio is referenced from IndexedDB by relative path; orphan-cleanup runs on each unlock.
- Clearing site data deletes everything. The UI warns about this and prompts an export before destructive actions.
