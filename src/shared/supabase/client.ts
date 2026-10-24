import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getEnv } from '../config/env';
import type { Database } from './database.types';

export type NoziqueClient = SupabaseClient<Database>;

let client: NoziqueClient | undefined;

/**
 * The one Supabase client for the whole app (public site and admin).
 * Created on first use so that pages that never touch the database don't need settings.
 * Visitors use the publishable key; admins additionally carry their login session, and the
 * database rules (RLS) decide what each of them may do.
 */
export function getSupabase(): NoziqueClient {
  if (!client) {
    const { supabaseUrl, supabaseKey } = getEnv();
    client = createClient<Database>(supabaseUrl, supabaseKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
  }
  return client;
}
