// Identity lifecycle: create, list, unlock, lock. Persists to IndexedDB.
// The in-memory "active" identity holds the decrypted private key for the session.

import { createContext, useContext } from 'react';
import { vaultDb } from '../storage/db.js';
import {
  decryptStringWithPassphrase,
  encryptStringWithPassphrase,
  generateAgeIdentity,
} from './crypto.js';
import { uuid } from '../../shared/utils/ids.js';
import { SCHEMA_VERSION } from '../../shared/types.js';
import type { IdentityRecord } from '../../shared/types.js';
import { appError, ERROR_CODES } from '../../shared/utils/errors.js';

export interface ActiveIdentity {
  record: IdentityRecord;
  // Decrypted age private-key string ("AGE-SECRET-KEY-…"). In memory only.
  privateKey: string;
}

export interface IdentityActions {
  list(): Promise<IdentityRecord[]>;
  create(opts: { displayName: string; passphrase: string }): Promise<ActiveIdentity>;
  unlock(opts: { identityId: string; passphrase: string }): Promise<ActiveIdentity>;
  lock(): void;
  delete(identityId: string): Promise<void>;
}

class IdentityStore implements IdentityActions {
  async list(): Promise<IdentityRecord[]> {
    const db = await vaultDb();
    return db.getAll('identities');
  }

  async create({
    displayName,
    passphrase,
  }: {
    displayName: string;
    passphrase: string;
  }): Promise<ActiveIdentity> {
    const { identity, recipient } = await generateAgeIdentity();
    const encryptedKey = await encryptStringWithPassphrase(identity, passphrase);
    const record: IdentityRecord = {
      id: uuid(),
      recipient,
      encryptedKey,
      displayName: displayName.trim() || 'Anonymous',
      createdAt: Date.now(),
      schemaVersion: SCHEMA_VERSION,
    };
    const db = await vaultDb();
    await db.put('identities', record);
    try {
      await navigator.storage?.persist?.();
    } catch {
      /* persistence is a hint, not required */
    }
    return { record, privateKey: identity };
  }

  async unlock({
    identityId,
    passphrase,
  }: {
    identityId: string;
    passphrase: string;
  }): Promise<ActiveIdentity> {
    const db = await vaultDb();
    const record = await db.get('identities', identityId);
    if (!record) throw appError(ERROR_CODES.IDENTITY_NO_ACTIVE, undefined, { id: identityId });
    const privateKey = await decryptStringWithPassphrase(record.encryptedKey, passphrase);
    return { record, privateKey };
  }

  lock(): void {
    // No-op at the data layer — the React provider drops the in-memory ref.
  }

  async delete(identityId: string): Promise<void> {
    const db = await vaultDb();
    const tx = db.transaction(['identities', 'reflections'], 'readwrite');
    await tx.objectStore('identities').delete(identityId);
    const index = tx.objectStore('reflections').index('byIdentity');
    let cursor = await index.openCursor(IDBKeyRange.only(identityId));
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
    await tx.done;
  }
}

export const identityStore = new IdentityStore();

export interface IdentityContextValue {
  active: ActiveIdentity | null;
  setActive(ai: ActiveIdentity | null): void;
}

export const IdentityContext = createContext<IdentityContextValue | null>(null);

export function useIdentity(): IdentityContextValue {
  const ctx = useContext(IdentityContext);
  if (!ctx) throw new Error('useIdentity must be used inside <IdentityProvider>');
  return ctx;
}

export function useActiveIdentity(): ActiveIdentity {
  const { active } = useIdentity();
  if (!active) throw appError(ERROR_CODES.IDENTITY_NO_ACTIVE);
  return active;
}
