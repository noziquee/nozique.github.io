import { describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { parseEnv } from '../src/shared/config/env';
import type { Database } from '../src/shared/supabase/database.types';

// Phase 1.4: what can a stranger (an anonymous visitor) do to your database?
const env = parseEnv(import.meta.env);
const anon = createClient<Database>(env.supabaseUrl, env.supabaseKey, {
  auth: { persistSession: false },
});

describe('anonymous visitor: allowed', () => {
  it('can read the categories', async () => {
    const { data, error } = await anon.from('groups').select('name');
    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThanOrEqual(5);
  });
  it('can read the website sections', async () => {
    const { data, error } = await anon.from('site_sections').select('section_key');
    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThanOrEqual(7);
  });
  it('is not an admin', async () => {
    const { data, error } = await anon.rpc('is_admin');
    expect(error).toBeNull();
    expect(data).toBe(false);
  });
});

describe('anonymous visitor: blocked', () => {
  it('cannot read the admin list', async () => {
    const { data } = await anon.from('admins').select('*');
    expect(data ?? []).toHaveLength(0);
  });
  it('cannot read newsletter signups', async () => {
    const { data } = await anon.from('newsletter_subscribers').select('*');
    expect(data ?? []).toHaveLength(0);
  });
  it('cannot create a project', async () => {
    const { error } = await anon.from('posts').insert({ title: 'smoke-test-should-fail' });
    expect(error).not.toBeNull();
  });
  it('cannot create a category', async () => {
    const { error } = await anon.from('groups').insert({ name: 'smoke-test-should-fail' });
    expect(error).not.toBeNull();
  });
  it('cannot edit a website section', async () => {
    const { data } = await anon
      .from('site_sections')
      .update({ enabled: false })
      .eq('section_key', 'hero')
      .select();
    expect(data ?? []).toHaveLength(0);
  });
  it('cannot delete categories', async () => {
    const { data } = await anon.from('groups').delete().neq('name', '').select();
    expect(data ?? []).toHaveLength(0);
  });
  it('cannot upload files', async () => {
    const { error } = await anon.storage
      .from('site-images')
      .upload('smoke-test.png', new Blob(['x'], { type: 'image/png' }));
    expect(error).not.toBeNull();
  });
  it('cannot list uploaded files', async () => {
    const { data } = await anon.storage.from('site-images').list();
    expect(data ?? []).toHaveLength(0);
  });
});

describe('newsletter', () => {
  it('rejects an invalid email address', async () => {
    const { error } = await anon.from('newsletter_subscribers').insert({ email: 'not-an-email' });
    expect(error).not.toBeNull();
  });
});
