import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://eoxjathcdzhvdnqifgny.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVveGphdGhjZHpodmRucWlmZ255Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMzE4ODYsImV4cCI6MjA5MjcwNzg4Nn0.ud03HJF_ztTq8CXpcWiiewag3oYgZEADFKFRwg5Z494'

const authConfig = {
  persistSession: true,
  autoRefreshToken: true,
  detectSessionInUrl: true,
  // Avoid auth requests hanging when a stale Web Lock is held (common with localhost + multiple tabs)
  lock: async (_name, _acquireTimeout, fn) => fn(),
}

export const supabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: authConfig,
})

/**
 * `signupClient` reuses the same Supabase client instance.
 *
 * Historically we created a second `createClient` here so that sign-up would
 * not disturb the admin's existing session, but that caused the
 * "Multiple GoTrueClient instances" warning because they share the same
 * storage key. We now reuse `supabaseClient` directly.
 *
 * If you need to call sign-up *without* affecting the current session, call
 * `supabaseClient.auth.signUp(...)` from a context where the admin is not
 * already signed in (e.g. a public registration page), or sign the admin out
 * temporarily and back in after the operation.
 */
export const signupClient = supabaseClient
