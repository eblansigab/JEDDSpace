import { Navigate } from 'react-router-dom'
import { useAuth } from '../services/authContext'

const AdminRoute = ({ children }) => {

  const { profile, loading } = useAuth()

  if (loading) {
    return null
  }

  if (profile?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

export default AdminRoute