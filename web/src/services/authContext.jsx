import {
  createContext,
  useContext,
  useEffect,
  useState
} from 'react'

import { supabaseClient } from '../supabase/supabaseClient'
import { withRoleDerivedFields } from '../utils/roleMetadata'

const AuthContext = createContext()
let refreshInFlight = null

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
    const fallbackFirstName = meta.first_name || emailName || 'Unknown'
    const fallbackLastName = meta.last_name || 'User'
    const rawRole = String(meta.role || 'employee').trim() || 'employee'
    const roleName = rawRole.toLowerCase() === 'admin' ? 'admin' : rawRole

    let roleId = null
    try {
      const { data: roleRow } = await supabaseClient
        .from('roles')
        .select('role_id')
        .eq('role_name', roleName)
        .maybeSingle()
      roleId = roleRow?.role_id || null
    } catch {
      // proceed without role_id if lookup fails
    }

    const fallbackPosition = roleName || 'employee'

    const { data: inserted, error: insertError } = await supabaseClient
      .from('employee')
      .insert([
        {
          user_id: user.id,
          first_name: fallbackFirstName,
          last_name: fallbackLastName,
          position: fallbackPosition,
          department: meta.department || 'General',
          employee_type: meta.employee_type || 'staff',
          role: fallbackPosition,
          role_id: roleId,
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

  const refreshSessionIfNeeded = async () => {
    if (refreshInFlight) {
      console.log('[DEBUG-AUTH-CONTEXT] refresh step 0: reusing in-flight refresh')
      return refreshInFlight
    }

    const refreshPromise = (async () => {
      console.log('[DEBUG-AUTH-CONTEXT] refresh step 1: before getSession()')
      try {
        const sessionTimeoutMarker = Symbol('auth-context-session-timeout')
        let sessionTimeoutId
        const sessionResult = await Promise.race([
          supabaseClient.auth.getSession(),
          new Promise((resolve) => {
            sessionTimeoutId = setTimeout(() => resolve(sessionTimeoutMarker), 4000)
          }),
        ])
        clearTimeout(sessionTimeoutId)

        if (sessionResult === sessionTimeoutMarker) {
          console.warn('[DEBUG-AUTH-CONTEXT] refresh step 2: getSession() timed out after 4 seconds')
          return null
        }

        const {
          data: { session },
          error,
        } = sessionResult

        if (error) {
          throw error
        }

        console.log('[DEBUG-AUTH-CONTEXT] refresh step 2: getSession() resolved', {
          hasSession: !!session,
        })

        if (!session) {
          return null
        }

        const expiresAtMs = Number(session.expires_at || 0) * 1000
        const refreshThresholdMs = Date.now() + 60_000

        if (expiresAtMs <= refreshThresholdMs) {
          console.log('[DEBUG-AUTH-CONTEXT] refresh step 3: before refreshSession()')
          const refreshTimeoutMarker = Symbol('auth-context-refresh-timeout')
          let refreshTimeoutId
          const refreshResult = await Promise.race([
            supabaseClient.auth.refreshSession(),
            new Promise((resolve) => {
              refreshTimeoutId = setTimeout(() => resolve(refreshTimeoutMarker), 4000)
            }),
          ])
          clearTimeout(refreshTimeoutId)

          if (refreshResult === refreshTimeoutMarker) {
            console.warn('[DEBUG-AUTH-CONTEXT] refresh step 4: refreshSession() timed out after 4 seconds; using current session')
            return session
          }

          const { data: refreshed, error: refreshError } = refreshResult
          console.log('[DEBUG-AUTH-CONTEXT] refresh step 4: refreshSession() resolved', {
            hasSession: !!refreshed?.session,
            hasError: !!refreshError,
          })
          if (refreshError) {
            console.warn('[AuthContext] Session refresh failed, continuing with current session:', refreshError)
            return session
          }

          return refreshed.session || session
        }

        return session
      } catch (err) {
        console.warn('[AuthContext] refreshSessionIfNeeded failed:', err)
        return null
      }
    })()

    refreshInFlight = refreshPromise

    try {
      return await refreshPromise
    } finally {
      if (refreshInFlight === refreshPromise) {
        refreshInFlight = null
        console.log('[DEBUG-AUTH-CONTEXT] refresh step 5: in-flight refresh cleared')
      }
    }
  }

  useEffect(() => {
    let mounted = true

    const refreshOnVisibleState = async () => {
      console.log('[DEBUG-AUTH-CONTEXT] visibility step 1: refresh triggered')
      const session = await refreshSessionIfNeeded()
      console.log('[DEBUG-AUTH-CONTEXT] visibility step 2: refresh completed', {
        hasSession: !!session,
      })
      if (session) {
        await loadUser(session)
      }
    }

    const handleVisibility = () => {
      console.log('[DEBUG-AUTH-CONTEXT] visibility step 0: visibilitychange', {
        visibilityState: document.visibilityState,
      })
      if (document.visibilityState === 'visible') {
        refreshOnVisibleState()
      }
    }

    const handleFocus = () => {
      console.log('[DEBUG-AUTH-CONTEXT] visibility step 0: window focus')
      refreshOnVisibleState()
    }

    const refreshInterval = setInterval(() => {
      refreshOnVisibleState()
    }, 60_000)

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('focus', handleFocus)

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
          if (mounted) setProfile(withRoleDerivedFields(data))
        } else {
          const created = await ensureEmployeeRecord(currentUser)
          if (mounted) setProfile(created ? withRoleDerivedFields(created) : created)
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
        const session = await refreshSessionIfNeeded()
        await loadUser(session, true)
      } catch (err) {
        console.error('[AuthContext] Initialization error:', err)
        if (mounted) {
          setUser(null)
          setProfile(null)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    initialize()

    const { data: listener } = supabaseClient.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[DEBUG-AUTH-CONTEXT] auth listener step 1: state change received', {
          event,
          hasSession: !!session,
        })
        await loadUser(session, false)
        console.log('[DEBUG-AUTH-CONTEXT] auth listener step 2: loadUser() resolved', {
          event,
        })
      }
    )

    return () => {
      mounted = false
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('focus', handleFocus)
      clearInterval(refreshInterval)
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
        isEmailVerified,
        signOut: () => supabaseClient.auth.signOut(),
        clearAuthState: () => {
          setUser(null)
          setProfile(null)
          setIsEmailVerified(false)
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
