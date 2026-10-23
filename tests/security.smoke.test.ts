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

// Phase 5.5: drafts of website sections must stay private; only published content is public.
// (Untyped client: the generated types are refreshed when the draft table is first used.)
const anonUntyped = createClient(env.supabaseUrl, env.supabaseKey, {
  auth: { persistSession: false },
});

describe('section drafts', () => {
  it('visitors cannot read drafts', async () => {
    const { data } = await anonUntyped.from('site_section_drafts').select('*');
    expect(data ?? []).toHaveLength(0);
  });
  it('visitors cannot save a draft', async () => {
    const { error } = await anonUntyped
      .from('site_section_drafts')
      .insert({ section_key: 'hero', draft_content: { heading: 'smoke-test-should-fail' } });
    expect(error).not.toBeNull();
  });
  it('visitors cannot publish', async () => {
    const { error } = await anonUntyped.rpc('publish_section', { p_key: 'hero' });
    expect(error).not.toBeNull();
  });
  it('the public sections table has no draft column', async () => {
    const { data } = await anonUntyped.from('site_sections').select('*').limit(1);
    expect(Object.keys(data?.[0] ?? {})).not.toContain('draft_content');
  });
});

describe('newsletter', () => {
  it('rejects an invalid email address', async () => {
    const { error } = await anon.from('newsletter_subscribers').insert({ email: 'not-an-email' });
    expect(error).not.toBeNull();
  });
});
