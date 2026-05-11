import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { logger } from '../utils/logger.js';
import { ERROR_CODES, isAppError } from '../utils/errors.js';

interface Props {
  children: ReactNode;
}

interface State {
  error: { code: string } | null;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(err: unknown): State {
    const code = isAppError(err) ? err.code : ERROR_CODES.GENERIC_UNKNOWN;
    return { error: { code } };
  }

  override componentDidCatch(err: unknown, info: ErrorInfo): void {
    const code = isAppError(err) ? err.code : ERROR_CODES.GENERIC_UNKNOWN;
    logger.error(code, { componentStack: info.componentStack?.slice(0, 200) ?? '' });
  }

  reset = (): void => this.setState({ error: null });

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 p-6 text-center">
          <h1 className="font-serif text-3xl">Something fell out of the vault.</h1>
          <p className="text-parchment-200">
            Error code: <code className="font-mono">{this.state.error.code}</code>
          </p>
          <p className="text-sm text-parchment-200/80">
            Your data is still safe. Reload to try again — nothing has been sent anywhere.
          </p>
          <button
            type="button"
            onClick={this.reset}
            className="rounded-md bg-parchment-500 px-4 py-2 text-sm font-medium text-stone-900"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
