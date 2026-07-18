import { supabaseClient } from '../supabase/supabaseClient'

const SAVE_DEBOUNCE_MS = 400

const debounce = (fn, delay) => {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

export const rolePermissionService = {
  async getCurrentEmployee() {
    const { data: { session } } = await supabaseClient.auth.getSession()
    if (!session?.user?.id) {
      throw new Error('No active session.')
    }

    const { data: employee, error } = await supabaseClient
      .from('employee')
      .select('employee_id, role_id, roles:role_id (role_name, hierarchy_level)')
      .eq('user_id', session.user.id)
      .single()

    if (error) throw error
    if (!employee) throw new Error('Employee record not found.')

    return {
      employee_id: employee.employee_id,
      role_id: employee.role_id,
      role_name: employee.roles?.role_name || 'employee',
      hierarchy_level: employee.roles?.hierarchy_level || 0,
    }
  },

  async getManageableRoles() {
    const current = await this.getCurrentEmployee()

    const { data, error } = await supabaseClient
      .from('roles')
      .select('*')
      .gt('hierarchy_level', current.hierarchy_level)
      .order('hierarchy_level', { ascending: false })

    if (error) throw error

    return (data || []).map((role) => ({
      role_id: role.role_id,
      role_name: role.role_name,
      description: role.description,
      hierarchy_level: role.hierarchy_level,
      parent_role_id: role.parent_role_id,
      is_protected: role.is_protected === true || role.hierarchy_level === 1,
    }))
  },

  async getAllPermissions() {
    const { data, error } = await supabaseClient
      .from('permissions')
      .select('permission_id, module, action, description')
      .order('module', { ascending: true })
      .order('action', { ascending: true })

    if (error) throw error

    return (data || []).map((perm) => ({
      permission_id: perm.permission_id,
      module: perm.module,
      action: perm.action,
      description: perm.description,
      rawKey: `${perm.module}.${perm.action}`,
    }))
  },

  async getRolePermissions(roleId) {
    const [current, manageableRoles, allPermissions] = await Promise.all([
      this.getCurrentEmployee(),
      this.getManageableRoles(),
      this.getAllPermissions(),
    ])

    const targetRole = manageableRoles.find((r) => r.role_id === Number(roleId))
    if (!targetRole) {
      throw new Error('Role not found or not manageable.')
    }

    const [{ data: rolePerms, error: rolePermsError }, { count: permissionCount }] = await Promise.all([
      supabaseClient
        .from('role_permissions')
        .select('permission_id, scope')
        .eq('role_id', targetRole.role_id),
      supabaseClient
        .from('employee')
        .select('*', { count: 'exact', head: true })
        .eq('role_id', targetRole.role_id)
        .eq('is_archived', false)
        .eq('employment_status', 'active'),
    ])

    if (rolePermsError) throw rolePermsError

    const permMap = new Map(allPermissions.map((p) => [p.permission_id, p]))

    return {
      currentRoleId: current.role_id,
      currentHierarchyLevel: current.hierarchy_level,
      manageableRoles,
      allPermissions,
      selectedRoleId: targetRole.role_id,
      isProtected: targetRole.is_protected || false,
      selectedRolePermissions: (rolePerms || []).map((row) => {
        const perm = permMap.get(row.permission_id) || {}
        return {
          permission_id: row.permission_id,
          rawKey: `${perm.module || ''}.${perm.action || ''}`,
          scope: row.scope || 'ALL',
        }
      }),
      roleStats: {
        permissionCount: rolePerms?.length || 0,
        usersAssigned: Number(permissionCount || 0),
        hierarchyLevel: targetRole.hierarchy_level,
        isProtected: targetRole.is_protected === true || targetRole.hierarchy_level === 1,
      },
    }
  },

  async saveRolePermissions(targetRoleId, permissionUpdates) {
    const current = await this.getCurrentEmployee()

    if (current.role_id === Number(targetRoleId)) {
      throw new Error('You cannot edit your own role permissions.')
    }

    const { data: targetRole, error: targetRoleError } = await supabaseClient
      .from('roles')
      .select('*')
      .eq('role_id', targetRoleId)
      .single()

    if (targetRoleError || !targetRole) {
      throw new Error('Target role not found.')
    }

    if (targetRole.hierarchy_level <= current.hierarchy_level) {
      throw new Error('You cannot edit a role at or above your hierarchy level.')
    }

    if (targetRole.is_protected === true || targetRole.hierarchy_level === 1) {
      throw new Error('This role is protected and cannot be modified.')
    }

    const validUpdates = permissionUpdates
      .filter((update) => Number.isFinite(Number(update.permission_id)))
      .map((update) => ({
        role_id: targetRoleId,
        permission_id: Number(update.permission_id),
        scope: String(update.scope || 'ALL').trim() || 'ALL',
      }))

    const { error: deleteError } = await supabaseClient
      .from('role_permissions')
      .delete()
      .eq('role_id', targetRoleId)

    if (deleteError) throw deleteError

    if (validUpdates.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('role_permissions')
        .insert(validUpdates)

      if (insertError) throw insertError
    }

    return {
      role_id: targetRoleId,
      updatedCount: validUpdates.length,
    }
  },

  createAutoSave(targetRoleId, onSuccess, onFailure) {
    const save = debounce(async (permissionUpdates) => {
      try {
        const result = await this.saveRolePermissions(targetRoleId, permissionUpdates)
        if (onSuccess) onSuccess(result)
        return { success: true }
      } catch (error) {
        if (onFailure) onFailure(error)
        return { success: false, error: error.message }
      }
    }, SAVE_DEBOUNCE_MS)

    return {
      save,
      cancel: () => {},
    }
  },
}
