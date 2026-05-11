// Minimal MediaRecorder wrapper. Picks the best supported audio mimeType,
// streams chunks into memory, and emits a single Blob on stop.

import { appError, ERROR_CODES } from '../../shared/utils/errors.js';

const CANDIDATE_MIMES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4',
];

function pickMime(): string {
  if (typeof MediaRecorder === 'undefined') {
    throw appError(ERROR_CODES.RECORDING_UNSUPPORTED);
  }
  for (const m of CANDIDATE_MIMES) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  throw appError(ERROR_CODES.RECORDING_UNSUPPORTED);
}

export interface ActiveRecording {
  stop(): Promise<{ blob: Blob; durationMs: number; mimeType: string }>;
  cancel(): void;
  onLevel(cb: (level: number) => void): void;
}

export async function startRecording(): Promise<ActiveRecording> {
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });
  } catch (cause) {
    throw appError(ERROR_CODES.RECORDING_PERMISSION_DENIED, cause);
  }
  const mimeType = pickMime();
  const recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 24000 });
  const chunks: Blob[] = [];
  const startedAt = performance.now();

  // Level meter via WebAudio for the UI
  const audioCtx = new AudioContext();
  const source = audioCtx.createMediaStreamSource(stream);
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;
  source.connect(analyser);
  const buf = new Uint8Array(analyser.frequencyBinCount);
  let levelCb: ((level: number) => void) | null = null;
  let rafHandle = 0;
  const tick = () => {
    analyser.getByteTimeDomainData(buf);
    let sum = 0;
    for (const b of buf) {
      const v = (b - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / buf.length);
    levelCb?.(rms);
    rafHandle = requestAnimationFrame(tick);
  };

  recorder.addEventListener('dataavailable', (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  });

  recorder.start(1000);
  rafHandle = requestAnimationFrame(tick);

  const cleanup = () => {
    cancelAnimationFrame(rafHandle);
    stream.getTracks().forEach((t) => t.stop());
    void audioCtx.close();
  };

  return {
    stop(): Promise<{ blob: Blob; durationMs: number; mimeType: string }> {
      return new Promise((resolve) => {
        recorder.addEventListener(
          'stop',
          () => {
            cleanup();
            const blob = new Blob(chunks, { type: mimeType });
            resolve({ blob, durationMs: performance.now() - startedAt, mimeType });
          },
          { once: true }
        );
        recorder.stop();
      });
    },
    cancel(): void {
      cleanup();
      try {
        recorder.stop();
      } catch {
        /* already stopped */
      }
    },
    onLevel(cb: (level: number) => void): void {
      levelCb = cb;
    },
  };
}
