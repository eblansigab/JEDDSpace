import { Navigate } from 'react-router-dom'
import { usePermissions } from '../contexts/PermissionContext'

const AdminRoute = ({ children }) => {
  const { hasPermission, loading: permissionsLoading } = usePermissions()

  if (permissionsLoading) {
    return null
  }

  if (!hasPermission('settings.manage')) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

export default AdminRoute
