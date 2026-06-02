import { supabaseClient } from '../supabase/supabaseClient'

export const ANNOUNCEMENT_STATUSES = ['Published', 'Draft', 'Archived']

export const announcementService = {
  async createAnnouncement(data) {
    const payload = {
      title: data.title?.trim(),
      body: data.body?.trim(),
      status: data.status || 'Draft'
    }

    if (data.userId) {
      payload.user_id = data.userId
    }

    const { data: result, error } = await supabaseClient
      .from('announcement')
      .insert([payload])
      .select()
      .single()

    if (error) {
      throw error
    }

    return result
  },

  async updateAnnouncement(announcementId, updates) {
    const payload = {
      ...updates,
      title: updates.title?.trim(),
      body: updates.body?.trim()
    }

    const { data, error } = await supabaseClient
      .from('announcement')
      .update(payload)
      .eq('announcement_id', announcementId)
      .select()
      .single()

    if (error) {
      const fallback = await supabaseClient
        .from('announcement')
        .update(payload)
        .eq('id', announcementId)
        .select()
        .single()

      if (fallback.error) {
        throw error
      }

      return fallback.data
    }

    return data
  },

  async getAnnouncements() {
    const { data, error } = await supabaseClient
      .from('announcement')
      .select('*')
      .order('created_at', {
        ascending: false
      })

    if (error) {
      throw error
    }

    return data || []
  }
}
