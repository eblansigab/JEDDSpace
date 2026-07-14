import { Navigate } from 'react-router-dom'
import { usePermissions } from '../contexts/PermissionContext'

const AdminRoute = ({ children }) => {
  const { hasAdminAccess, loading: permissionsLoading } = usePermissions()

  if (permissionsLoading) {
    return null
  }

  if (!hasAdminAccess()) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

export default AdminRoute
