import { supabaseClient } from '../supabase/supabaseClient'

const getAuthHeaders = async () => {
  const {
    data: { session }
  } = await supabaseClient.auth.getSession()

  return {
    'Content-Type': 'application/json',
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
  }
}

export const aiService = {
  async chat(message, messages = []) {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        message,
        messages
      })
    })

    if (!response.ok) {
      let errorMessage = `AI service request failed with status ${response.status}`

      try {
        const payload = await response.json()
        if (payload?.error) {
          errorMessage = payload.error
        }
      } catch {
        // ignore parse errors and use fallback message
      }

      throw new Error(errorMessage)
    }

    const data = await response.json()
    return String(data?.response || '').trim()
  },

  async chatWithContext(messages, userId = null, attachments = []) {
    void userId

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        message: messages[messages.length - 1]?.content || '',
        messages,
        attachments
      })
    })

    if (!response.ok) {
      let errorMessage = `AI service request failed with status ${response.status}`

      try {
        const payload = await response.json()
        if (payload?.error) {
          errorMessage = payload.error
        }
      } catch {
        // ignore parse errors and use fallback message
      }

      throw new Error(errorMessage)
    }

    const data = await response.json()
    return String(data?.response || '').trim()
  },

  async uploadAttachment(file) {
    const fileName = `${Date.now()}-${file.name}`
    const {
      data: { session }
    } = await supabaseClient.auth.getSession()

    const { error: uploadError } =
      await supabaseClient.storage
        .from('document')
        .upload(fileName, file)

    if (uploadError) throw uploadError

    const { data: publicUrlData } =
      supabaseClient.storage
        .from('document')
        .getPublicUrl(fileName)

    const { data, error } =
      await supabaseClient
        .from('document')
        .insert({
          uploaded_by: session?.user?.id || null,
          title: file.name,
          file_name: file.name,
          file_path: publicUrlData.publicUrl,
          file_type: file.type,
          file_size: file.size
        })
        .select()
        .single()

    if (error) throw error
    return data
  },

  async loadAllChatLogs() {
    const response = await fetch('/api/chatHistory?admin=true', {
      headers: await getAuthHeaders()
    })
    if (!response.ok) return []
    const { logs } = await response.json()
    return logs || []
  },

  async summarize(prompt) {
    return await this.chat(prompt)
  },

  async saveChatHistory(userId, messages) {
    const response = await fetch('/api/chatHistory', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ userId, messages })
    })

    if (!response.ok) throw new Error('Failed to save chat history')
    return true
  },

  async loadChatHistory(userId) {
    const response = await fetch(`/api/chatHistory?userId=${encodeURIComponent(userId)}`, {
      headers: await getAuthHeaders()
    })
    if (!response.ok) return []
    const { messages } = await response.json()
    return messages || []
  }
}
