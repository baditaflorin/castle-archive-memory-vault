// Public embed() API.

import { appError, ERROR_CODES } from '../../shared/utils/errors.js';
import EmbeddingWorker from './embedding.worker.ts?worker';

let worker: Worker | null = null;
function getWorker(): Worker {
  if (!worker) worker = new EmbeddingWorker();
  return worker;
}

export async function embed(text: string): Promise<Float32Array> {
  const w = getWorker();
  return new Promise<Float32Array>((resolve, reject) => {
    const onMessage = (ev: MessageEvent) => {
      const data = ev.data as
        | { type: 'progress'; progress: number; file?: string }
        | { type: 'done'; embedding: Float32Array }
        | { type: 'error'; message: string };
      if (data.type === 'done') {
        w.removeEventListener('message', onMessage);
        resolve(data.embedding);
      } else if (data.type === 'error') {
        w.removeEventListener('message', onMessage);
        reject(appError(ERROR_CODES.EMBEDDING_MODEL_FETCH_FAILED, new Error(data.message)));
      }
    };
    w.addEventListener('message', onMessage);
    w.postMessage({ type: 'embed', text });
  });
}
