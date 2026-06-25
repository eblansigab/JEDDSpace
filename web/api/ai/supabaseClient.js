import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://eoxjathcdzhvdnqifgny.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVveGphdGhjZHpodmRucWlmZ255Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzEzMTg4NiwiZXhwIjoyMDkyNzA3ODg2fQ.vFeAG_HopkV719NkrMcz6DdYDFJsKusfFGxJ0jpaeXU'


let cachedClient = null

export const getSupabaseServerClient = () => {
  if (cachedClient) return cachedClient

  if (!SUPABASE_KEY) {
    throw new Error('Supabase server credentials are not configured.')
  }

  cachedClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })

  return cachedClient
}
