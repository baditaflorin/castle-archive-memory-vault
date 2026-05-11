import { useEffect, useRef, useState } from 'react';
import { Button } from '../../shared/components/Button.js';
import { useActiveIdentity } from '../identity/identity.js';
import { vault } from '../storage/vault.js';
import { rebuildIndex, search } from '../storage/searchIndex.js';
import { embed } from '../embedding/embed.js';
import { formatDateTime, formatDuration } from '../../shared/utils/time.js';
import type { SearchHit } from '../storage/searchIndex.js';

interface Props {
  refreshKey: number;
  onPick(reflectionId: string): void;
}

export function SearchView({ refreshKey, onPick }: Props) {
  const identity = useActiveIdentity();
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [indexed, setIndexed] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const builtKey = useRef<number>(-1);

  useEffect(() => {
    if (builtKey.current === refreshKey) return;
    builtKey.current = refreshKey;
    setIndexing(true);
    vault
      .decryptAll(identity)
      .then((list) => rebuildIndex(list))
      .then(() => {
        setIndexed(true);
      })
      .finally(() => setIndexing(false));
  }, [identity, refreshKey]);

  async function onSubmit(): Promise<void> {
    if (!indexed || !query.trim()) return;
    setSearching(true);
    try {
      const vec = await embed(query);
      const results = await search(query, Array.from(vec));
      setHits(results);
    } finally {
      setSearching(false);
    }
  }

  return (
    <section className="rounded-lg border border-stone-800 bg-stone-850/60 p-6">
      <h2 className="font-serif text-2xl text-parchment-100">Search the vault</h2>
      <p className="mt-1 text-xs text-parchment-200/60">
        Combines keyword and meaning-based search. Both happen on this device.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void onSubmit();
        }}
        className="mt-4 flex gap-2"
      >
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={indexing ? 'Building index…' : 'What were you grateful for last Tuesday?'}
          disabled={!indexed && indexing}
          className="flex-1 rounded-md border border-stone-700 bg-stone-850 px-3 py-2 text-parchment-50 outline-none focus:border-parchment-400"
          aria-label="Search query"
        />
        <Button type="submit" loading={searching} disabled={!indexed || !query.trim()}>
          Search
        </Button>
      </form>

      {indexing && (
        <p className="mt-3 text-xs text-parchment-200/70">
          Decrypting and indexing your reflections (one-time per session)…
        </p>
      )}

      <ul className="mt-4 flex flex-col gap-2">
        {hits.map((hit) => (
          <li key={hit.id}>
            <button
              type="button"
              onClick={() => onPick(hit.id)}
              className="block w-full rounded-md border border-stone-800 bg-stone-900/50 p-4 text-left transition hover:border-parchment-400/60"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-serif text-lg text-parchment-100">{hit.title}</span>
                <span className="font-mono text-xs text-parchment-200/60">
                  match {Math.round(hit.combined * 100)}%
                </span>
              </div>
              <p className="mt-1 text-xs text-parchment-200/60">
                {formatDateTime(hit.createdAt)} · {formatDuration(hit.durationMs)}
              </p>
              <p className="mt-2 text-sm text-parchment-200/80">{hit.snippet}</p>
            </button>
          </li>
        ))}
        {!searching && hits.length === 0 && query && (
          <li className="text-sm text-parchment-200/70">No results yet — try a broader phrase.</li>
        )}
      </ul>
    </section>
  );
}
