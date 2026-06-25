import { supabaseClient } from '../supabase/supabaseClient'

export const profileService = {
  /**
   * Update account details. Uses upsert to handle the case where the
   * employee record doesn't exist yet (e.g. user registered but the
   * email-confirmation flow was bypassed and the record was never created).
   */
  async updateAccountDetails(userId, updates) {
    // First, try to update. If no row is affected, do an upsert.
    const { data: existing } = await supabaseClient
      .from('employee')
      .select('employee_id, first_name, last_name, department, position')
      .eq('user_id', userId)
      .maybeSingle()

    if (existing) {
      const updatePayload = {}

      if (updates.first_name?.trim()) {
        updatePayload.first_name = updates.first_name.trim()
      }

      if (updates.last_name?.trim()) {
        updatePayload.last_name = updates.last_name.trim()
      }

      if (updates.department?.trim()) {
        updatePayload.department = updates.department.trim()
      }

      if (updates.position?.trim()) {
        updatePayload.position = updates.position.trim()
      }

      const { data, error } = await supabaseClient
        .from('employee')
        .update(updatePayload)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error
      return data
    }

    // No employee record exists yet — create one.
    const payload = {
      user_id: userId,
      auth_user_id: userId,
      first_name: updates.first_name?.trim() || existing?.first_name || 'Unknown',
      last_name: updates.last_name?.trim() || existing?.last_name || 'User',
      department: updates.department?.trim() || existing?.department || 'general',
      position: updates.position?.trim() || existing?.position || 'employee',
    }

    const { data, error } = await supabaseClient
      .from('employee')
      .insert([payload])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getCurrentSession() {
    const {
      data: { session },
      error
    } = await supabaseClient.auth.getSession()

    if (error) throw error

    return session
  },

  async checkServerAccountStatus(userId) {
    const { data: employeeData, error: employeeError } = await supabaseClient
      .from('employee')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (employeeError) throw employeeError

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError) throw authError

    return {
      employee: employeeData,
      user,
      verifiedAt: new Date().toISOString()
    }
  },

  async updateAuthMetadata(metadataUpdates) {
    const { data, error } = await supabaseClient.auth.updateUser({
      data: metadataUpdates
    })

    if (error) throw error
    return data.user
  }
}
