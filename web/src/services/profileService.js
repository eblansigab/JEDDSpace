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
  }
}
