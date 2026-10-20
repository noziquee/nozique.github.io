export interface AppEnv {
  supabaseUrl: string;
  supabaseKey: string;
}

type RawEnv = Record<string, string | undefined>;

/** True when a key is a server-side secret that must never reach the browser. */
function isSecretKey(key: string): boolean {
  if (key.startsWith('sb_secret_')) return true;
  const parts = key.split('.');
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(atob((parts[1] ?? '').replace(/-/g, '+').replace(/_/g, '/')));
    return payload?.role === 'service_role';
  } catch {
    return false;
  }
}

/** Validate raw Vite env values and return them in a typed shape. Throws a readable error. */
export function parseEnv(raw: RawEnv): AppEnv {
  const url = raw.VITE_SUPABASE_URL?.trim();
  const key = raw.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !key) {
    throw new Error(
      'Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. ' +
        'Copy .env.example to .env.local and restart the dev server.',
    );
  }
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)) {
    throw new Error(
      `VITE_SUPABASE_URL looks wrong: "${url}" (expected https://<ref>.supabase.co).`,
    );
  }
  if (isSecretKey(key)) {
    throw new Error(
      'VITE_SUPABASE_PUBLISHABLE_KEY is a SECRET key. Use the publishable (or anon) key; ' +
        'secret keys must never be shipped to the browser.',
    );
  }
  return { supabaseUrl: url, supabaseKey: key };
}

let cached: AppEnv | undefined;

/** App-wide config, read once from import.meta.env. */
export function getEnv(): AppEnv {
  cached ??= parseEnv(import.meta.env);
  return cached;
}
