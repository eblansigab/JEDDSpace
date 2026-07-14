import { supabaseClient } from '../supabase/supabaseClient'

export const getEmployeeDirectory = async () => {
  const { data, error } = await supabaseClient
    .from('employee')
    .select('employee_id, first_name, last_name, email, user_id')
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
    email: employee.email || '',
    user_id: employee.user_id || ''
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

export const uploadMessageAttachment = async (file) => {
  const fileName = `message_${Date.now()}_${file.name}`
  const { error: uploadError } = await supabaseClient.storage
    .from('document')
    .upload(fileName, file)

  if (uploadError) {
    console.error('[messageService] Error uploading attachment:', uploadError)
    throw uploadError
  }

  const { data: publicUrlData } = supabaseClient.storage
    .from('document')
    .getPublicUrl(fileName)

  const { data, error } = await supabaseClient
    .from('email_attachment')
    .insert({
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      file_path: publicUrlData.publicUrl,
    })
    .select()
    .single()

  if (error) {
    console.error('[messageService] Error saving attachment record:', error)
    throw error
  }

  return data
}

export const linkAttachmentToEmail = async (emailId, attachmentId) => {
  const { data, error } = await supabaseClient
    .from('email_attachment')
    .update({ email_id: emailId })
    .eq('email_attachment_id', attachmentId)
    .select()
    .single()

  if (error) {
    console.error('[messageService] Error linking attachment to email:', error)
    throw error
  }

  return data
}

export const sendMessageWithAttachments = async ({
  senderId,
  recipientEmail,
  subject,
  messageBody,
  files = [],
  folder = 'inbox',
  replyToEmailId = null
}) => {
  const email = await sendMessage({
    senderId,
    recipientEmail,
    subject,
    messageBody,
    folder,
    replyToEmailId
  })

  if (!email?.email_id) {
    return email
  }

  const uploadPromises = files.map((file) => uploadMessageAttachment(file))
  const uploaded = await Promise.all(uploadPromises)

  await Promise.all(
    uploaded
      .filter((item) => item?.email_attachment_id)
      .map((item) => linkAttachmentToEmail(email.email_id, item.email_attachment_id))
  )

  return email
}

export const getMessageAttachments = async (emailId) => {
  const { data, error } = await supabaseClient
    .from('email_attachment')
    .select('*')
    .eq('email_id', emailId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[messageService] Error fetching message attachments:', error)
    throw error
  }

  return data || []
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

export const createLeaveForm = async ({ employeeId, startDate, endDate, type, reason, createdBy }) => {
  const payload = {
    employee_id: employeeId,
    start_date: startDate,
    end_date: endDate,
    type,
    reason,
    status: 'pending',
    created_by: createdBy,
  }

  const { data, error } = await supabaseClient
    .from('leaveform')
    .insert([payload])
    .select()
    .single()

  if (error) {
    console.error('[messageService] Error creating leave form:', error)
    throw error
  }

  return data
}

export const createBusinessForm = async ({ employeeId, startDate, endDate, location, companyCar, driverName, phoneNum, createdBy, projectId = null }) => {
  const payload = {
    employee_id: employeeId,
    start_date: startDate,
    end_date: endDate,
    location,
    company_car: companyCar,
    driver_name: driverName,
    phone_num: phoneNum,
    created_by: createdBy,
    ...(projectId ? { project_id: projectId } : {}),
  }

  const { data, error } = await supabaseClient
    .from('businessform')
    .insert([payload])
    .select()
    .single()

  if (error) {
    console.error('[messageService] Error creating business form:', error)
    throw error
  }

  return data
}

export const getLeaveForms = async () => {
  const { data, error } = await supabaseClient
    .from('leaveform')
    .select(`
      leaveform_id,
      employee_id,
      start_date,
      end_date,
      type,
      reason,
      status,
      created_at,
      employee:employee_id (
        employee_id,
        first_name,
        last_name,
        department,
        position
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[messageService] Error fetching leave forms:', error)
    throw error
  }

  return data || []
}

export const getBusinessForms = async () => {
  const { data, error } = await supabaseClient
    .from('businessform')
    .select(`
      businessform_id,
      employee_id,
      start_date,
      end_date,
      location,
      company_car,
      driver_name,
      phone_num,
      status,
      created_at,
      employee:employee_id (
        employee_id,
        first_name,
        last_name,
        department,
        position
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[messageService] Error fetching business forms:', error)
    throw error
  }

  return data || []
}

