import { supabaseClient } from '../supabase/supabaseClient'

const LOCAL_EMAILS_KEY = 'jeddspace_email_logs'

const getLocalEmails = () => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_EMAILS_KEY) || '[]')
  } catch {
    return []
  }
}

const saveLocalEmails = (emails) => {
  localStorage.setItem(LOCAL_EMAILS_KEY, JSON.stringify(emails))
}

export const emailService = {
  async getEmailLogs() {
    const { data, error } = await supabaseClient
      .from('email')
      .select('*')
      .order('created_at', { ascending: false })

    const localEmails = getLocalEmails()

    if (error) {
      console.error(error)
      return localEmails
    }

    return [...localEmails, ...(data || [])]
  },

  async createEmailLog({ subject, body, recipient = 'All employees', type = 'announcement', userId }) {
    const localRecord = {
      id: `local-email-${Date.now()}`,
      subject,
      body,
      recipient,
      type,
      status: 'Logged',
      user_id: userId || null,
      created_at: new Date().toISOString()
    }

    saveLocalEmails([localRecord, ...getLocalEmails()])

    const payload = {
      subject,
      body,
      recipient,
      type,
      status: 'Logged'
    }

    if (userId) {
      payload.user_id = userId
    }

    const { error } = await supabaseClient
      .from('email')
      .insert([payload])

    if (error) {
      console.error(error)
    }

    return localRecord
  }
}
