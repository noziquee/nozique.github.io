import { useAuth } from '../auth/AuthProvider';

export function SettingsPage() {
  const { email } = useAuth();
  return (
    <section>
      <h1>Settings</h1>
      <p>
        Signed in as <strong>{email}</strong>
      </p>
      <p>
        <a href="../" target="_blank" rel="noreferrer">
          Open the public site
        </a>
      </p>
    </section>
  );
}
