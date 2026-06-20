import { supabaseClient } from '../supabase/supabaseClient'

export const employeeService = {
  async getAll() {
    const { data, error } = await supabaseClient
      .from('employee')
      .select('*')

    if (error) throw error

    return data
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
    const { data, error } = await supabaseClient
      .from('employee')
      .delete()
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
  }
}
