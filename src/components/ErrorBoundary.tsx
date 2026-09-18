import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertIcon } from './icons';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Last line of defence for unexpected render errors. Without it a thrown
 * error anywhere in the tree would unmount the whole app to a blank window.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ui] unexpected render error', error, info.componentStack);
  }

  private reset = () => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="card max-w-md p-8 text-center" role="alert">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600" aria-hidden="true">
            <AlertIcon className="h-6 w-6" />
          </span>
          <p className="mt-4 text-[15px] font-semibold text-ink">Something went wrong</p>
          <p className="mt-1 text-sm text-ink-2">
            The interface hit an unexpected error. Your API key and settings are unaffected.
          </p>
          <p className="mt-3 break-words font-mono text-xs text-ink-3">{this.state.error.message}</p>
          <button type="button" className="btn-primary mt-6" onClick={this.reset}>
            Reload interface
          </button>
        </div>
      </div>
    );
  }
}
