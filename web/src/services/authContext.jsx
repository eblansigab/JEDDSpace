import {
  createContext,
  useContext,
  useEffect,
  useState
} from 'react'

import { supabaseClient } from '../supabase/supabaseClient'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  console.log("AUTH PROVIDER LOADED")
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  console.log("AUTH CONTEXT RENDER")
  console.log("USER:", user)
  console.log("LOADING:", loading)

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
      }

      if (currentUser) {
        const { data, error } = await supabaseClient
          .from('employee')
          .select('*')
          .eq('user_id', currentUser.id)
          .maybeSingle()

        if (error) {
          console.error(error)
          if (mounted) setProfile(null)
        } else if (mounted) {
          setProfile(data || null)
        }
      } else if (mounted) {
        setProfile(null)
      }

      if (isInitial && mounted) {
        setLoading(false)
      }
    }

    const initialize = async () => {
      const {
        data: { session }
      } = await supabaseClient.auth.getSession()

      await loadUser(session, true)
    }

    initialize()

    const listener = supabaseClient.auth.onAuthStateChange(
      async (_event, session) => {
        await loadUser(session, false)
      }
    )

    return () => {
      mounted = false
      const subscription = listener?.data?.subscription || listener?.subscription
      subscription?.unsubscribe?.()
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)