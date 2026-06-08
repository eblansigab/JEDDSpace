import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://eoxjathcdzhvdnqifgny.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVveGphdGhjZHpodmRucWlmZ255Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMzE4ODYsImV4cCI6MjA5MjcwNzg4Nn0.ud03HJF_ztTq8CXpcWiiewag3oYgZEADFKFRwg5Z494'

export const supabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Avoid auth requests hanging when a stale Web Lock is held (common with localhost + multiple tabs)
    lock: async (_name, _acquireTimeout, fn) => fn(),
  },
})
