// Origin Private File System helpers — audio blobs only.
// Path scheme: audio/<identityId>/<reflectionId>.webm

import { appError, ERROR_CODES } from '../../shared/utils/errors.js';

export function opfsSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.storage?.getDirectory;
}

async function root(): Promise<FileSystemDirectoryHandle> {
  if (!opfsSupported()) throw appError(ERROR_CODES.STORAGE_OPFS_UNSUPPORTED);
  return navigator.storage.getDirectory();
}

async function ensureDir(parts: string[]): Promise<FileSystemDirectoryHandle> {
  let dir = await root();
  for (const part of parts) {
    dir = await dir.getDirectoryHandle(part, { create: true });
  }
  return dir;
}

export function audioPath(identityId: string, reflectionId: string): string {
  return `audio/${identityId}/${reflectionId}.webm`;
}

export async function writeAudio(
  identityId: string,
  reflectionId: string,
  blob: Blob
): Promise<string> {
  try {
    const dir = await ensureDir(['audio', identityId]);
    const fileHandle = await dir.getFileHandle(`${reflectionId}.webm`, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
    return audioPath(identityId, reflectionId);
  } catch (cause) {
    throw appError(ERROR_CODES.STORAGE_OPFS_WRITE_FAILED, cause, { identityId, reflectionId });
  }
}

export async function readAudio(path: string): Promise<Blob> {
  try {
    const parts = path.split('/');
    const filename = parts.pop()!;
    let dir = await root();
    for (const part of parts) dir = await dir.getDirectoryHandle(part, { create: false });
    const handle = await dir.getFileHandle(filename, { create: false });
    return handle.getFile();
  } catch (cause) {
    throw appError(ERROR_CODES.STORAGE_OPFS_READ_FAILED, cause, { path });
  }
}

export async function deleteAudio(path: string): Promise<void> {
  try {
    const parts = path.split('/');
    const filename = parts.pop()!;
    let dir = await root();
    for (const part of parts) dir = await dir.getDirectoryHandle(part, { create: false });
    await dir.removeEntry(filename);
  } catch {
    // If it's already gone, fine.
  }
}

export async function estimateUsage(): Promise<{ usage: number; quota: number } | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null;
  const est = await navigator.storage.estimate();
  return { usage: est.usage ?? 0, quota: est.quota ?? 0 };
}
