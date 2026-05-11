import { useState } from 'react';
import { IdentityProvider } from './features/identity/IdentityProvider.js';
import { IdentitySetup } from './features/identity/IdentitySetup.js';
import { useIdentity } from './features/identity/identity.js';
import { Recorder } from './features/recording/Recorder.js';
import { VaultList } from './features/vault/VaultList.js';
import { ReflectionView } from './features/vault/ReflectionView.js';
import { SearchView } from './features/search/SearchView.js';
import { Button } from './shared/components/Button.js';
import { vault } from './features/storage/vault.js';
import type { DecryptedReflection } from './shared/types.js';

type View = 'home' | 'search' | 'reflection';

function Shell() {
  const { active, setActive } = useIdentity();
  const [view, setView] = useState<View>('home');
  const [refreshKey, setRefreshKey] = useState(0);
  const [picked, setPicked] = useState<DecryptedReflection | null>(null);

  if (!active) return <IdentitySetup />;

  function bumpRefresh(): void {
    setRefreshKey((k) => k + 1);
  }

  async function openById(reflectionId: string): Promise<void> {
    const dec = await vault.get(active!, reflectionId);
    setPicked(dec);
    setView('reflection');
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-stone-800 bg-stone-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 px-6 py-3">
          <h1 className="font-serif text-xl text-parchment-100">Castle Archive</h1>
          <nav className="flex items-center gap-3 text-sm">
            <button
              type="button"
              onClick={() => setView('home')}
              className={view === 'home' ? 'text-parchment-300 underline' : 'text-parchment-200'}
            >
              Vault
            </button>
            <button
              type="button"
              onClick={() => setView('search')}
              className={view === 'search' ? 'text-parchment-300 underline' : 'text-parchment-200'}
            >
              Search
            </button>
          </nav>
          <span className="flex-1" />
          <span className="hidden text-xs text-parchment-200/60 sm:inline">
            {active.record.displayName}
          </span>
          <Button variant="ghost" onClick={() => setActive(null)}>
            Lock
          </Button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-8">
        {view === 'home' && (
          <>
            <Recorder onSaved={bumpRefresh} />
            <section>
              <h2 className="mb-3 font-serif text-2xl text-parchment-100">Your reflections</h2>
              <VaultList
                refreshKey={refreshKey}
                onPick={(r) => {
                  setPicked(r);
                  setView('reflection');
                }}
              />
            </section>
          </>
        )}
        {view === 'search' && (
          <SearchView refreshKey={refreshKey} onPick={(id) => void openById(id)} />
        )}
        {view === 'reflection' && picked && (
          <ReflectionView
            reflection={picked}
            onBack={() => setView('home')}
            onDeleted={() => {
              bumpRefresh();
              setPicked(null);
              setView('home');
            }}
          />
        )}
      </main>

      <footer className="border-t border-stone-800 bg-stone-900/60 py-4 text-center text-xs text-parchment-200/60">
        Local-first · no servers · no telemetry. ·{' '}
        <a
          href="https://github.com/baditaflorin/castle-archive-memory-vault"
          className="underline hover:text-parchment-100"
        >
          Source
        </a>
      </footer>
    </div>
  );
}

export function App() {
  return (
    <IdentityProvider>
      <Shell />
    </IdentityProvider>
  );
}
