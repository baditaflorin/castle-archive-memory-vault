// Cross-feature types. See docs/adr/0004-static-data-contract.md.

export const SCHEMA_VERSION = 1 as const;

export interface IdentityRecord {
  id: string;
  recipient: string;
  encryptedKey: string;
  displayName: string;
  createdAt: number;
  schemaVersion: number;
}

export interface ReflectionRecord {
  id: string;
  identityId: string;
  audioRef: string;
  encryptedBundle: string;
  createdAt: number;
  durationMs: number;
  encryptedPreviewTag: string;
  schemaVersion: number;
}

export interface RecipientRecord {
  id: string;
  displayName: string;
  recipient: string;
  addedAt: number;
  schemaVersion: number;
}

export interface ReflectionSegment {
  start: number;
  end: number;
  text: string;
}

export interface EncryptedBundlePayload {
  transcript: string;
  segments: ReflectionSegment[];
  embedding: number[];
  metadata: {
    language?: string;
    title?: string;
    tags?: string[];
  };
}

export interface DecryptedReflection {
  id: string;
  identityId: string;
  audioRef: string;
  createdAt: number;
  durationMs: number;
  payload: EncryptedBundlePayload;
}

export type ExportFormat = 'markdown' | 'html';

export interface VaultExportV1 {
  version: 1;
  exportedAt: number;
  identity: IdentityRecord;
  reflections: ReflectionRecord[];
  recipients: RecipientRecord[];
}
