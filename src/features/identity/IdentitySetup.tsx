import { useEffect, useState } from 'react';
import { Button } from '../../shared/components/Button.js';
import { PassphraseField } from '../../shared/components/PassphraseField.js';
import { useToast } from '../../shared/components/Toast.js';
import { identityStore, useIdentity } from './identity.js';
import type { IdentityRecord } from '../../shared/types.js';
import { isAppError } from '../../shared/utils/errors.js';

type Mode = 'choose' | 'create' | 'unlock';

export function IdentitySetup() {
  const { setActive } = useIdentity();
  const toast = useToast();
  const [identities, setIdentities] = useState<IdentityRecord[]>([]);
  const [mode, setMode] = useState<Mode>('choose');
  const [displayName, setDisplayName] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [confirm, setConfirm] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    identityStore.list().then((list) => {
      setIdentities(list);
      setMode(list.length === 0 ? 'create' : 'unlock');
      setSelectedId(list[0]?.id ?? null);
    });
  }, []);

  async function onCreate(): Promise<void> {
    if (passphrase.length < 8) {
      toast.push('error', 'Passphrase must be at least 8 characters.');
      return;
    }
    if (passphrase !== confirm) {
      toast.push('error', 'Passphrases do not match.');
      return;
    }
    setBusy(true);
    try {
      const ai = await identityStore.create({ displayName, passphrase });
      toast.push('success', `Welcome, ${ai.record.displayName}.`);
      setActive(ai);
    } catch (e) {
      const code = isAppError(e) ? e.code : 'identity/create-failed';
      toast.push('error', `Could not create identity (${code}).`);
    } finally {
      setBusy(false);
    }
  }

  async function onUnlock(): Promise<void> {
    if (!selectedId) return;
    setBusy(true);
    try {
      const ai = await identityStore.unlock({ identityId: selectedId, passphrase });
      toast.push('success', `Unlocked, ${ai.record.displayName}.`);
      setActive(ai);
    } catch {
      toast.push('error', 'Incorrect passphrase.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-8 p-6">
      <header className="text-center">
        <h1 className="font-serif text-4xl text-parchment-100">Castle Archive</h1>
        <p className="mt-2 text-sm text-parchment-200/80">
          A private vault for your retreat reflections. Everything stays on this device.
        </p>
      </header>

      {identities.length > 0 && (
        <nav className="flex justify-center gap-3 text-sm">
          <button
            type="button"
            onClick={() => setMode('unlock')}
            className={mode === 'unlock' ? 'text-parchment-300 underline' : 'text-parchment-200'}
          >
            Unlock existing
          </button>
          <span aria-hidden className="text-parchment-200/40">
            ·
          </span>
          <button
            type="button"
            onClick={() => setMode('create')}
            className={mode === 'create' ? 'text-parchment-300 underline' : 'text-parchment-200'}
          >
            Create new
          </button>
        </nav>
      )}

      {mode === 'create' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void onCreate();
          }}
          className="flex flex-col gap-4 rounded-lg border border-stone-800 bg-stone-850/60 p-6"
        >
          <h2 className="font-serif text-2xl">Create your identity</h2>
          <label className="flex flex-col gap-1 text-sm text-parchment-100">
            Display name
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Florin · Spring Retreat 2026"
              className="rounded-md border border-stone-700 bg-stone-850 px-3 py-2 text-parchment-50 outline-none focus:border-parchment-400"
            />
          </label>
          <PassphraseField
            label="Passphrase (8+ chars; we cannot recover this)"
            value={passphrase}
            onChange={setPassphrase}
            minLength={8}
            autoFocus
          />
          <PassphraseField label="Confirm passphrase" value={confirm} onChange={setConfirm} />
          <Button type="submit" loading={busy}>
            Create identity
          </Button>
          <p className="text-xs text-parchment-200/70">
            A fresh age keypair is generated in your browser. The private key never leaves this
            device.
          </p>
        </form>
      )}

      {mode === 'unlock' && identities.length > 0 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void onUnlock();
          }}
          className="flex flex-col gap-4 rounded-lg border border-stone-800 bg-stone-850/60 p-6"
        >
          <h2 className="font-serif text-2xl">Unlock your vault</h2>
          <label className="flex flex-col gap-1 text-sm text-parchment-100">
            Identity
            <select
              value={selectedId ?? ''}
              onChange={(e) => setSelectedId(e.target.value)}
              className="rounded-md border border-stone-700 bg-stone-850 px-3 py-2 text-parchment-50 outline-none focus:border-parchment-400"
            >
              {identities.map((id) => (
                <option key={id.id} value={id.id}>
                  {id.displayName}
                </option>
              ))}
            </select>
          </label>
          <PassphraseField
            label="Passphrase"
            value={passphrase}
            onChange={setPassphrase}
            autoFocus
          />
          <Button type="submit" loading={busy} disabled={!selectedId}>
            Unlock
          </Button>
        </form>
      )}
    </main>
  );
}
