import { describe, expect, it } from 'vitest';
import { exportClip } from '../../src/features/export/exporter.js';
import type { DecryptedReflection } from '../../src/shared/types.js';

const sample: DecryptedReflection = {
  id: 'r1',
  identityId: 'i1',
  audioRef: 'audio/i1/r1.webm',
  createdAt: Date.UTC(2026, 4, 11, 9, 0, 0),
  durationMs: 65_000,
  payload: {
    transcript: 'I felt the wind on the parapet this morning. It was cold but honest.',
    segments: [
      { start: 0, end: 5, text: 'I felt the wind on the parapet this morning.' },
      { start: 5, end: 10, text: 'It was cold but honest.' },
    ],
    embedding: new Array(384).fill(0),
    metadata: { title: 'Parapet morning', language: 'en' },
  },
};

describe('exporter', () => {
  it('produces a markdown blob with frontmatter and the transcript', async () => {
    const { blob, filename } = await exportClip(sample, 'markdown');
    expect(filename).toBe('parapet-morning.md');
    const text = await blob.text();
    expect(text).toContain('---');
    expect(text).toContain('title: "Parapet morning"');
    expect(text).toContain('I felt the wind on the parapet');
    expect(text).toContain('## Timestamped segments');
  });

  it('produces an HTML blob with marked-rendered body', async () => {
    const { blob, filename } = await exportClip(sample, 'html');
    expect(filename).toBe('parapet-morning.html');
    const text = await blob.text();
    expect(text).toContain('<!doctype html>');
    expect(text).toContain('<h1');
    expect(text).toContain('Parapet morning');
  });
});
