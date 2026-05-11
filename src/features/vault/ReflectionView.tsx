import { useEffect, useState } from 'react';
import { Button } from '../../shared/components/Button.js';
import { useToast } from '../../shared/components/Toast.js';
import { useActiveIdentity } from '../identity/identity.js';
import { vault } from '../storage/vault.js';
import { formatDateTime, formatDuration } from '../../shared/utils/time.js';
import { exportClip, downloadBlob } from '../export/exporter.js';
import type { DecryptedReflection, ExportFormat } from '../../shared/types.js';

interface Props {
  reflection: DecryptedReflection;
  onBack(): void;
  onDeleted(): void;
}

export function ReflectionView({ reflection, onBack, onDeleted }: Props) {
  const identity = useActiveIdentity();
  const toast = useToast();
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    let url: string | null = null;
    vault
      .audioBlob(reflection.id, identity.record.id)
      .then((blob) => {
        if (!alive) return;
        url = URL.createObjectURL(blob);
        setAudioUrl(url);
      })
      .catch(() => {
        if (alive) setAudioUrl(null);
      });
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [reflection.id, identity.record.id]);

  async function onExport(format: ExportFormat): Promise<void> {
    const { blob, filename } = await exportClip(reflection, format);
    downloadBlob(blob, filename);
    toast.push('success', `Exported ${filename}.`);
  }

  async function onDelete(): Promise<void> {
    if (!confirm('Delete this reflection permanently? This cannot be undone.')) return;
    await vault.remove(reflection.id, identity.record.id);
    toast.push('info', 'Reflection removed.');
    onDeleted();
  }

  return (
    <article className="flex flex-col gap-4 rounded-lg border border-stone-800 bg-stone-850/60 p-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl text-parchment-100">
            {reflection.payload.metadata.title || '(untitled reflection)'}
          </h2>
          <p className="text-xs text-parchment-200/60">
            {formatDateTime(reflection.createdAt)} · {formatDuration(reflection.durationMs)}
          </p>
        </div>
        <Button variant="ghost" onClick={onBack}>
          ← Back
        </Button>
      </header>

      {audioUrl && (
        <audio controls src={audioUrl} preload="metadata" className="w-full">
          Audio playback is not supported in this browser.
        </audio>
      )}

      <section>
        <h3 className="text-sm font-medium uppercase tracking-wide text-parchment-200/70">
          Transcript
        </h3>
        <p className="mt-2 whitespace-pre-wrap font-serif text-lg leading-relaxed text-parchment-100">
          {reflection.payload.transcript || <em>(no transcript)</em>}
        </p>
      </section>

      {reflection.payload.segments.length > 0 && (
        <details className="text-sm text-parchment-200/80">
          <summary className="cursor-pointer select-none">Show timestamped segments</summary>
          <ol className="mt-2 flex flex-col gap-1 font-mono text-xs">
            {reflection.payload.segments.map((s, i) => (
              <li key={i}>
                <span className="text-parchment-400">
                  [{formatDuration(s.start * 1000)}–{formatDuration(s.end * 1000)}]
                </span>{' '}
                {s.text}
              </li>
            ))}
          </ol>
        </details>
      )}

      <footer className="flex flex-wrap gap-2 border-t border-stone-800 pt-4">
        <Button variant="secondary" onClick={() => void onExport('markdown')}>
          Export Markdown
        </Button>
        <Button variant="secondary" onClick={() => void onExport('html')}>
          Export HTML
        </Button>
        <span className="flex-1" />
        <Button variant="danger" onClick={() => void onDelete()}>
          Delete
        </Button>
      </footer>
    </article>
  );
}
