import { getSupabaseServerClient } from '../ai/supabaseClient.js'

const CSV_PERMISSION_CODES = new Set([
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
  if (CSV_PERMISSION_CODES.has(trimmed)) return trimmed
  return DB_KEY_TO_CSV_CODE[trimmed] || trimmed.toLowerCase()
}

const PERMISSION_CACHE_TTL_MS = 5 * 60 * 1000
const ROLE_CACHE_TTL_MS = 5 * 60 * 1000

const buildPermission = (perm, scope = 'ALL') => {
  const module = String(perm.module || '').trim()
  const action = String(perm.action || '').trim()
  const rawKey = module && action ? `${module}.${action}` : ''

  return {
    permission_id: perm.permission_id,
    key: normalizePermissionKey(rawKey),
    rawKey,
    module,
    action,
    scope,
  }
}

class PermissionService {
  constructor() {
    this.permissionCache = new Map()
    this.roleCache = new Map()
  }

  async loadRoleByRoleId(roleId) {
    if (!roleId) return null

    const cacheKey = `role_${roleId}`
    const now = Date.now()
    const cached = this.roleCache.get(cacheKey)
    if (cached && now - cached.ts < ROLE_CACHE_TTL_MS) {
      return cached.role
    }

    const client = getSupabaseServerClient()
    const { data, error } = await client
      .from('roles')
      .select('role_id, role_name, parent_role_id, hierarchy_level, is_protected')
      .eq('role_id', roleId)
      .maybeSingle()

    if (error || !data) {
      return null
    }

    const role = {
      role_id: data.role_id,
      role_name: data.role_name || 'employee',
      parent_role_id: data.parent_role_id || null,
      hierarchy_level: data.hierarchy_level || 0,
      is_protected: data.is_protected === true,
    }

    this.roleCache.set(cacheKey, { role, ts: now })
    return role
  }

  async loadPermissionsByRoleId(roleId, role = null) {
    if (!roleId) return []

    const now = Date.now()
    const cached = this.permissionCache.get(roleId)
    if (cached && now - cached.ts < PERMISSION_CACHE_TTL_MS) {
      return cached.permissions
    }

    const client = getSupabaseServerClient()
    const roleInfo = role || await this.loadRoleByRoleId(roleId)
    const permissionsResult = await client
      .from('permissions')
      .select('permission_id, module, action')

    const allPermissions = permissionsResult.data || []

    if (roleInfo?.is_protected === true) {
      const permissions = allPermissions.map((perm) => buildPermission(perm, 'ALL'))
      this.permissionCache.set(roleId, { permissions, ts: now })
      return permissions
    }

    const rolePermsResult = await client
      .from('role_permissions')
      .select('permission_id, scope')
      .eq('role_id', roleId)

    const rolePerms = rolePermsResult.data || []
    const permissionMap = new Map(
      (allPermissions || []).map((perm) => [perm.permission_id, perm])
    )

    const permissions = rolePerms.map((row) => {
      const perm = permissionMap.get(row.permission_id) || {}
      return buildPermission({ ...perm, permission_id: row.permission_id }, row.scope || 'ALL')
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
      .select('role_id, role, roles:role_id (role_name, parent_role_id, hierarchy_level, is_protected)')
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
      is_protected: data.roles?.is_protected === true,
    }

    this.roleCache.set(cacheKey, { role, ts: now })
    return role
  }

  async getUserPermissions(employeeId) {
    const role = await this.loadRole(employeeId)
    if (!role || !role.role_id) return []
    return this.loadPermissionsByRoleId(role.role_id, role)
  }

  async hasAdminAccess(employeeId) {
    const role = await this.loadRole(employeeId)
    if (!role || !role.role_id) return false

    const perms = await this.loadPermissionsByRoleId(role.role_id, role)
    return this.hasPermission(perms, 'ACCESS_ADMIN_DASHBOARD')
  }

  hasPermission(permissions, permissionKey) {
    const normalized = normalizePermissionKey(permissionKey)
    return permissions.some((p) => p.key === normalized || p.rawKey === permissionKey)
  }

  hasAnyPermission(permissions) {
    return permissions.length > 0
  }

  getScope(permissions, permissionKey) {
    const normalized = normalizePermissionKey(permissionKey)
    const perm = permissions.find((p) => p.key === normalized || p.rawKey === permissionKey)
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
