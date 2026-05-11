import { useId, useState } from 'react';
import type { ChangeEvent } from 'react';

interface Props {
  label: string;
  value: string;
  onChange(v: string): void;
  autoFocus?: boolean;
  minLength?: number;
}

export function PassphraseField({ label, value, onChange, autoFocus, minLength }: Props) {
  const id = useId();
  const [reveal, setReveal] = useState(false);
  const tooShort = minLength != null && value.length > 0 && value.length < minLength;

  return (
    <label htmlFor={id} className="flex flex-col gap-1 text-sm text-parchment-100">
      {label}
      <div className="flex items-stretch gap-2">
        <input
          id={id}
          type={reveal ? 'text' : 'password'}
          autoComplete="new-password"
          autoFocus={autoFocus}
          value={value}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          className="flex-1 rounded-md border border-stone-700 bg-stone-850 px-3 py-2 font-mono text-parchment-50 outline-none focus:border-parchment-400"
          aria-invalid={tooShort}
        />
        <button
          type="button"
          onClick={() => setReveal((r) => !r)}
          className="rounded-md border border-stone-700 px-3 text-xs text-parchment-100 hover:bg-stone-800"
          aria-label={reveal ? 'Hide passphrase' : 'Show passphrase'}
        >
          {reveal ? 'Hide' : 'Show'}
        </button>
      </div>
      {tooShort && (
        <span className="text-xs text-red-300">Use at least {minLength} characters.</span>
      )}
    </label>
  );
}
