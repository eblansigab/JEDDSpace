import { supabaseClient } from '../supabase/supabaseClient'

export const getEmployeeDirectory = async () => {
  const { data, error } = await supabaseClient
    .from('employee')
    .select('employee_id, first_name, last_name, email')
    .eq('is_archived', false)
    .eq('employment_status', 'active')
    .not('email', 'is', null)
    .order('first_name', { ascending: true })

  if (error) {
    console.error('[messageService] Error fetching employee directory:', error)
    throw error
  }

  return (data || []).map((employee) => ({
    employee_id: employee.employee_id,
    first_name: employee.first_name || '',
    last_name: employee.last_name || '',
    full_name: `${employee.first_name || ''} ${employee.last_name || ''}`.trim(),
    email: employee.email || ''
  }))
}

export const sendMessage = async ({
  senderId,
  recipientEmail,
  subject,
  messageBody,
  folder = 'inbox',
  replyToEmailId = null
}) => {
  const payload = {
    sender_id: senderId,
    recipient_email: recipientEmail,
    subject,
    message_body: messageBody,
    folder,
    reply_to_email_id: replyToEmailId
  }

  const { data, error } = await supabaseClient
    .from('email')
    .insert([payload])
    .select()
    .single()

  if (error) {
    console.error('[messageService] Error sending message:', error)
    throw error
  }

  return data
}

export const getThreadMessages = async (rootEmailId) => {
  const { data, error } = await supabaseClient
    .from('email')
    .select('*')
    .or(`email_id.eq.${rootEmailId},reply_to_email_id.eq.${rootEmailId}`)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[messageService] Error fetching thread messages:', error)
    throw error
  }

  return data || []
}
