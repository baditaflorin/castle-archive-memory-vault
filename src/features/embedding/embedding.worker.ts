/// <reference lib="webworker" />

import { env, pipeline } from '@huggingface/transformers';

const REMOTE_HOST = (import.meta as unknown as { env?: { VITE_TRANSFORMERS_REMOTE_HOST?: string } })
  .env?.VITE_TRANSFORMERS_REMOTE_HOST;

env.allowLocalModels = false;
env.useBrowserCache = true;
if (REMOTE_HOST) env.remoteHost = REMOTE_HOST;

type AnyPipe = (input: unknown, opts?: unknown) => Promise<unknown>;
let pipePromise: Promise<AnyPipe> | null = null;

function getPipe(): Promise<AnyPipe> {
  if (!pipePromise) {
    pipePromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      progress_callback: (p: { status: string; progress?: number; file?: string }) => {
        if (p.status === 'progress' && typeof p.progress === 'number') {
          (self as unknown as Worker).postMessage({
            type: 'progress',
            progress: p.progress / 100,
            file: p.file ?? '',
          });
        }
      },
    }) as unknown as Promise<AnyPipe>;
  }
  return pipePromise;
}

interface InMessage {
  type: 'embed';
  id: string;
  text: string;
}

self.addEventListener('message', (ev: MessageEvent<InMessage>) => {
  if (ev.data.type !== 'embed') return;
  void run(ev.data.id, ev.data.text);
});

async function run(id: string, text: string): Promise<void> {
  try {
    const pipe = await getPipe();
    const output = (await pipe(text, { pooling: 'mean', normalize: true })) as {
      data: Float32Array | number[];
    };
    const arr =
      output.data instanceof Float32Array
        ? output.data
        : Float32Array.from(output.data as number[]);
    (self as unknown as Worker).postMessage({ type: 'done', id, embedding: arr }, [arr.buffer]);
  } catch (cause) {
    (self as unknown as Worker).postMessage({
      type: 'error',
      id,
      message: cause instanceof Error ? cause.message : String(cause),
    });
  }
}
