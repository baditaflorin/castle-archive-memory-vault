// Regression test for the shared-worker cross-talk bug in embed().
//
// embed.ts lazily creates ONE Worker and reuses it for every call — e.g. the
// Recorder embeds a just-recorded transcript while SearchView can embed a
// search query on the very same worker if the user switches tabs mid-save.
// Before the fix, every embed() call attached a 'message' listener with no
// way to tell "my" response apart from anyone else's, so whichever 'done'
// message arrived first satisfied every pending promise — silently
// attaching the wrong embedding vector to a saved reflection or to a search
// query. This test drives a fake Worker that intentionally answers two
// concurrent embed() calls OUT OF ORDER and asserts each caller still gets
// its own result.

import { describe, expect, it, vi } from 'vitest';

class FakeEmbeddingWorker extends EventTarget {
  postMessage(msg: { type: 'embed'; id: string; text: string }): void {
    // Defer so both calls are in flight before either resolves, and reply
    // in the OPPOSITE order from which requests arrived.
    queueMicrotask(() => {
      pending.push(msg);
      if (pending.length === 2) {
        const [first, second] = pending;
        // Reply to the *second* request first, to prove routing isn't
        // relying on message arrival order.
        respond(second);
        respond(first);
      }
    });
  }
  terminate(): void {}
}

const pending: Array<{ type: 'embed'; id: string; text: string }> = [];
let activeWorker: FakeEmbeddingWorker | null = null;

function respond(msg: { id: string; text: string }): void {
  // Deterministic "embedding" derived from the input text so we can verify
  // each caller got back the vector for the text IT sent.
  const value = msg.text.length;
  activeWorker?.dispatchEvent(
    Object.assign(new Event('message'), {
      data: { type: 'done', id: msg.id, embedding: Float32Array.from([value]) },
    })
  );
}

vi.mock('../../src/features/embedding/embedding.worker.ts?worker', () => ({
  default: class {
    constructor() {
      const w = new FakeEmbeddingWorker();
      activeWorker = w;
      return w as unknown as this;
    }
  },
}));

describe('embed() concurrency', () => {
  it('routes each concurrent call to its own response, not whichever arrives first', async () => {
    const { embed } = await import('../../src/features/embedding/embed.js');

    const [a, b] = await Promise.all([embed('short'), embed('a much longer piece of text')]);

    expect(a[0]).toBe('short'.length);
    expect(b[0]).toBe('a much longer piece of text'.length);
  });
});
