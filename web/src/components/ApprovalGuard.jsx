import { Navigate } from 'react-router-dom'
import { useAuth } from '../services/authContext'
import { usePermissions } from '../contexts/PermissionContext'

const ApprovalGuard = ({ children }) => {
  const { user, loading, profile } = useAuth()
  const { hasAdminAccess } = usePermissions()

  if (loading) {
    return <div>Loading...</div>
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  if (hasAdminAccess()) {
    return children
  }

  const status = String(profile?.registration_status || '').toLowerCase()
  if (status === 'pending' || status === 'rejected') {
    return <Navigate to="/awaiting-approval" replace />
  }

  return children
}

export default ApprovalGuard