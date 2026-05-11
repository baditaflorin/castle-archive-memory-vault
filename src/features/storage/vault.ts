// High-level vault operations. Combines crypto + IndexedDB + OPFS.

import { vaultDb } from './db.js';
import { audioPath, writeAudio, readAudio, deleteAudio } from './opfs.js';
import { encryptJsonForIdentity, decryptJsonForIdentity } from '../identity/crypto.js';
import { uuid } from '../../shared/utils/ids.js';
import { SCHEMA_VERSION } from '../../shared/types.js';
import type {
  DecryptedReflection,
  EncryptedBundlePayload,
  IdentityRecord,
  ReflectionRecord,
} from '../../shared/types.js';
import type { ActiveIdentity } from '../identity/identity.js';

export interface PutReflectionInput {
  identity: ActiveIdentity;
  audio: Blob;
  durationMs: number;
  payload: EncryptedBundlePayload;
}

export interface VaultApi {
  put(input: PutReflectionInput): Promise<ReflectionRecord>;
  list(identityId: string): Promise<ReflectionRecord[]>;
  get(identity: ActiveIdentity, reflectionId: string): Promise<DecryptedReflection>;
  decryptAll(identity: ActiveIdentity): Promise<DecryptedReflection[]>;
  remove(reflectionId: string, identityId: string): Promise<void>;
  audioBlob(reflectionId: string, identityId: string): Promise<Blob>;
  identities(): Promise<IdentityRecord[]>;
}

class Vault implements VaultApi {
  async put({
    identity,
    audio,
    durationMs,
    payload,
  }: PutReflectionInput): Promise<ReflectionRecord> {
    const reflectionId = uuid();
    const audioRef = audioPath(identity.record.id, reflectionId);
    await writeAudio(identity.record.id, reflectionId, audio);

    const encryptedBundle = await encryptJsonForIdentity(payload, identity.record.recipient);
    const previewPayload = payload.transcript.slice(0, 40);
    const encryptedPreviewTag = await encryptJsonForIdentity(
      { preview: previewPayload },
      identity.record.recipient
    );

    const record: ReflectionRecord = {
      id: reflectionId,
      identityId: identity.record.id,
      audioRef,
      encryptedBundle,
      createdAt: Date.now(),
      durationMs,
      encryptedPreviewTag,
      schemaVersion: SCHEMA_VERSION,
    };

    const db = await vaultDb();
    await db.put('reflections', record);
    return record;
  }

  async list(identityId: string): Promise<ReflectionRecord[]> {
    const db = await vaultDb();
    const index = db.transaction('reflections').store.index('byIdentity');
    const all = await index.getAll(IDBKeyRange.only(identityId));
    all.sort((a, b) => b.createdAt - a.createdAt);
    return all;
  }

  async get(identity: ActiveIdentity, reflectionId: string): Promise<DecryptedReflection> {
    const db = await vaultDb();
    const rec = await db.get('reflections', reflectionId);
    if (!rec) throw new Error('reflection-not-found');
    const payload = await decryptJsonForIdentity<EncryptedBundlePayload>(
      rec.encryptedBundle,
      identity.privateKey
    );
    return {
      id: rec.id,
      identityId: rec.identityId,
      audioRef: rec.audioRef,
      createdAt: rec.createdAt,
      durationMs: rec.durationMs,
      payload,
    };
  }

  async decryptAll(identity: ActiveIdentity): Promise<DecryptedReflection[]> {
    const records = await this.list(identity.record.id);
    const out: DecryptedReflection[] = [];
    for (const rec of records) {
      try {
        const payload = await decryptJsonForIdentity<EncryptedBundlePayload>(
          rec.encryptedBundle,
          identity.privateKey
        );
        out.push({
          id: rec.id,
          identityId: rec.identityId,
          audioRef: rec.audioRef,
          createdAt: rec.createdAt,
          durationMs: rec.durationMs,
          payload,
        });
      } catch {
        // Skip records that fail to decrypt (likely an old schema; logged elsewhere).
      }
    }
    return out;
  }

  async remove(reflectionId: string, identityId: string): Promise<void> {
    const db = await vaultDb();
    await db.delete('reflections', reflectionId);
    await deleteAudio(audioPath(identityId, reflectionId));
  }

  async audioBlob(reflectionId: string, identityId: string): Promise<Blob> {
    return readAudio(audioPath(identityId, reflectionId));
  }

  async identities(): Promise<IdentityRecord[]> {
    const db = await vaultDb();
    return db.getAll('identities');
  }
}

export const vault: VaultApi = new Vault();
