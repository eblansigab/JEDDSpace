import { supabaseClient } from '../supabase/supabaseClient'

export const employeeService = {
  async getAll() {
    const { data, error } = await supabaseClient
      .from('employee')
      .select('*')

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
    const { data, error } = await supabaseClient
      .from('employee')
      .insert([employeeData])

    if (error) throw error

    return data
  },

  async update(employeeId, updates) {
    const { data, error } = await supabaseClient
      .from('employee')
      .update(updates)
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
