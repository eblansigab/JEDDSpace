import {
  createContext,
  useContext,
  useEffect,
  useState
} from 'react'

import { supabaseClient } from '../supabase/supabaseClient'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {

  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {

    const loadUser = async () => {

      setLoading(true)

      const {
        data: { session }
      } = await supabaseClient.auth.getSession()

      const currentUser = session?.user

      setUser(currentUser)

      if (currentUser) {

        const { data, error } = await supabaseClient
          .from('employee')
          .select('*')
          .eq('user_id', currentUser.id)
          .single()

        if (error) {
          console.error(error)
        } else {
          setProfile(data)
        }

      } else {
        setProfile(null)
      }

      setLoading(false)
    }

    loadUser()

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