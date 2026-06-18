import { createServerClient } from '@supabase/ssr'
import { createClient as createJsClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from './database.types'

/**
 * Creates a Supabase server client using the current request cookies.
 * Must be called inside a Server Component, Server Action, or Route Handler.
 *
 * Usage:
 *   const supabase = await createClient()
 *   const { data, error } = await supabase.from('incidents').select('*')
 */
export async function createClient() {
  const cookieStore = await cookies()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.'
    )
  }

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // setAll is called from a Server Component where cookies cannot be
          // mutated. The middleware is responsible for refreshing the session.
        }
      },
    },
  })
}

/**
 * Creates a Supabase admin client with the service role key, bypassing RLS.
 * Uses @supabase/supabase-js directly (NOT @supabase/ssr) so the service role
 * is never overridden by cookie-based user JWTs.
 * Only use server-side in trusted contexts (admin actions, migrations, webhooks).
 * NEVER expose the service role key to the browser.
 */
export async function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.'
    )
  }

  return createJsClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>
export type SupabaseAdminClient = Awaited<ReturnType<typeof createAdminClient>>
