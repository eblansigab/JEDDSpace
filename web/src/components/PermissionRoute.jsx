import { Navigate } from 'react-router-dom'
import { usePermissions } from '../contexts/PermissionContext'

const PermissionRoute = ({ children, permission, fallback = null }) => {
  const { hasPermission, loading } = usePermissions()

  if (loading) {
    return null
  }

  if (!permission || !hasPermission(permission)) {
    if (fallback) {
      return fallback
    }
    return <Navigate to="/dashboard" replace />
  }

  return children
}

export default PermissionRoute
