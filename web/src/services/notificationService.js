import { supabaseClient } from '../supabase/supabaseClient'

export const PRIORITY_LEVELS = ['Low', 'Normal', 'High', 'Critical']

export const notificationService = {
  async createNotification({ title, message, type = 'general', priority = 'Normal', userId }) {
    const payload = {
      title,
      message,
      type,
      priority,
      is_read: false
    }

    if (userId) {
      payload.user_id = userId
    }

    const { data, error } = await supabaseClient
      .from('notification')
      .insert([payload])
      .select()
      .single()

    if (!error) {
      return data
    }

    const fallbackPayload = {
      title,
      message,
      type
    }

    if (userId) {
      fallbackPayload.user_id = userId
    }

    const fallback = await supabaseClient
      .from('notification')
      .insert([fallbackPayload])
      .select()
      .single()

    if (fallback.error) {
      throw error
    }

    return fallback.data
  },

  async getNotifications() {
    const { data, error } = await supabaseClient
      .from('notification')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return data || []
  },

  async updatePriority(notificationId, priority) {
    const { data, error } = await supabaseClient
      .from('notification')
      .update({ priority })
      .eq('notification_id', notificationId)
      .select()
      .single()

    if (error) {
      const fallback = await supabaseClient
        .from('notification')
        .update({ priority })
        .eq('id', notificationId)
        .select()
        .single()

      if (fallback.error) throw error

      return fallback.data
    }

    return data
  },

  async markAllRead() {
    const { error } = await supabaseClient
      .from('notification')
      .update({ is_read: true })
      .eq('is_read', false)

    if (error) throw error

    return true
  },

  async deleteOlderThan(days = 30) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)

    const { error } = await supabaseClient
      .from('notification')
      .delete()
      .lt('created_at', cutoff.toISOString())

    if (error) throw error

    return true
  }
}
