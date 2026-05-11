import { useEffect, useRef, useState } from 'react';
import { Button } from '../../shared/components/Button.js';
import { useToast } from '../../shared/components/Toast.js';
import { startRecording } from './media.js';
import type { ActiveRecording } from './media.js';
import { formatDuration } from '../../shared/utils/time.js';
import { transcribe } from '../transcription/transcribe.js';
import { embed } from '../embedding/embed.js';
import { vault } from '../storage/vault.js';
import { useActiveIdentity } from '../identity/identity.js';
import { logger } from '../../shared/utils/logger.js';
import { isAppError } from '../../shared/utils/errors.js';

type Stage = 'idle' | 'recording' | 'transcribing' | 'embedding' | 'saving' | 'done';

interface Props {
  onSaved(): void;
}

export function Recorder({ onSaved }: Props) {
  const identity = useActiveIdentity();
  const toast = useToast();
  const [stage, setStage] = useState<Stage>('idle');
  const [level, setLevel] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [progressNote, setProgressNote] = useState('');
  const [transcriptPreview, setTranscriptPreview] = useState('');
  const activeRef = useRef<ActiveRecording | null>(null);
  const tickRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      activeRef.current?.cancel();
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, []);

  async function start(): Promise<void> {
    try {
      const rec = await startRecording();
      activeRef.current = rec;
      rec.onLevel(setLevel);
      startRef.current = performance.now();
      tickRef.current = window.setInterval(() => {
        setElapsed(performance.now() - startRef.current);
      }, 200);
      setStage('recording');
    } catch (e) {
      const code = isAppError(e) ? e.code : 'recording/start-failed';
      toast.push('error', `Microphone unavailable (${code}).`);
    }
  }

  async function stop(): Promise<void> {
    const rec = activeRef.current;
    if (!rec) return;
    if (tickRef.current) window.clearInterval(tickRef.current);
    setStage('transcribing');
    setProgressNote('Loading Whisper (first time may take a minute)…');
    try {
      const { blob, durationMs } = await rec.stop();
      activeRef.current = null;

      const transcription = await transcribe(blob, (p) => {
        if (p.kind === 'download')
          setProgressNote(`Model download ${Math.round(p.progress * 100)}%`);
        else if (p.kind === 'transcribe')
          setProgressNote(`Transcribing — ${Math.round(p.progress * 100)}%`);
      });
      setTranscriptPreview(transcription.text.slice(0, 200));

      setStage('embedding');
      setProgressNote('Embedding (~25 MB on first use)…');
      const embedding = await embed(transcription.text);

      setStage('saving');
      setProgressNote('Encrypting and saving to your vault…');
      const titleGuess = transcription.text.split(/[.!?\n]/)[0]?.slice(0, 60) ?? '';
      await vault.put({
        identity,
        audio: blob,
        durationMs,
        payload: {
          transcript: transcription.text,
          segments: transcription.segments,
          embedding: Array.from(embedding),
          metadata: {
            language: transcription.language,
            title: titleGuess,
          },
        },
      });
      setStage('done');
      toast.push('success', 'Reflection sealed in your vault.');
      onSaved();
      setTimeout(() => {
        setStage('idle');
        setTranscriptPreview('');
        setProgressNote('');
        setElapsed(0);
      }, 1500);
    } catch (e) {
      const code = isAppError(e) ? e.code : 'recording/save-failed';
      logger.error(code);
      toast.push('error', `Could not save reflection (${code}).`);
      setStage('idle');
    }
  }

  function cancel(): void {
    activeRef.current?.cancel();
    activeRef.current = null;
    if (tickRef.current) window.clearInterval(tickRef.current);
    setStage('idle');
    setElapsed(0);
  }

  const busyAfterStop = stage !== 'idle' && stage !== 'recording';

  return (
    <section className="rounded-lg border border-stone-800 bg-stone-850/60 p-6">
      <div className="flex flex-col items-center gap-6">
        <h2 className="font-serif text-2xl text-parchment-100">Today&rsquo;s reflection</h2>

        <div
          aria-hidden
          className="relative flex h-32 w-32 items-center justify-center"
          style={{
            filter: stage === 'recording' ? 'drop-shadow(0 0 14px rgba(194,169,88,0.45))' : 'none',
          }}
        >
          <div
            className="absolute inset-0 rounded-full bg-parchment-500/20"
            style={{
              transform: `scale(${1 + (stage === 'recording' ? level * 2 : 0)})`,
              transition: 'transform 80ms linear',
            }}
          />
          <div className="z-10 flex h-24 w-24 items-center justify-center rounded-full bg-parchment-500 text-stone-900 shadow-inner">
            <svg viewBox="0 0 24 24" className="h-10 w-10" aria-hidden>
              <path
                fill="currentColor"
                d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11Z"
              />
            </svg>
          </div>
        </div>

        <div className="text-center font-mono text-2xl text-parchment-100" aria-live="polite">
          {stage === 'recording' ? formatDuration(elapsed) : '0:00'}
        </div>

        {progressNote && (
          <p className="text-center text-sm text-parchment-200/80" aria-live="polite">
            {progressNote}
          </p>
        )}

        {transcriptPreview && busyAfterStop && (
          <blockquote className="max-w-prose rounded-md bg-stone-900/60 p-3 text-sm italic text-parchment-200/90">
            &ldquo;{transcriptPreview}&hellip;&rdquo;
          </blockquote>
        )}

        <div className="flex gap-3">
          {stage === 'idle' && (
            <Button onClick={start} aria-label="Start recording">
              Start recording
            </Button>
          )}
          {stage === 'recording' && (
            <>
              <Button onClick={stop} variant="primary" aria-label="Stop and save">
                Stop &amp; save
              </Button>
              <Button onClick={cancel} variant="ghost" aria-label="Cancel">
                Cancel
              </Button>
            </>
          )}
          {busyAfterStop && (
            <Button loading disabled variant="secondary">
              {stage === 'transcribing'
                ? 'Transcribing…'
                : stage === 'embedding'
                  ? 'Embedding…'
                  : 'Saving…'}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
