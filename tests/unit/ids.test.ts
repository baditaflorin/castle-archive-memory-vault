import { describe, expect, it } from 'vitest';
import { uuid } from '../../src/shared/utils/ids.js';

describe('uuid', () => {
  it('returns a string of the v4 shape', () => {
    const u = uuid();
    expect(u).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('returns distinct values on each call', () => {
    const set = new Set(Array.from({ length: 200 }, () => uuid()));
    expect(set.size).toBe(200);
  });
});
