import { describe, expect, it, vi } from 'vitest';
import {
  appError,
  assert,
  ERROR_CODES,
  handleErrorOrLog,
  isAppError,
} from '../../src/shared/utils/errors.js';

describe('errors', () => {
  it('appError is identifiable via isAppError', () => {
    const e = appError(ERROR_CODES.GENERIC_UNKNOWN);
    expect(isAppError(e)).toBe(true);
    expect(isAppError(new Error('plain'))).toBe(false);
    expect(isAppError(null)).toBe(false);
  });

  it('assert throws an AppError with the provided code', () => {
    try {
      assert(false, ERROR_CODES.IDENTITY_NO_ACTIVE);
      throw new Error('should not reach');
    } catch (e) {
      expect(isAppError(e)).toBe(true);
      if (isAppError(e)) expect(e.code).toBe(ERROR_CODES.IDENTITY_NO_ACTIVE);
    }
  });

  it('handleErrorOrLog returns the value on success and undefined on failure', async () => {
    const ok = await handleErrorOrLog(Promise.resolve(42), {
      errCode: ERROR_CODES.GENERIC_UNKNOWN,
    });
    expect(ok).toBe(42);

    const consoleErr = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const bad = await handleErrorOrLog(Promise.reject(new Error('boom')), {
      errCode: ERROR_CODES.GENERIC_UNKNOWN,
    });
    expect(bad).toBeUndefined();
    consoleErr.mockRestore();
  });
});
