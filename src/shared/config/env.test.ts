import { describe, expect, it } from 'vitest';
import { parseEnv } from './env';

const URL = 'https://abcdefgh.supabase.co';
const jwt = (role: string) => `x.${btoa(JSON.stringify({ role })).replace(/=+$/, '')}.y`;
const withKey = (key: string) => ({ VITE_SUPABASE_URL: URL, VITE_SUPABASE_PUBLISHABLE_KEY: key });

describe('parseEnv', () => {
  it('accepts a publishable key', () => {
    expect(parseEnv(withKey('sb_publishable_abc'))).toEqual({
      supabaseUrl: URL,
      supabaseKey: 'sb_publishable_abc',
    });
  });
  it('accepts a legacy anon JWT', () => {
    expect(() => parseEnv(withKey(jwt('anon')))).not.toThrow();
  });
  it('rejects missing values with a helpful message', () => {
    expect(() => parseEnv({})).toThrow(/\.env\.example/);
  });
  it('rejects a malformed URL', () => {
    expect(() =>
      parseEnv({ VITE_SUPABASE_URL: 'http://evil.example', VITE_SUPABASE_PUBLISHABLE_KEY: 'k' }),
    ).toThrow(/looks wrong/);
  });
  it('rejects secret keys', () => {
    expect(() => parseEnv(withKey('sb_secret_abc'))).toThrow(/SECRET/);
    expect(() => parseEnv(withKey(jwt('service_role')))).toThrow(/SECRET/);
  });
});
