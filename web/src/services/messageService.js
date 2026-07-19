/* eslint-disable preserve-caught-error */
import { supabaseClient } from '../supabase/supabaseClient'

export const MESSAGE_REACTION_TYPES = [
  { value: 'acknowledged', label: 'Acknowledged', icon: '👍' },
  { value: 'appreciated', label: 'Appreciated', icon: '❤️' },
  { value: 'important', label: 'Important', icon: '⭐' },
  { value: 'confirmed', label: 'Confirmed', icon: '✅' },
  { value: 'question', label: 'Question', icon: '❓' },
]

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
  replyToEmailId = null,
  attachmentUrl = null
}) => {
  const payload = {
    sender_id: senderId,
    recipient_email: recipientEmail,
    subject,
    message_body: messageBody,
    folder,
    reply_to_email_id: replyToEmailId,
    ...(attachmentUrl ? { attachment_url: attachmentUrl } : {})
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

const uploadToDocumentBucket = async (file) => {
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

  return publicUrlData.publicUrl
}

export const sendMessageWithAttachments = async ({
  senderId,
  recipientEmail,
  subject,
  messageBody,
  file = null,
  folder = 'inbox',
  replyToEmailId = null
}) => {
  let attachmentUrl = null

  if (file) {
    attachmentUrl = await uploadToDocumentBucket(file)
  }

  return sendMessage({
    senderId,
    recipientEmail,
    subject,
    messageBody,
    folder,
    replyToEmailId,
    attachmentUrl
  })
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
    start_date: startDate || null,
    end_date: endDate || null,
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
    start_date: startDate || null,
    end_date: endDate || null,
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
        position,
        role:role_id(
          hierarchy_level
        )
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
        position,
        role:role_id(
          hierarchy_level
        )
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[messageService] Error fetching business forms:', error)
    throw error
  }

  return data || []
}

export const addMessageReaction = async (emailId, employeeId, reactionType) => {
  const { error } = await supabaseClient
    .from('message_reactions')
    .upsert(
      { email_id: emailId, employee_id: employeeId, reaction_type: reactionType, updated_at: new Date().toISOString() },
      { onConflict: ['email_id', 'employee_id'] }
    )

  if (error) {
    console.error('[messageService] addMessageReaction failed', error)
    throw error
  }
}

export const getMessageReactions = async (emailId) => {
  const { data, error } = await supabaseClient
    .from('message_reactions')
    .select('message_reaction_id, email_id, employee_id, reaction_type, created_at, updated_at, employee:employee_id (first_name, last_name, department)')
    .eq('email_id', emailId)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('[messageService] getMessageReactions failed', error)
    return []
  }

  return (data || []).map((reaction) => {
    const employee = reaction.employee || {}
    return {
      message_reaction_id: reaction.message_reaction_id,
      employee_id: reaction.employee_id,
      reaction_type: reaction.reaction_type,
      created_at: reaction.created_at,
      updated_at: reaction.updated_at,
      employee_name: `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'Unknown',
      department: employee.department || '',
    }
  })
}

export const getMessageReactionSummary = async (emailId) => {
  const { data, error } = await supabaseClient
    .from('message_reactions')
    .select('reaction_type')
    .eq('email_id', emailId)

  if (error) {
    console.error('[messageService] getMessageReactionSummary failed', error)
    return {}
  }

  return (data || []).reduce((summary, row) => {
    const type = row.reaction_type || 'unknown'
    summary[type] = (summary[type] || 0) + 1
    return summary
  }, {})
}

export const markMessageRead = async (emailId, employeeId) => {
  const { error } = await supabaseClient
    .from('message_read_receipts')
    .upsert(
      { email_id: emailId, employee_id: employeeId, read_at: new Date().toISOString() },
      { onConflict: ['email_id', 'employee_id'] }
    )

  if (error) {
    console.error('[messageService] markMessageRead failed', error)
    throw error
  }
}

export const getMessageReadReceipts = async (emailId) => {
  const { data, error } = await supabaseClient
    .from('message_read_receipts')
    .select('message_read_receipt_id, email_id, employee_id, read_at, employee:employee_id (first_name, last_name, department)')
    .eq('email_id', emailId)
    .order('read_at', { ascending: false })

  if (error) {
    console.error('[messageService] getMessageReadReceipts failed', error)
    return []
  }

  return (data || []).map((receipt) => {
    const employee = receipt.employee || {}
    return {
      message_read_receipt_id: receipt.message_read_receipt_id,
      employee_id: receipt.employee_id,
      read_at: receipt.read_at,
      employee_name: `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'Unknown',
      department: employee.department || '',
    }
  })
}

export const getMessageImages = async (emailId) => {
  const { data: { session } } = await supabaseClient.auth.getSession()
  const token = session?.access_token
  if (!token) throw new Error('No authentication token available.')

  try {
    const response = await fetch(`/api/messageImages/${emailId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    const result = await response.json()
    if (!response.ok || !result.success) {
      throw new Error(result?.error || `Failed to load images (${response.status})`)
    }

    return result.data || []
  } catch (error) {
    console.error('[messageService] API fallback to direct query:', error.message)
    try {
      const { data, error: supabaseError } = await supabaseClient
        .from('email_attachment')
        .select('email_attachment_id, email_id, file_name, file_type, file_size, file_path, created_at')
        .eq('email_id', emailId)
        .order('created_at', { ascending: true })

      if (supabaseError) {
        console.warn('[messageService] email_attachment table unavailable:', supabaseError.message)
        return []
      }

      return (data || []).map((row) => ({
        email_attachment_id: row.email_attachment_id,
        email_id: row.email_id,
        image_url: row.file_path,
        file_name: row.file_name,
        file_type: row.file_type,
        file_size: row.file_size,
        created_at: row.created_at,
      }))
    } catch (fallbackError) {
      console.error('[messageService] Fallback image load failed:', fallbackError.message)
      return []
    }
  }
}

export const uploadMessageImage = async (emailId, file) => {
  const { data: { session } } = await supabaseClient.auth.getSession()
  const token = session?.access_token
  if (!token) throw new Error('No authentication token available.')

  const formData = new FormData()
  formData.append('file', file)

  try {
    const response = await fetch(`/api/messageImages/${emailId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })

    const result = await response.json()
    if (!response.ok || !result.success) {
      throw new Error(result?.error || `Failed to upload image (${response.status})`)
    }

    return result.data
  } catch (error) {
    console.error('[messageService] API fallback to direct upload:', error.message)
    const fileName = `message_${emailId}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const { error: uploadError } = await supabaseClient.storage
      .from('document')
      .upload(fileName, file)

    if (uploadError) {
      throw new Error('Failed to upload image.', { cause: uploadError })
    }

    const { data: publicUrlData } = await supabaseClient.storage
      .from('document')
      .getPublicUrl(fileName)

    const imageUrl = publicUrlData?.publicUrl || null
    if (!imageUrl) {
      throw new Error('Failed to get image URL.')
    }

    try {
      const { error: insertError } = await supabaseClient
        .from('email_attachment')
        .insert({
          email_id: emailId,
          file_name: file.name,
          file_type: file.type || 'image',
          file_size: file.size,
          file_path: imageUrl,
        })

      if (insertError) {
        console.warn('[messageService] email_attachment insert failed:', insertError.message)
      }
    } catch (insertError) {
      console.warn('[messageService] email_attachment table unavailable:', insertError.message)
    }

    return {
      email_attachment_id: null,
      email_id: emailId,
      image_url: imageUrl,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
    }
  }
}

export const deleteMessageImage = async (emailAttachmentId) => {
  const { data: { session } } = await supabaseClient.auth.getSession()
  const token = session?.access_token
  if (!token) throw new Error('No authentication token available.')

  try {
    const response = await fetch(`/api/messageImages/${emailAttachmentId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ emailAttachmentId }),
    })

    const result = await response.json()
    if (!response.ok || !result.success) {
      throw new Error(result?.error || `Failed to delete image (${response.status})`)
    }

    return result.data
  } catch (error) {
    console.error('[messageService] API fallback to direct delete:', error.message)
    try {
      const { error: deleteError } = await supabaseClient
        .from('email_attachment')
        .delete()
        .eq('email_attachment_id', emailAttachmentId)

      if (deleteError) {
        console.warn('[messageService] email_attachment delete failed:', deleteError.message)
      }
    } catch (deleteError) {
      console.warn('[messageService] email_attachment table unavailable:', deleteError.message)
    }

    return { success: true }
  }
}

