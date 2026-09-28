import { supabaseClient } from '../supabase/supabaseClient'

export const emailService = {
  async getEmailLogs({ department, employeeId, email } = {}) {
    const myEmail = String(email || '').trim().toLowerCase()
    const myDepartment = String(department || '').trim().toLowerCase()

    const orParts = []

    if (myEmail) {
      orParts.push(`recipient_email.ilike.${myEmail}`)
    }

    orParts.push('visibility_scope.eq.ORGANIZATION')

    if (myDepartment) {
      orParts.push(`and(visibility_scope.eq.DEPARTMENT,visibility_target.ilike.${myDepartment})`)
    }

    if (employeeId) {
      orParts.push(`sender_id.eq.${employeeId}`)
    }

    let query = supabaseClient
      .from('email')
      .select('*')
      .order('created_at', { ascending: false })

    if (orParts.length > 0) {
      query = query.or(orParts.join(','))
    }

    const { data, error } = await query

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

  async createEmailLog({ subject, body, recipient, type = 'inbox', senderId, visibilityScope, visibilityTarget }) {
  const payload = {
    subject,
    message_body: body,
    recipient_email: recipient || null,
    folder: type || 'inbox',
    sender_id: senderId || null,
    visibility_scope: visibilityScope || 'ORGANIZATION',
    visibility_target: visibilityTarget || null
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

  async getUnreadCount({ email, employeeId, department }) {
    const myEmail = String(email || '').trim().toLowerCase()
    const myDepartment = String(department || '').trim().toLowerCase()

    if (!myEmail) return 0

    const myEmployeeId = Number(employeeId)
    const excludesSelf = Number.isFinite(myEmployeeId) && myEmployeeId > 0

    const visibilityParts = [`recipient_email.eq.${myEmail}`, 'visibility_scope.eq.ORGANIZATION']
    if (myDepartment) {
      visibilityParts.push(`and(visibility_scope.eq.DEPARTMENT,visibility_target.ilike.${myDepartment})`)
    }

    let unreadQ = supabaseClient
      .from('email')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false)
      .neq('folder', 'announcement')
      .or(visibilityParts.join(','))
    if (excludesSelf) unreadQ = unreadQ.neq('sender_id', myEmployeeId)

    const { count, error } = await unreadQ
    if (error) {
      console.error('[emailService] Error counting unread emails:', error)
      throw error
    }

    return count || 0
  }
}

