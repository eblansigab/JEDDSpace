import { createContext, useContext, useEffect, useState } from 'react'
import { supabaseClient } from '../supabase/supabaseClient'

const PermissionContext = createContext({
  permissions: [],
  loading: true,
  hasPermission: () => false,
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

        const { data: employee, error } = await supabaseClient
          .from('employee')
          .select('employee_id, role_id')
          .eq('user_id', userId)
          .maybeSingle()

        if (error || !employee?.employee_id || !employee?.role_id) {
          if (mounted) {
            setPermissions([])
            setLoading(false)
          }
          return
        }

        const { data: rolePerms, error: permError } = await supabaseClient
          .from('role_permissions')
          .select('permission_id, scope, permission:permission_id (module, action)')
          .eq('role_id', employee.role_id)

        if (permError) {
          throw permError
        }

        const userPermissions = (rolePerms || []).map((row) => {
          const module = String(row.permission?.module || '').trim()
          const action = String(row.permission?.action || '').trim()
          return {
            permission_id: row.permission_id,
            key: module && action ? `${module}.${action}` : '',
            module,
            action,
            scope: row.scope || 'ALL',
          }
        })

        if (mounted) {
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
    return permissions.some((p) => p.key === permissionKey)
  }

  const getScope = (permissionKey) => {
    const perm = permissions.find((p) => p.key === permissionKey)
    return perm ? perm.scope : null
  }

  const value = {
    permissions,
    loading,
    hasPermission,
    getScope,
  }

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>
}

export const usePermissions = () => useContext(PermissionContext)
