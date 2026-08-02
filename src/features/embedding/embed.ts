// Public embed() API.
//
// The underlying Worker is a lazily-created singleton shared by every caller
// (Recorder embeds a new reflection's transcript; SearchView embeds the query —
// and nothing stops those from overlapping, e.g. switching to the Search tab
// while a recording is still being processed in the background). Every call's
// postMessage carries a unique request id, and every response is tagged with
// the id it answers, so concurrent embed() calls can't have their results
// cross-delivered to the wrong caller. See docs/adr/0002-architecture-overview.md.

import { appError, ERROR_CODES } from '../../shared/utils/errors.js';
import { uuid } from '../../shared/utils/ids.js';
import EmbeddingWorker from './embedding.worker.ts?worker';

let worker: Worker | null = null;
function getWorker(): Worker {
  if (!worker) worker = new EmbeddingWorker();
  return worker;
}

export async function embed(text: string): Promise<Float32Array> {
  const w = getWorker();
  const id = uuid();
  return new Promise<Float32Array>((resolve, reject) => {
    const onMessage = (ev: MessageEvent) => {
      const data = ev.data as
        | { type: 'progress'; id: string; progress: number; file?: string }
        | { type: 'done'; id: string; embedding: Float32Array }
        | { type: 'error'; id: string; message: string };
      if (data.id !== id) return; // Response to a different in-flight call.
      if (data.type === 'done') {
        w.removeEventListener('message', onMessage);
        resolve(data.embedding);
      } else if (data.type === 'error') {
        w.removeEventListener('message', onMessage);
        reject(appError(ERROR_CODES.EMBEDDING_MODEL_FETCH_FAILED, new Error(data.message)));
      }
    };
    w.addEventListener('message', onMessage);
    w.postMessage({ type: 'embed', id, text });
  });
}
