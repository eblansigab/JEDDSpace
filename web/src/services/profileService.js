import { supabaseClient } from '../supabase/supabaseClient'

export const profileService = {
  async updateAccountDetails(userId, updates) {
    const payload = {
      first_name: updates.first_name?.trim(),
      last_name: updates.last_name?.trim(),
      department: updates.department?.trim(),
      position: updates.position?.trim()
    }

    const { data, error } = await supabaseClient
      .from('employee')
      .update(payload)
      .eq('user_id', userId)
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
    // Perform a direct backend/database query to get the fresh employee profile status
    const { data: employeeData, error: employeeError } = await supabaseClient
      .from('employee')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (employeeError) throw employeeError

    // Also get auth status from the session
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
