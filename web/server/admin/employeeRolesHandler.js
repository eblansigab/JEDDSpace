import { getSupabaseServerClient } from '../ai/supabaseClient.js'
import { permissionService } from '../services/permissionService.js'
import { getDepartmentForRole } from '../../src/utils/roleMetadata.js'

const ADMIN_DEPARTMENTS = new Set([
  'Finance & Administration',
  'Executive Management',
  'IT and Drafting',
])

const groupOfDepartment = (department) => {
  if (ADMIN_DEPARTMENTS.has(department)) return 'Admin'
  if (department === 'Engineering' || department === 'Operations') return 'Engineering'
  return null
}

const requireEmpRole = (viewer) => {
  const hasAccess = permissionService.hasPermission(viewer.permissions || [], 'EMP_ROLE')
  if (!hasAccess) {
    return { status: viewer?.user?.id ? 403 : 401, error: 'Role management access required' }
  }
  return null
}

export const handleGetEmployeeRoles = async ({ viewer, employeeId }) => {
  const denied = requireEmpRole(viewer)
  if (denied) return denied

  const targetId = Number(employeeId)
  if (!Number.isFinite(targetId) || targetId <= 0) {
    return { status: 400, error: 'Invalid employee id.' }
  }

  const client = getSupabaseServerClient()
  const { data, error } = await client
    .from('employee_roles')
    .select('role_id')
    .eq('employee_id', targetId)

  if (error) {
    return { status: 500, error: 'Failed to load employee roles.' }
  }

  const roleIds = (data || []).map((row) => row.role_id)
  return { data: { employeeId: targetId, roleIds } }
}

export const handleSaveEmployeeRoles = async ({ viewer, payload }) => {
  const denied = requireEmpRole(viewer)
  if (denied) return denied

  const targetEmployeeId = Number(payload?.targetEmployeeId)
  const roleIds = Array.isArray(payload?.roleIds) ? payload.roleIds.map(Number) : []

  if (!Number.isFinite(targetEmployeeId) || targetEmployeeId <= 0) {
    return { status: 400, error: 'Invalid target employee.' }
  }

  if (roleIds.length === 0) {
    return { status: 400, error: 'At least one role must be selected.' }
  }

  if (!roleIds.every((id) => Number.isFinite(id) && id > 0)) {
    return { status: 400, error: 'Invalid role selection.' }
  }

  const client = getSupabaseServerClient()
  const currentHierarchyLevel = viewer.employee?.hierarchy_level ?? 0

  const [targetResult, rolesResult] = await Promise.all([
    client
      .from('employee')
      .select('employee_id, role_id, roles:role_id (hierarchy_level)')
      .eq('employee_id', targetEmployeeId)
      .maybeSingle(),
    client
      .from('roles')
      .select('role_id, role_name, hierarchy_level, is_protected, parent_role_id')
      .in('role_id', roleIds),
  ])

  if (targetResult.error || !targetResult.data) {
    return { status: 404, error: 'Target employee not found.' }
  }

  const targetHierarchyLevel = targetResult.data.roles?.hierarchy_level ?? 0
  if (targetHierarchyLevel <= currentHierarchyLevel) {
    return { status: 403, error: 'You cannot manage a role at or above your own hierarchy level.' }
  }

  const selectedRoles = rolesResult.data || []
  if (selectedRoles.length !== roleIds.length) {
    return { status: 400, error: 'One or more selected roles do not exist.' }
  }

  for (const role of selectedRoles) {
    if ((role.hierarchy_level ?? 0) <= currentHierarchyLevel) {
      return { status: 403, error: 'You cannot assign a role at or above your own hierarchy level.' }
    }
    if (role.is_protected === true || role.hierarchy_level === 1) {
      return { status: 403, error: 'Protected roles cannot be assigned.' }
    }
  }

  const groups = new Set(
    selectedRoles.map((role) => groupOfDepartment(getDepartmentForRole(role.role_name)))
  )
  groups.delete(null)
  if (groups.size > 1) {
    return {
      status: 400,
      error: 'Cannot mix roles from different groups (Admin and Engineering).',
    }
  }

  const hasVp = selectedRoles.some(
    (role) => role.is_protected === true || role.hierarchy_level === 1
  )
  if (hasVp && selectedRoles.length > 1) {
    return { status: 403, error: 'The VP role cannot be combined with any other role.' }
  }

  const primaryRole = selectedRoles.reduce((lowest, role) =>
    (role.hierarchy_level ?? Infinity) < (lowest.hierarchy_level ?? Infinity) ? role : lowest
  )

  const primaryDepartment = getDepartmentForRole(primaryRole.role_name)
  const employeeDepartment =
    groupOfDepartment(primaryDepartment) === 'Admin' ? 'Administration' : 'Engineering'

  const { error: updateError } = await client
    .from('employee')
    .update({
      role_id: primaryRole.role_id,
      department: employeeDepartment,
    })
    .eq('employee_id', targetEmployeeId)

  if (updateError) {
    return { status: 500, error: 'Failed to update employee primary role.' }
  }

  const { data: existingRows } = await client
    .from('employee_roles')
    .select('role_id')
    .eq('employee_id', targetEmployeeId)

  const existingIds = new Set((existingRows || []).map((row) => row.role_id))
  const desiredIds = new Set(roleIds)

  const toInsert = roleIds.filter((id) => !existingIds.has(id))
  const toDelete = Array.from(existingIds).filter((id) => !desiredIds.has(id))

  if (toInsert.length > 0) {
    const { error: insertError } = await client
      .from('employee_roles')
      .insert(
        toInsert.map((roleId) => ({
          employee_id: targetEmployeeId,
          role_id: roleId,
          assigned_by: viewer.user?.id ?? null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }))
      )
    if (insertError) {
      return { status: 500, error: 'Failed to assign roles.' }
    }
  }

  if (toDelete.length > 0) {
    const { error: deleteError } = await client
      .from('employee_roles')
      .delete()
      .eq('employee_id', targetEmployeeId)
      .in('role_id', toDelete)
    if (deleteError) {
      return { status: 500, error: 'Failed to remove roles.' }
    }
  }

  if (toInsert.length > 0 || toDelete.length > 0) {
    const { error: touchError } = await client
      .from('employee_roles')
      .update({ updated_at: new Date().toISOString() })
      .eq('employee_id', targetEmployeeId)
    if (touchError) {
      return { status: 500, error: 'Failed to finalize role assignment.' }
    }
  }

  permissionService.invalidateCache(targetEmployeeId)

  return {
    data: {
      employeeId: targetEmployeeId,
      primaryRoleId: primaryRole.role_id,
      department: employeeDepartment,
      assigned: roleIds,
    },
  }
}
