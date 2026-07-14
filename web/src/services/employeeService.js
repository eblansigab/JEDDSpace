import { supabaseClient } from '../supabase/supabaseClient'

const syncRoleFields = async (employeeData, existingRoleId = null) => {
  const roleId = employeeData.role_id || existingRoleId
  if (!roleId) {
    return employeeData
  }

  const { data: roleRow } = await supabaseClient
    .from('roles')
    .select('role_name')
    .eq('role_id', roleId)
    .maybeSingle()

  if (!roleRow) {
    return employeeData
  }

  return {
    ...employeeData,
    position: roleRow.role_name,
    role: roleRow.role_name,
  }
}

export const employeeService = {
  async getAll() {
    const { data, error } = await supabaseClient
      .from('employee')
      .select('*')
      .eq('is_archived', false)
      .order('first_name')

    if (error) throw error

    return data
  },

  async getManageable(viewer = null) {
    if (!viewer?.roleId) {
      return []
    }

    const { data: currentRole } = await supabaseClient
      .from('roles')
      .select('hierarchy_level')
      .eq('role_id', viewer.roleId)
      .maybeSingle()

    const currentHierarchyLevel = currentRole?.hierarchy_level

    if (!currentHierarchyLevel) {
      return []
    }

    const { data: subordinateRoles } = await supabaseClient
      .from('roles')
      .select('role_id')
      .gt('hierarchy_level', currentHierarchyLevel)

    const subordinateRoleIds = (subordinateRoles || []).map((role) => role.role_id)

    if (subordinateRoleIds.length === 0) {
      return []
    }

    const { data, error } = await supabaseClient
      .from('employee')
      .select('*')
      .eq('is_archived', false)
      .in('role_id', subordinateRoleIds)
      .order('first_name')

    if (error) throw error

    return data
  },

  async getFieldWorkers() {
    const { data, error } = await supabaseClient
      .from('employee')
      .select('employee_id, first_name, last_name, position, department, employee_type, employment_status, is_archived')
      .eq('employee_type', 'field_worker')
      .eq('employment_status', 'active')
      .eq('is_archived', false)
      .order('first_name')

    if (error) throw error

    return (data || []).map(({ employee_id, first_name, last_name, position, department }) => ({
      employee_id,
      first_name,
      last_name,
      position,
      department,
    }))
  },

  async getAssignableEmployees() {
    const { data, error } = await supabaseClient
      .from('employee')
      .select('employee_id, first_name, last_name, position, department, employee_type, employment_status, is_archived')
      .eq('employment_status', 'active')
      .eq('is_archived', false)
      .order('first_name')

    if (error) throw error

    return (data || []).map(({ employee_id, first_name, last_name, position, department }) => ({
      employee_id,
      first_name,
      last_name,
      position,
      department,
    }))
  },

  async create(employeeData) {
    const syncedData = await syncRoleFields(employeeData)

    const { data, error } = await supabaseClient
      .from('employee')
      .insert([syncedData])

    if (error) throw error

    return data
  },

  async update(employeeId, updates) {
    const { data: currentEmployee } = await supabaseClient
      .from('employee')
      .select('role_id')
      .eq('employee_id', employeeId)
      .maybeSingle()

    const syncedUpdates = await syncRoleFields(updates, currentEmployee?.role_id)

    const { data, error } = await supabaseClient
      .from('employee')
      .update(syncedUpdates)
      .eq('employee_id', employeeId)

    if (error) throw error

    return data
  },

  async updateByUserId(userId, updates) {
    const { data, error } = await supabaseClient
      .from('employee')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error

    return data
  },

  async remove(employeeId) {
    const { data: existing, error: fetchError } = await supabaseClient
      .from('employee')
      .select('employee_id, is_archived, employment_status')
      .eq('employee_id', employeeId)
      .maybeSingle()

    if (fetchError) throw fetchError

    if (!existing) {
      return null
    }

    const { data, error } = await supabaseClient
      .from('employee')
      .update({
        is_archived: true,
        employment_status: 'inactive'
      })
      .eq('employee_id', employeeId)

    if (error) throw error

    return data
  },

  async findByName(firstName, lastName) {
    const { data, error } = await supabaseClient
      .from('employee')
      .select('employee_id')
      .ilike('first_name', firstName)
      .ilike('last_name', lastName)
      .single()

    if (error) throw error

    return data
  },

  async getDirectory(){
    const { data, error } = await supabaseClient
      .from('employee_directory')
      .select('*')
      .order('first_name')

      if (error) throw error 

      return data
  },

}
