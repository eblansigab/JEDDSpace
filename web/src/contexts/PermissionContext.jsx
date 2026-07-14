import { createContext, useContext, useEffect, useState, useRef } from 'react'
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
  const adminPermissionCountRef = useRef(0)

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
            adminPermissionCountRef.current = 0
            setLoading(false)
          }
          return
        }

        const { data: employee, error } = await supabaseClient
          .from('employee')
          .select('employee_id, role_id')
          .eq('user_id', userId)
          .maybeSingle()

        if (error || !employee?.employee_id) {
          console.warn('[PermissionContext] Employee lookup failed.', { userId, employee, error })
          if (mounted) {
            setPermissions([])
            adminPermissionCountRef.current = 0
            setLoading(false)
          }
          return
        }

        console.log('[PermissionContext] Loaded employee for user_id:', userId, 'employee_id:', employee.employee_id, 'role_id:', employee.role_id)

        if (!employee.role_id) {
          console.warn('[PermissionContext] Employee has no role_id.', { employeeId: employee.employee_id })
          if (mounted) {
            setPermissions([])
            adminPermissionCountRef.current = 0
            setLoading(false)
          }
          return
        }

        const [rolePermsResult, permissionsResult] = await Promise.all([
          supabaseClient
            .from('role_permissions')
            .select('permission_id, scope')
            .eq('role_id', employee.role_id),
          supabaseClient
            .from('permissions')
            .select('permission_id, module, action'),
        ])

        const rolePerms = rolePermsResult.data || []
        const permError = rolePermsResult.error
        const allPermissions = permissionsResult.data || []
        const permissionsError = permissionsResult.error

        console.log('[PermissionContext] employee.role_id raw value:', employee.role_id, 'type:', typeof employee.role_id)
        console.log('[PermissionContext] Raw role_permissions query result:', JSON.stringify(rolePerms))
        console.log('[PermissionContext] Raw permissions query result count:', allPermissions.length)

        const permissionMap = new Map(
          (allPermissions || []).map((perm) => [perm.permission_id, perm])
        )

        const rolePermissionCount = rolePerms.length
        if (mounted) {
          adminPermissionCountRef.current = rolePermissionCount
        }

        console.log('[PermissionContext] role_permissions count:', rolePermissionCount)
        console.log('[PermissionContext] permissions table count:', allPermissions.length)
        console.log('Permission Error:', permError)
        console.log('Permissions Table Error:', permissionsError)

        if (permError) {
          console.warn('[PermissionContext] role_permissions query failed.', permError)
        }

        const userPermissions = rolePerms.map((row) => {
          const perm = permissionMap.get(row.permission_id) || {}
          const module = String(perm.module || '').trim()
          const action = String(perm.action || '').trim()
          const rawKey = module && action ? `${module}.${action}` : ''
          const csvCode = normalizePermissionKey(rawKey)
          return {
            permission_id: row.permission_id,
            key: csvCode,
            rawKey,
            module,
            action,
            scope: row.scope || 'ALL',
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
          adminPermissionCountRef.current = 0
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
    if (adminPermissionCountRef.current === 0) return false
    return permissions.some((p) => ADMIN_PERMISSION_CODES.has(p.key))
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
