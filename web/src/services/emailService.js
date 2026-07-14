import { supabaseClient } from '../supabase/supabaseClient'

export const emailService = {
  async getEmailLogs() {
    const { data, error } = await supabaseClient
      .from('email')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[emailService] Error fetching database email logs:', error)
      throw error
    }

    return (data || []).map((msg) => ({
      ...msg,
      id: msg.email_id,
      recipient: msg.recipient_email,
      body: msg.message_body,
      type: msg.folder || 'inbox'
    }))
  },

  async createEmailLog({ subject, body, recipient, type = 'inbox', senderId }) {
    const payload = {
      subject,
      message_body: body,
      recipient_email: recipient,
      folder: type || 'inbox',
      sender_id: senderId || null
    }

    const { data, error } = await supabaseClient
      .from('email')
      .insert([payload])
      .select()

    if (error) {
      console.error('[emailService] Error saving email to database:', error)
      throw error
    }

    return data?.[0] || null
  },

  async markAsRead(emailId) {
    const { error } = await supabaseClient
      .from('email')
      .update({
        is_read: true
      })
      .eq('email_id', emailId)

    if (error) throw error

    return true
  },

  async deleteMessage(emailId) {
    const { error } = await supabaseClient
      .from('email')
      .delete()
      .eq('email_id', emailId)

    if (error) throw error

    return true
  },

  async getEmployeeDirectory() {
    const { data, error } = await supabaseClient
      .from('employee')
      .select('employee_id, first_name, last_name, email')
      .order('first_name', { ascending: true })

    if (error) {
      console.error('[emailService] Error fetching employee directory:', error)
      throw error
    }

    return (data || []).map((emp) => ({
      employee_id: emp.employee_id,
      full_name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
      email: emp.email || ''
    }))
  },

  async getUnreadCount({ email, employeeId }) {
    const myEmail = String(email || '').trim().toLowerCase()

    if (!myEmail) return 0

    const directQuery = supabaseClient
      .from('email')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_email', myEmail)
      .eq('is_read', false)

    const broadcastQuery = supabaseClient
      .from('email')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_email', 'all')
      .eq('is_read', false)

    const myEmployeeId = Number(employeeId)

    if (Number.isFinite(myEmployeeId) && myEmployeeId > 0) {
      directQuery.neq('sender_id', myEmployeeId)
      broadcastQuery.neq('sender_id', myEmployeeId)
    }

    const [{ count: directCount, error: directError }, { count: broadcastCount, error: broadcastError }] =
      await Promise.all([directQuery, broadcastQuery])

    if (directError) {
      console.error('[emailService] Error counting unread emails:', directError)
      return 0
    }

    if (broadcastError) {
      console.error('[emailService] Error counting broadcast unread emails:', broadcastError)
      return directCount || 0
    }

    return (directCount || 0) + (broadcastCount || 0)
  },

  async getMessageAttachments(emailId) {
    const { data, error } = await supabaseClient
      .from('email_attachment')
      .select('*')
      .eq('email_id', emailId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[emailService] Error fetching message attachments:', error)
      throw error
    }

    return data || []
  }
}

