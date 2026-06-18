import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

let client: ReturnType<typeof createBrowserClient<Database>> | null = null

/**
 * Returns a singleton Supabase browser client.
 * Safe to call multiple times — always returns the same instance.
 */
export function createClient() {
  if (client) return client

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.'
    )
  }

  client = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
  return client
}

export type SupabaseBrowserClient = ReturnType<typeof createClient>
