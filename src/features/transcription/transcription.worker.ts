/// <reference lib="webworker" />

import { env, pipeline } from '@huggingface/transformers';

const REMOTE_HOST = (import.meta as unknown as { env?: { VITE_TRANSFORMERS_REMOTE_HOST?: string } })
  .env?.VITE_TRANSFORMERS_REMOTE_HOST;

env.allowLocalModels = false;
env.useBrowserCache = true;
if (REMOTE_HOST) env.remoteHost = REMOTE_HOST;

// transformers.js typings around dynamic pipelines are wide; we narrow via runtime checks.
type AnyPipe = (input: unknown, opts?: unknown) => Promise<unknown>;
let pipePromise: Promise<AnyPipe> | null = null;

function getPipe(): Promise<AnyPipe> {
  if (!pipePromise) {
    pipePromise = pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', {
      progress_callback: (p: { status: string; progress?: number; file?: string }) => {
        if (p.status === 'progress' && typeof p.progress === 'number') {
          (self as unknown as Worker).postMessage({
            type: 'progress',
            kind: 'download',
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
  type: 'transcribe';
  audioPcm: Float32Array;
  sampleRate: number;
}

self.addEventListener('message', (ev: MessageEvent<InMessage>) => {
  const msg = ev.data;
  if (msg.type !== 'transcribe') return;
  void run(msg);
});

async function run(msg: InMessage): Promise<void> {
  try {
    const pipe = await getPipe();
    const result = (await pipe(msg.audioPcm, {
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: true,
      sampling_rate: msg.sampleRate,
    })) as { text: string; chunks?: Array<{ timestamp: [number, number]; text: string }> };

    const segments =
      result.chunks?.map((c) => ({
        start: c.timestamp[0] ?? 0,
        end: c.timestamp[1] ?? c.timestamp[0] ?? 0,
        text: c.text,
      })) ?? [];

    (self as unknown as Worker).postMessage({
      type: 'done',
      text: result.text,
      segments,
    });
  } catch (cause) {
    (self as unknown as Worker).postMessage({
      type: 'error',
      message: cause instanceof Error ? cause.message : String(cause),
    });
  }
}
