import { createContext, useContext, useEffect, useState } from 'react'
import { supabaseClient } from '../supabase/supabaseClient'

const ADMIN_PERMISSION_CODES = new Set([
  'EMP_ADD',
  'EMP_PROFILE',
  'EMP_ROLE',
  'PROJ_MANAGE',
  'PROJ_ASSIGN',
  'PROJ_ARCHIVE',
  'LEAVE_VIEW',
  'LEAVE_MANAGE',
  'BLOCKCHAIN_AUDIT',
  'BLOCKCHAIN_VERIFY',
  'ANN_CREATE',
  'ANN_MANAGE',
  'AI_ANALYTICS',
  'AI_HISTORY',
  'AI_USERS',
  'AI_INTENTS',
  'DOCUMENTS_ACCESS',
  'PROJECTS_ACCESS',
  'AI_ACCESS',
  'ANNOUNCEMENTS_ACCESS',
  'CONTRACTS_ACCESS',
  'NOTIFICATIONS_ACCESS',
  'REPORTS_ACCESS',
  'ACCESS_ADMIN_DASHBOARD',
])

const DB_KEY_TO_CSV_CODE = {
  'Employee Management.Add Employee': 'EMP_ADD',
  'Employee Management.Manage Employee Profile': 'EMP_PROFILE',
  'Employee Management.Change Employee Role': 'EMP_ROLE',
  'Projects.Manage Projects': 'PROJ_MANAGE',
  'Projects.Assign Employees': 'PROJ_ASSIGN',
  'Projects.View Project Archives': 'PROJ_ARCHIVE',
  'Leave & Official Business.View Requests': 'LEAVE_VIEW',
  'Leave & Official Business.Manage Requests': 'LEAVE_MANAGE',
  'Blockchain Integrity.Audit Blockchain Records': 'BLOCKCHAIN_AUDIT',
  'Blockchain Integrity.Verify Integrity': 'BLOCKCHAIN_VERIFY',
  'Announcements.Create Announcements': 'ANN_CREATE',
  'Announcements.Manage Announcements': 'ANN_MANAGE',
  'AI Analytics.View AI Analytics': 'AI_ANALYTICS',
  'AI Chat Logs.View Conversation History': 'AI_HISTORY',
  'AI Chat Logs.View User Activity': 'AI_USERS',
  'AI Chat Logs.View Intent Classification': 'AI_INTENTS',
  'Application Access.Documents': 'DOCUMENTS_ACCESS',
  'Application Access.Projects': 'PROJECTS_ACCESS',
  'Application Access.AI Assistant': 'AI_ACCESS',
  'Application Access.Announcements': 'ANNOUNCEMENTS_ACCESS',
  'Application Access.Contracts': 'CONTRACTS_ACCESS',
  'Application Access.Notifications': 'NOTIFICATIONS_ACCESS',
  'Application Access.Reports': 'REPORTS_ACCESS',
  'Application Access.Admin Dashboard': 'ACCESS_ADMIN_DASHBOARD',
}

const normalizePermissionKey = (rawKey) => {
  const trimmed = String(rawKey || '').trim()
  if (!trimmed) return ''
  if (ADMIN_PERMISSION_CODES.has(trimmed)) return trimmed
  return DB_KEY_TO_CSV_CODE[trimmed] || trimmed.toLowerCase()
}

const PermissionContext = createContext({
  permissions: [],
  loading: true,
  hasPermission: () => false,
  hasAnyPermission: () => false,
  hasAdminAccess: () => false,
  getScope: () => null,
})

export const PermissionProvider = ({ children }) => {
  const [permissions, setPermissions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const loadPermissions = async () => {
      try {
        const {
          data: { session },
        } = await supabaseClient.auth.getSession()
        const userId = session?.user?.id
        if (!userId) {
          if (mounted) {
            setPermissions([])
            setLoading(false)
          }
          return
        }

        const response = await fetch('/api/auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ action: 'current-permissions' }),
        })

        const result = await response.json().catch(() => ({}))
        if (!response.ok || result?.success === false) {
          throw new Error(result?.error || 'Failed to load permissions.')
        }

        const userPermissions = (result?.permissions || result?.data?.permissions || []).map((perm) => {
          const module = String(perm.module || '').trim()
          const action = String(perm.action || '').trim()
          const rawKey = perm.rawKey || (module && action ? `${module}.${action}` : '')
          return {
            ...perm,
            key: perm.key || normalizePermissionKey(rawKey),
            rawKey,
            module,
            action,
            scope: perm.scope || 'ALL',
          }
        })

        if (mounted) {
          console.log('Loaded Permissions:', userPermissions)
          setPermissions(userPermissions)
          setLoading(false)
        }
      } catch (err) {
        console.error('[PermissionContext] Failed to load permissions:', err)
        if (mounted) {
          setPermissions([])
          setLoading(false)
        }
      }
    }

    loadPermissions()

    const { data: listener } = supabaseClient.auth.onAuthStateChange(() => {
      loadPermissions()
    })

    return () => {
      mounted = false
      listener?.subscription?.unsubscribe?.()
    }
  }, [])

  const hasPermission = (permissionKey) => {
    const normalized = normalizePermissionKey(permissionKey)
    return permissions.some((p) => p.key === normalized || p.rawKey === permissionKey)
  }

  const hasAnyPermission = () => permissions.length > 0

  const hasAdminAccess = () => {
    return permissions.some((p) => p.key === 'ACCESS_ADMIN_DASHBOARD' || p.rawKey === 'Application Access.Admin Dashboard')
  }
  

  const getScope = (permissionKey) => {
    const normalized = normalizePermissionKey(permissionKey)
    const perm = permissions.find((p) => p.key === normalized || p.rawKey === permissionKey)
    return perm ? perm.scope : null
  }

  const value = {
    permissions,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAdminAccess,
    getScope,
  }

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>
}

export const usePermissions = () => useContext(PermissionContext)
