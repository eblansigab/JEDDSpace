import { getSupabaseServerClient } from '../ai/supabaseClient.js'

const PERMISSION_CACHE_TTL_MS = 5 * 60 * 1000
const ROLE_CACHE_TTL_MS = 5 * 60 * 1000

class PermissionService {
  constructor() {
    this.permissionCache = new Map()
    this.roleCache = new Map()
  }

  async loadPermissionsByRoleId(roleId) {
    if (!roleId) return []

    const now = Date.now()
    const cached = this.permissionCache.get(roleId)
    if (cached && now - cached.ts < PERMISSION_CACHE_TTL_MS) {
      return cached.permissions
    }

    const client = getSupabaseServerClient()
    const { data, error } = await client
      .from('role_permissions')
      .select('permission_id, scope, permission:permission_id (module, action)')
      .eq('role_id', roleId)

    if (error || !data) {
      return []
    }

    const permissions = data.map((row) => {
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

    this.permissionCache.set(roleId, { permissions, ts: now })
    return permissions
  }

  async loadRole(employeeId) {
    const cacheKey = `employee_${employeeId}`
    const now = Date.now()
    const cached = this.roleCache.get(cacheKey)
    if (cached && now - cached.ts < ROLE_CACHE_TTL_MS) {
      return cached.role
    }

    const client = getSupabaseServerClient()
    const { data, error } = await client
      .from('employee')
      .select('role_id, role, roles:role_id (role_name, parent_role_id, hierarchy_level)')
      .eq('employee_id', employeeId)
      .maybeSingle()

    if (error || !data) {
      return null
    }

    const role = {
      role_id: data.role_id,
      role_name: data.roles?.role_name || data.role || 'employee',
      parent_role_id: data.roles?.parent_role_id || null,
      hierarchy_level: data.roles?.hierarchy_level || 0,
    }

    this.roleCache.set(cacheKey, { role, ts: now })
    return role
  }

  async getUserPermissions(employeeId) {
    const role = await this.loadRole(employeeId)
    if (!role || !role.role_id) return []
    return this.loadPermissionsByRoleId(role.role_id)
  }

  hasPermission(permissions, permissionKey) {
    return permissions.some((p) => p.key === permissionKey)
  }

  getScope(permissions, permissionKey) {
    const perm = permissions.find((p) => p.key === permissionKey)
    return perm ? perm.scope : null
  }

  invalidateCache(employeeId) {
    if (employeeId) {
      this.roleCache.delete(`employee_${employeeId}`)
    } else {
      this.roleCache.clear()
      this.permissionCache.clear()
    }
  }
}

export const permissionService = new PermissionService()
const VALID_SCOPES = ['SELF', 'DEPARTMENT', 'SUBORDINATE', 'ALL']
export { VALID_SCOPES }
