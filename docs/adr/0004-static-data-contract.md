# 0004. Static data contract

- Status: accepted
- Date: 2026-05-11

## Context

In Mode A (ADR 0001) the application is the only "data producer". There is no pre-built JSON/Parquet/SQLite shipped from the repo. The closest analogue is the **internal data schema** that lives entirely in the browser's IndexedDB + OPFS.

## Decision

The schema below is the **vault contract**. Breaking changes bump `SCHEMA_VERSION` and add a migration in `src/features/storage/migrations.ts`. The contract is internal but documented here so that:

1. Vault export/import remains stable across releases.
2. Search-index regeneration is well-defined.
3. Cross-attendee transcript clips have a known shape.

### `IdentityRecord` (IndexedDB store: `identities`)

| field            | type     | notes                                                   |
| ---------------- | -------- | ------------------------------------------------------- |
| `id`             | string   | UUIDv4, primary key                                      |
| `recipient`      | string   | age public recipient (`age1...`)                         |
| `encryptedKey`   | string   | age-encrypted private key, passphrase-derived (scrypt)   |
| `displayName`    | string   | user-chosen, never leaves device                         |
| `createdAt`      | number   | epoch ms                                                 |
| `schemaVersion`  | number   | starts at 1                                              |

### `ReflectionRecord` (IndexedDB store: `reflections`)

| field             | type           | notes                                                          |
| ----------------- | -------------- | -------------------------------------------------------------- |
| `id`              | string         | UUIDv4, primary key                                            |
| `identityId`      | string         | FK → `IdentityRecord.id`                                       |
| `audioRef`        | string         | OPFS path: `audio/<identityId>/<reflectionId>.webm`            |
| `encryptedBundle` | string         | age-encrypted JSON of `{transcript, embedding, metadata}`      |
| `createdAt`       | number         | epoch ms                                                       |
| `durationMs`      | number         | derived from audio                                             |
| `previewTag`      | string         | first 40 chars of transcript, **also encrypted**               |
| `schemaVersion`   | number         | starts at 1                                                    |

### `EncryptedBundle` (after decryption, in-memory only)

```ts
{
  transcript: string;          // full text from Whisper
  segments: Array<{ start: number; end: number; text: string }>;
  embedding: number[];         // 384-dim Float32 → number[] for JSON
  metadata: {
    language?: string;
    title?: string;
    tags?: string[];
  };
}
```

### `RecipientRecord` (IndexedDB store: `recipients`)

Other attendees you may share clips with.

| field           | type   | notes                                  |
| --------------- | ------ | -------------------------------------- |
| `id`            | string | UUIDv4                                 |
| `displayName`   | string |                                        |
| `recipient`     | string | their age public recipient             |
| `addedAt`       | number | epoch ms                               |
| `schemaVersion` | number |                                        |

### Vault export format (`*.castle-vault`)

A single age-encrypted file containing:

```json
{
  "version": 1,
  "exportedAt": 1747000000000,
  "identity": IdentityRecord,
  "reflections": ReflectionRecord[],
  "recipients": RecipientRecord[]
}
```

The export is encrypted to the user's own age recipient by default, so they can re-import it on another device by entering the passphrase.

## Consequences

- A migration must accompany any change to any of the above shapes.
- The DuckDB index is **derivable** from the IndexedDB stores; it can be rebuilt with no data loss.
- Cross-attendee sharing uses a sub-shape: only the `transcript`, `segments`, and `metadata.title` fields are placed in a clip, encrypted to the *recipient's* age key — never the embedding, never the audio.
