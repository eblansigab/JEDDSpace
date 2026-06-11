
import { Navigate } from 'react-router-dom'
import { useAuth } from '../services/authContext'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  console.log("PROTECTED ROUTE LOADED")
  console.log("USER:", user)
  console.log("LOADING:", loading)
  if (loading) {
    return <div>Loading...</div>
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  return children
}