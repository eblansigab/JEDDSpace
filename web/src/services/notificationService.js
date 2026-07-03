import { supabaseClient } from '../supabase/supabaseClient'

export const PRIORITY_LEVELS = ['Low', 'Normal', 'High', 'Critical']

export const NOTIFICATION_TYPES = [
  'general',
  'announcement',
  'job_assignment',
  'employee_update',
]

export const getNotificationId = (item) =>
  item?.notifications_id ?? item?.notification_id ?? item?.id ?? null

const buildNotificationTitle = (title, message) => {
  const headline = String(title || '').trim()
  const detail = String(message || '').trim()

  if (headline && detail && headline !== detail) {
    return `${headline} — ${detail}`
  }

  return detail || headline || 'Alert'
}

export const getNotificationBody = (item) => {
  const title = String(item?.title || '').trim()
  const separator = ' — '

  if (title.includes(separator)) {
    return title.split(separator).slice(1).join(separator).trim()
  }

  return ''
}

export const notificationService = {
  async createNotification({
    title,
    message,
    type = 'general',
    priority = 'Normal',
    userId,
    notifyTo,
    linkId,
  }) {
    const payload = {
      title: buildNotificationTitle(title, message),
      type,
      priority,
      is_read: false,
    }

    if (userId) {
      payload.created_by = userId
    }

    if (notifyTo) {
      payload.notify_to = notifyTo
    }

    if (linkId) {
      payload.link_id = linkId
    }

    const { data, error } = await supabaseClient
      .from('notification')
      .insert([payload])
      .select()
      .single()

    if (error) throw error

    return data
  },

  async getNotifications(employeeId) {
    let query = supabaseClient
      .from('notification')
      .select('*')
      .order('created_at', { ascending: false })

    if (employeeId) {
      query = query.or(`notify_to.eq.${employeeId},notify_to.is.null`)
    }

    const { data, error } = await query

    if (error) throw error

    return data || []
  },

  async updatePriority(notificationId, priority) {
    const { data, error } = await supabaseClient
      .from('notification')
      .update({ priority })
      .eq('notifications_id', notificationId)
      .select()
      .single()

    if (error) throw error

    return data
  },

  async markAsRead(notificationId) {
    const { error } = await supabaseClient
      .from('notification')
      .update({ is_read: true })
      .eq('notifications_id', notificationId)

    if (error) throw error

    return true
  },

  async markAllRead() {
    const { error } = await supabaseClient
      .from('notification')
      .update({ is_read: true })
      .eq('is_read', false)

    if (error) throw error

    return true
  },

  subscribeToInserts(onInsert) {
    const channel = supabaseClient
      .channel('jeddspace-push-alerts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notification' },
        (payload) => onInsert(payload.new)
      )
      .subscribe()

    return () => {
      supabaseClient.removeChannel(channel)
    }
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
  },
}
