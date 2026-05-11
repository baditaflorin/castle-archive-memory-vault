import { describe, expect, it } from 'vitest';
import {
  decryptJsonForIdentity,
  decryptStringWithPassphrase,
  encryptJsonForIdentity,
  encryptStringWithPassphrase,
  generateAgeIdentity,
} from '../../src/features/identity/crypto.js';
import { ERROR_CODES, isAppError } from '../../src/shared/utils/errors.js';

describe('crypto', () => {
  it('round-trips JSON via age identity', async () => {
    const { identity, recipient } = await generateAgeIdentity();
    const payload = { transcript: 'hello world', tags: ['a', 'b'] };
    const ct = await encryptJsonForIdentity(payload, recipient);
    const decrypted = await decryptJsonForIdentity<typeof payload>(ct, identity);
    expect(decrypted).toEqual(payload);
  });

  it('round-trips string via passphrase', async () => {
    const ct = await encryptStringWithPassphrase('a deep secret', 'correct-horse-battery');
    const pt = await decryptStringWithPassphrase(ct, 'correct-horse-battery');
    expect(pt).toBe('a deep secret');
  });

  it('rejects short passphrases with a stable error code', async () => {
    let caught: unknown;
    try {
      await encryptStringWithPassphrase('x', 'short');
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeDefined();
    expect(isAppError(caught) && caught.code).toBe(ERROR_CODES.IDENTITY_PASSPHRASE_TOO_SHORT);
  });

  it('fails to decrypt with wrong passphrase', async () => {
    const ct = await encryptStringWithPassphrase('payload', 'right-passphrase-1');
    let caught: unknown;
    try {
      await decryptStringWithPassphrase(ct, 'wrong-passphrase-1');
    } catch (e) {
      caught = e;
    }
    expect(isAppError(caught) && caught.code).toBe(ERROR_CODES.IDENTITY_DECRYPT_FAILED);
  });
});
