import {
  createContext,
  useContext,
  useEffect,
  useState
} from 'react'

import { supabaseClient } from '../supabase/supabaseClient'

const AuthContext = createContext()

/**
 * Ensures an employee record exists for the given user. If the user was
 * confirmed manually in the dashboard (bypassing the email flow) or if the
 * deferred-creation in AuthCallbackPage never ran, there may be no row in
 * `employee` for this user. This function creates a minimal one so the rest
 * of the app has a profile to display.
 */
const ensureEmployeeRecord = async (user) => {
  if (!user?.id) return null

  try {
    const { data: existing, error: selectError } = await supabaseClient
      .from('employee')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (selectError) {
      console.error('[AuthContext] Error checking for existing employee record:', selectError)
      return null
    }

    if (existing) {
      return existing
    }

    const meta = user.user_metadata || {}
    const emailName = (user.email || '').split('@')[0] || ''

    const { data: inserted, error: insertError } = await supabaseClient
      .from('employee')
      .insert([
        {
          user_id: user.id,
          auth_user_id: user.id,
          first_name: meta.first_name || emailName || null,
          last_name: meta.last_name || null,
          position: meta.position || null,
          department: meta.department || null,
          role: String(meta.role || 'employee').toLowerCase() === 'admin' ? 'admin' : 'employee',
            email: user.email,
        },
      ])
      .select()
      .single()

    if (insertError) {
      console.error('[AuthContext] Error auto-creating employee record:', insertError)
      return null
    }

    console.log('[AuthContext] Auto-created employee record for user:', user.id)
    return inserted
  } catch (e) {
    console.error('[AuthContext] Unexpected error in ensureEmployeeRecord:', e)
    return null
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isEmailVerified, setIsEmailVerified] = useState(false)

  useEffect(() => {
    let mounted = true

    const loadUser = async (session, isInitial = false) => {
      if (isInitial && mounted) {
        setLoading(true)
        setProfile(null)
      }

      const currentUser = session?.user
      if (mounted) {
        setUser(currentUser)
        setIsEmailVerified(!!currentUser?.email_confirmed_at)
      }

      if (currentUser) {
        const { data, error } = await supabaseClient
          .from('employee')
          .select('*')
          .eq('user_id', currentUser.id)
          .maybeSingle()

        if (error) {
          console.error('[AuthContext] Error loading employee profile:', error)
          if (mounted) setProfile(null)
        } else if (data) {
          if (mounted) setProfile(data)
        } else {
          // No employee row yet — try to auto-create one so the UI is not empty.
          const created = await ensureEmployeeRecord(currentUser)
          if (mounted) setProfile(created)
        }
      } else if (mounted) {
        setProfile(null)
      }

      if (isInitial && mounted) {
        setLoading(false)
      }
    }

    const initialize = async () => {
      try {
        const {
          data: { session }
        } = await supabaseClient.auth.getSession()

        await loadUser(session, true)
      } catch (err) {
        console.error('[AuthContext] Initialization error:', err)
        if (mounted) {
          setUser(null)
          setProfile(null)
          setLoading(false)
        }
      }
    }

    initialize()

    const { data: listener } = supabaseClient.auth.onAuthStateChange(
      async (_event, session) => {
        await loadUser(session, false)
      }
    )

    return () => {
      mounted = false
      const subscription = listener?.subscription
      subscription?.unsubscribe?.()
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isEmailVerified
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
