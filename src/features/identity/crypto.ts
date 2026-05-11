// age-encryption wrappers. All vault crypto flows through this module.
// See docs/adr/0014-error-handling.md, docs/adr/0006-wasm-modules.md.

import { Decrypter, Encrypter, generateIdentity, identityToRecipient } from 'age-encryption';
import { appError, ERROR_CODES } from '../../shared/utils/errors.js';
import { fromBase64, toBase64, utf8Decode, utf8Encode } from '../../shared/utils/bytes.js';

export interface RawIdentity {
  identity: string;
  recipient: string;
}

export async function generateAgeIdentity(): Promise<RawIdentity> {
  const identity = await generateIdentity();
  const recipient = await identityToRecipient(identity);
  return { identity, recipient };
}

export async function encryptToRecipients(
  plaintext: Uint8Array,
  recipients: string[]
): Promise<Uint8Array> {
  const enc = new Encrypter();
  for (const r of recipients) enc.addRecipient(r);
  return enc.encrypt(plaintext);
}

export async function encryptWithPassphrase(
  plaintext: Uint8Array,
  passphrase: string
): Promise<Uint8Array> {
  if (passphrase.length < 8) {
    throw appError(ERROR_CODES.IDENTITY_PASSPHRASE_TOO_SHORT, undefined, {
      length: passphrase.length,
    });
  }
  const enc = new Encrypter();
  enc.setPassphrase(passphrase);
  return enc.encrypt(plaintext);
}

export async function decryptWithIdentity(
  ciphertext: Uint8Array,
  identity: string
): Promise<Uint8Array> {
  try {
    const dec = new Decrypter();
    dec.addIdentity(identity);
    return await dec.decrypt(ciphertext);
  } catch (cause) {
    throw appError(ERROR_CODES.IDENTITY_DECRYPT_FAILED, cause);
  }
}

export async function decryptWithPassphrase(
  ciphertext: Uint8Array,
  passphrase: string
): Promise<Uint8Array> {
  try {
    const dec = new Decrypter();
    dec.addPassphrase(passphrase);
    return await dec.decrypt(ciphertext);
  } catch (cause) {
    throw appError(ERROR_CODES.IDENTITY_DECRYPT_FAILED, cause);
  }
}

export async function encryptJsonForIdentity<T>(payload: T, recipient: string): Promise<string> {
  const bytes = utf8Encode(JSON.stringify(payload));
  const ct = await encryptToRecipients(bytes, [recipient]);
  return toBase64(ct);
}

export async function decryptJsonForIdentity<T>(
  ciphertextB64: string,
  identity: string
): Promise<T> {
  const ct = fromBase64(ciphertextB64);
  const pt = await decryptWithIdentity(ct, identity);
  return JSON.parse(utf8Decode(pt)) as T;
}

export async function encryptStringWithPassphrase(
  plaintext: string,
  passphrase: string
): Promise<string> {
  const ct = await encryptWithPassphrase(utf8Encode(plaintext), passphrase);
  return toBase64(ct);
}

export async function decryptStringWithPassphrase(
  ciphertextB64: string,
  passphrase: string
): Promise<string> {
  const pt = await decryptWithPassphrase(fromBase64(ciphertextB64), passphrase);
  return utf8Decode(pt);
}
