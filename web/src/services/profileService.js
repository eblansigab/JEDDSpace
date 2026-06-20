import { supabaseClient } from '../supabase/supabaseClient'

export const profileService = {
  /**
   * Update account details. Uses upsert to handle the case where the
   * employee record doesn't exist yet (e.g. user registered but the
   * email-confirmation flow was bypassed and the record was never created).
   */
  async updateAccountDetails(userId, updates) {
    const payload = {
      user_id: userId,
      auth_user_id: userId,
      first_name: updates.first_name?.trim() || null,
      last_name: updates.last_name?.trim() || null,
      department: updates.department?.trim() || null,
      position: updates.position?.trim() || null,
    }

    // First, try to update. If no row is affected, do an upsert.
    const { data: existing } = await supabaseClient
      .from('employee')
      .select('employee_id')
      .eq('user_id', userId)
      .maybeSingle()

    if (existing) {
      const { data, error } = await supabaseClient
        .from('employee')
        .update({
          first_name: payload.first_name,
          last_name: payload.last_name,
          department: payload.department,
          position: payload.position,
        })
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error
      return data
    }

    // No employee record exists yet — create one.
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
