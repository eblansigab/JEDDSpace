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
  }
}
