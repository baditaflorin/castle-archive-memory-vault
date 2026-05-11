import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import type { IdentityRecord, RecipientRecord, ReflectionRecord } from '../../shared/types.js';
import { appError, ERROR_CODES } from '../../shared/utils/errors.js';

export interface VaultSchema extends DBSchema {
  identities: {
    key: string;
    value: IdentityRecord;
  };
  reflections: {
    key: string;
    value: ReflectionRecord;
    indexes: {
      byIdentity: string;
      byCreatedAt: number;
    };
  };
  recipients: {
    key: string;
    value: RecipientRecord;
  };
  prefs: {
    key: string;
    value: { key: string; value: string };
  };
}

const DB_NAME = 'castle-archive-vault';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<VaultSchema>> | null = null;

export function vaultDb(): Promise<IDBPDatabase<VaultSchema>> {
  if (dbPromise) return dbPromise;
  dbPromise = openDB<VaultSchema>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore('identities', { keyPath: 'id' });
        const refl = db.createObjectStore('reflections', { keyPath: 'id' });
        refl.createIndex('byIdentity', 'identityId');
        refl.createIndex('byCreatedAt', 'createdAt');
        db.createObjectStore('recipients', { keyPath: 'id' });
        db.createObjectStore('prefs', { keyPath: 'key' });
      }
    },
    blocked() {
      // A second tab is upgrading; keep waiting.
    },
    terminated() {
      dbPromise = null;
    },
  }).catch((cause) => {
    dbPromise = null;
    throw appError(ERROR_CODES.STORAGE_DB_OPEN_FAILED, cause);
  });
  return dbPromise;
}

export async function getPref(key: string): Promise<string | undefined> {
  const db = await vaultDb();
  const entry = await db.get('prefs', key);
  return entry?.value;
}

export async function setPref(key: string, value: string): Promise<void> {
  const db = await vaultDb();
  await db.put('prefs', { key, value });
}
