import { getSupabaseServerClient } from './supabaseClient.js'
import { permissionService } from './permissionService.js'

class HierarchyResolver {
  async getSubordinates(employeeId) {
    const role = await permissionService.loadRole(employeeId)
    if (!role || !role.role_id) return []

    const client = getSupabaseServerClient()
    const { data, error } = await client
      .from('employee')
      .select('employee_id, role_id, department, roles:role_id (hierarchy_level, parent_role_id)')
      .eq('is_archived', false)
      .eq('employment_status', 'active')

    if (error || !data) return []

    const employeeRole = role
    const subordinates = []

    for (const emp of data) {
      if (emp.employee_id === employeeId) continue

      const empRoleLevel = emp.roles?.hierarchy_level ?? 0
      const empParentRoleId = emp.roles?.parent_role_id ?? null

      if (
        empParentRoleId === employeeRole.role_id ||
        empRoleLevel < employeeRole.hierarchy_level
      ) {
        subordinates.push({
          employee_id: emp.employee_id,
          role_id: emp.role_id,
          department: emp.department,
        })
      }
    }

    return subordinates
  }

  async getDepartmentEmployees(employeeId) {
    const client = getSupabaseServerClient()
    const { data, error } = await client
      .from('employee')
      .select('employee_id, department')
      .eq('employee_id', employeeId)
      .maybeSingle()

    if (error || !data?.department) return []

    const { data: deptEmployees, error: deptError } = await client
      .from('employee')
      .select('employee_id')
      .eq('department', data.department)
      .eq('is_archived', false)
      .eq('employment_status', 'active')

    if (deptError || !deptEmployees) return []
    return deptEmployees.map((e) => e.employee_id)
  }

  resolveScopeFilter(scope, employeeId) {
    switch (scope) {
      case 'SELF':
        return { employee_id: employeeId }
      case 'DEPARTMENT':
        return { department: null }
      case 'SUBORDINATE':
        return { employee_id: null }
      case 'ALL':
        return null
      default:
        return { employee_id: employeeId }
    }
  }
}

export const hierarchyResolver = new HierarchyResolver()
