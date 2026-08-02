// Public transcribe() API. Hides the worker behind a promise + progress callback.
//
// The underlying Worker is a lazily-created singleton, and nothing prevents a
// second transcribe() call from starting while a prior one is still in flight
// (e.g. the recorder's background save continuing after the user navigates
// away and starts another recording). Every request carries a unique id and
// every 'done'/'error' response echoes it back, so this call's promise only
// ever resolves/rejects from its own response — never one meant for a
// concurrent caller. Model-download 'progress' messages have no per-request
// meaning (the model is loaded once, shared by all callers) and are
// broadcast to every listener unfiltered.

import { appError, ERROR_CODES } from '../../shared/utils/errors.js';
import { uuid } from '../../shared/utils/ids.js';
import type { ReflectionSegment } from '../../shared/types.js';
import TranscriptionWorker from './transcription.worker.ts?worker';

export interface TranscriptionProgress {
  kind: 'download' | 'transcribe';
  progress: number;
  file?: string;
}

export interface TranscriptionResult {
  text: string;
  segments: ReflectionSegment[];
  language?: string;
}

let worker: Worker | null = null;
function getWorker(): Worker {
  if (!worker) worker = new TranscriptionWorker();
  return worker;
}

async function blobToPcm(blob: Blob): Promise<{ pcm: Float32Array; sampleRate: number }> {
  const buffer = await blob.arrayBuffer();
  const audioCtx = new AudioContext({ sampleRate: 16000 });
  try {
    const decoded = await audioCtx.decodeAudioData(buffer.slice(0));
    const channel = decoded.getChannelData(0);
    // Mix down if stereo: average channels into channel 0
    if (decoded.numberOfChannels > 1) {
      const ch1 = decoded.getChannelData(1);
      const mixed = new Float32Array(channel.length);
      for (let i = 0; i < channel.length; i++) mixed[i] = (channel[i] + ch1[i]) / 2;
      return { pcm: mixed, sampleRate: decoded.sampleRate };
    }
    return { pcm: channel.slice(), sampleRate: decoded.sampleRate };
  } finally {
    await audioCtx.close();
  }
}

export async function transcribe(
  audio: Blob,
  onProgress?: (p: TranscriptionProgress) => void
): Promise<TranscriptionResult> {
  const { pcm, sampleRate } = await blobToPcm(audio);
  const w = getWorker();
  const id = uuid();

  return new Promise<TranscriptionResult>((resolve, reject) => {
    const onMessage = (ev: MessageEvent) => {
      const data = ev.data as
        | { type: 'progress'; kind: 'download' | 'transcribe'; progress: number; file?: string }
        | {
            type: 'done';
            id: string;
            text: string;
            segments: ReflectionSegment[];
            language?: string;
          }
        | { type: 'error'; id: string; message: string };
      if (data.type === 'progress') {
        // Broadcast model-download progress — shared by every in-flight caller.
        onProgress?.({ kind: data.kind, progress: data.progress, file: data.file });
        return;
      }
      if (data.id !== id) return; // Response to a different in-flight call.
      if (data.type === 'done') {
        w.removeEventListener('message', onMessage);
        resolve({ text: data.text.trim(), segments: data.segments, language: data.language });
      } else if (data.type === 'error') {
        w.removeEventListener('message', onMessage);
        reject(appError(ERROR_CODES.TRANSCRIPTION_MODEL_FETCH_FAILED, new Error(data.message)));
      }
    };
    w.addEventListener('message', onMessage);
    w.postMessage({ type: 'transcribe', id, audioPcm: pcm, sampleRate }, [pcm.buffer]);
  });
}
