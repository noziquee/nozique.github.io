import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { ErrorMessage } from './states';

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
}

/** Catches a crash in any admin screen so the page never goes blank. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('The admin hit an unexpected error:', error, info.componentStack);
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="center-screen">
          <div className="panel">
            <ErrorMessage onRetry={() => window.location.reload()}>
              The admin hit an unexpected error. Your saved work is safe.
            </ErrorMessage>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
