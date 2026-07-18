import { getSupabaseServerClient } from '../ai/supabaseClient.js'
import { permissionService } from '../services/permissionService.js'

export const handleListRolePermissions = async ({ viewer, targetRoleId = null }) => {
  const hasAccess = permissionService.hasPermission(viewer.permissions || [], 'EMP_ROLE')
  if (!hasAccess) {
    return { status: viewer?.user?.id ? 403 : 401, error: 'Role management access required' }
  }

  const client = getSupabaseServerClient()
  const currentHierarchyLevel = viewer.employee?.hierarchy_level ?? 0
  const currentRoleId = viewer.employee?.role_id ?? null

  const [rolesResult, permissionsResult] = await Promise.all([
    client
      .from('roles')
      .select('*')
      .gt('hierarchy_level', currentHierarchyLevel)
      .order('hierarchy_level', { ascending: false }),
    client
      .from('permissions')
      .select('permission_id, module, action, description')
      .order('module', { ascending: true })
      .order('action', { ascending: true }),
  ])

  if (rolesResult.error) {
    return { status: 500, error: 'Failed to load roles.' }
  }

  if (permissionsResult.error) {
    return { status: 500, error: 'Failed to load permissions.' }
  }

  const manageableRoles = (rolesResult.data || []).map((role) => ({
    role_id: role.role_id,
    role_name: role.role_name,
    description: role.description,
    hierarchy_level: role.hierarchy_level,
    parent_role_id: role.parent_role_id,
    is_protected: role.is_protected === true || role.hierarchy_level === 1,
  }))

  const allPermissions = (permissionsResult.data || []).map((perm) => ({
    permission_id: perm.permission_id,
    module: perm.module,
    action: perm.action,
    description: perm.description,
    rawKey: `${perm.module}.${perm.action}`,
  }))

  let selectedRoleId = targetRoleId
  if (!selectedRoleId && manageableRoles.length > 0) {
    selectedRoleId = manageableRoles[0].role_id
  }

  let selectedRolePermissions = []
  if (selectedRoleId) {
    const rolePermsResult = await client
      .from('role_permissions')
      .select('permission_id, scope')
      .eq('role_id', selectedRoleId)

    if (!rolePermsResult.error && rolePermsResult.data) {
      const permMap = new Map(allPermissions.map((p) => [p.permission_id, p]))
      selectedRolePermissions = rolePermsResult.data.map((row) => {
        const perm = permMap.get(row.permission_id) || {}
        return {
          permission_id: row.permission_id,
          rawKey: `${perm.module || ''}.${perm.action || ''}`,
          scope: row.scope || 'ALL',
        }
      })
    }
  }

  return {
    data: {
      currentRoleId,
      currentHierarchyLevel,
      manageableRoles,
      allPermissions,
      selectedRoleId,
      selectedRolePermissions,
    },
  }
}

export const handleSaveRolePermissions = async ({ viewer, payload }) => {
  const hasAccess = permissionService.hasPermission(viewer.permissions || [], 'EMP_ROLE')
  if (!hasAccess) {
    return { status: viewer?.user?.id ? 403 : 401, error: 'Role management access required' }
  }

  const targetRoleId = Number(payload?.targetRoleId)
  const permissionUpdates = Array.isArray(payload?.permissionUpdates) ? payload.permissionUpdates : []

  if (!Number.isFinite(targetRoleId) || targetRoleId <= 0) {
    return { status: 400, error: 'Invalid target role.' }
  }

  if (permissionUpdates.length === 0) {
    return { status: 400, error: 'No permission updates provided.' }
  }

  const client = getSupabaseServerClient()
  const currentRoleId = viewer.employee?.role_id ?? null
  const currentHierarchyLevel = viewer.employee?.hierarchy_level ?? 0

  if (currentRoleId && targetRoleId === currentRoleId) {
    return { status: 403, error: 'You cannot edit your own role permissions.' }
  }

  let targetRole
  let targetRoleError

  try {
    const result = await client
      .from('roles')
      .select('*')
      .eq('role_id', targetRoleId)
      .maybeSingle()

    targetRole = result.data
    targetRoleError = result.error
  } catch (queryError) {
    targetRole = null
    targetRoleError = queryError
  }

  if (targetRoleError || !targetRole) {
    return { status: 404, error: 'Target role not found.' }
  }

  if (targetRole.is_protected === true || targetRole.hierarchy_level === 1) {
    return { status: 403, error: 'This role is protected and cannot be modified.' }
  }

  const targetHierarchyLevel = targetRole.hierarchy_level ?? 0

  if (targetHierarchyLevel <= currentHierarchyLevel) {
    return { status: 403, error: 'You cannot edit a role at or above your hierarchy level.' }
  }

  const validUpdates = permissionUpdates
    .filter((update) => Number.isFinite(Number(update.permission_id)))
    .map((update) => ({
      role_id: targetRoleId,
      permission_id: Number(update.permission_id),
      scope: String(update.scope || 'ALL').trim() || 'ALL',
    }))

  if (validUpdates.length === 0) {
    return { status: 400, error: 'No valid permission updates provided.' }
  }

  const { error: deleteError } = await client
    .from('role_permissions')
    .delete()
    .eq('role_id', targetRoleId)

  if (deleteError) {
    return { status: 500, error: 'Failed to clear existing permissions.' }
  }

  const { error: insertError } = await client
    .from('role_permissions')
    .insert(validUpdates)

  if (insertError) {
    return { status: 500, error: 'Failed to save permissions.' }
  }

  permissionService.invalidateCache(null)

  return {
    data: {
      role_id: targetRoleId,
      updatedCount: validUpdates.length,
    },
  }
}
