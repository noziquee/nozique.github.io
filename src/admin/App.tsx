import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { LoginPage } from './auth/LoginPage';
import { AdminLayout } from './layout/AdminLayout';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { ErrorMessage, Loading } from './ui/states';

function Screen({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <main className="center-screen">
      <div className="panel">
        <h1>{title}</h1>
        {children}
      </div>
    </main>
  );
}

function AuthGate() {
  const { status, email, message, signOut } = useAuth();

  switch (status) {
    case 'loading':
      return (
        <Screen title="Nozique Admin">
          <Loading />
        </Screen>
      );
    case 'signedOut':
      return <LoginPage />;
    case 'noAccess':
      return (
        <Screen title="No access">
          <p>
            <strong>{email}</strong> is signed in, but is not an admin of this site.
          </p>
          <button type="button" onClick={() => void signOut()}>
            Sign out
          </button>
        </Screen>
      );
    case 'error':
      return (
        <Screen title="Nozique Admin">
          <ErrorMessage onRetry={() => window.location.reload()}>{message}</ErrorMessage>
        </Screen>
      );
    case 'admin':
      return <AdminLayout />;
  }
}

export function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </ErrorBoundary>
  );
}
