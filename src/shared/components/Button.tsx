import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  children: ReactNode;
}

const STYLES: Record<Variant, string> = {
  primary:
    'bg-parchment-500 hover:bg-parchment-400 text-stone-900 focus-visible:ring-parchment-300',
  secondary: 'bg-stone-700 hover:bg-stone-600 text-parchment-50 focus-visible:ring-stone-400',
  danger: 'bg-red-700 hover:bg-red-600 text-white focus-visible:ring-red-400',
  ghost: 'bg-transparent hover:bg-stone-800/40 text-parchment-100 focus-visible:ring-parchment-300',
};

export function Button({
  variant = 'primary',
  loading = false,
  children,
  disabled,
  className,
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      disabled={disabled ?? loading}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium',
        'transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-900',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        STYLES[variant],
        className ?? '',
      ].join(' ')}
    >
      {loading && (
        <span
          aria-hidden
          className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-r-transparent"
        />
      )}
      {children}
    </button>
  );
}
