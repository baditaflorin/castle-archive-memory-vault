import { useEffect, useState } from 'react';
import { vault } from '../storage/vault.js';
import { useActiveIdentity } from '../identity/identity.js';
import { formatDateTime, formatDuration } from '../../shared/utils/time.js';
import type { DecryptedReflection } from '../../shared/types.js';

interface Props {
  refreshKey: number;
  onPick(reflection: DecryptedReflection): void;
}

export function VaultList({ refreshKey, onPick }: Props) {
  const identity = useActiveIdentity();
  const [items, setItems] = useState<DecryptedReflection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    vault.decryptAll(identity).then((list) => {
      if (!alive) return;
      setItems(list);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [identity, refreshKey]);

  if (loading) {
    return <p className="text-center text-sm text-parchment-200/70">Unsealing your reflections…</p>;
  }

  if (items.length === 0) {
    return (
      <p className="text-center text-sm text-parchment-200/70">
        Nothing here yet. Tap “Start recording” to capture your first reflection.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((it) => (
        <li key={it.id}>
          <button
            type="button"
            onClick={() => onPick(it)}
            className="block w-full rounded-md border border-stone-800 bg-stone-850/60 p-4 text-left transition hover:border-parchment-400/60 hover:bg-stone-850"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-serif text-lg text-parchment-100">
                {it.payload.metadata.title || '(untitled reflection)'}
              </span>
              <span className="shrink-0 font-mono text-xs text-parchment-200/70">
                {formatDuration(it.durationMs)}
              </span>
            </div>
            <p className="mt-1 text-xs text-parchment-200/60">{formatDateTime(it.createdAt)}</p>
            <p className="mt-2 line-clamp-2 text-sm text-parchment-200/80">
              {it.payload.transcript || '(no transcript)'}
            </p>
          </button>
        </li>
      ))}
    </ul>
  );
}
