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

const parseStreamEvents = (buffer) => {
  const events = []
  const parts = buffer.split('\n\n')
  const remainder = parts.pop() || ''

  for (const part of parts) {
    const event = { event: 'message', data: {} }
    part.split('\n').forEach((line) => {
      if (line.startsWith('event:')) {
        event.event = line.slice(6).trim()
      } else if (line.startsWith('data:')) {
        try {
          event.data = JSON.parse(line.slice(5).trim())
        } catch {
          event.data = {}
        }
      }
    })
    events.push(event)
  }

  return { events, remainder }
}

export const aiService = {
  async chat(message, messages = []) {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        action: 'chat',
        payload: {
          message,
          messages
        }
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
        action: 'chat',
        payload: {
          message: messages[messages.length - 1]?.content || '',
          messages,
          attachments
        }
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

  async chatWithContextStream(messages, userId = null, attachments = [], { sessionId = 'default', onToken, onProgress, onDone } = {}) {
    void userId

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        action: 'chat',
        payload: {
          message: messages[messages.length - 1]?.content || '',
          messages,
          attachments,
          sessionId,
          stream: true
        }
      })
    })

    if (!response.ok || !response.body) {
      let errorMessage = `AI service request failed with status ${response.status}`
      try {
        const payload = await response.json()
        if (payload?.error) errorMessage = payload.error
      } catch {
        // ignore parse errors
      }
      throw new Error(errorMessage)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let fullText = ''
    let donePayload = null

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const parsed = parseStreamEvents(buffer)
      buffer = parsed.remainder

      for (const item of parsed.events) {
        if (item.event === 'progress') {
          onProgress?.(item.data?.message || 'Working...')
        } else if (item.event === 'token') {
          const token = item.data?.token || ''
          fullText += token
          onToken?.(token, fullText)
        } else if (item.event === 'done') {
          donePayload = item.data || {}
          onDone?.(donePayload)
        } else if (item.event === 'error') {
          throw new Error(item.data?.error || 'AI streaming failed.')
        }
      }
    }

    return {
      response: fullText || donePayload?.response || '',
      ...donePayload
    }
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
    const response = await fetch('/api/admin', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        action: 'logs'
      })
    })
    if (!response.ok) return []
    const { logs } = await response.json()
    return logs || []
  },

  async summarize(prompt) {
    return await this.chat(prompt)
  },

  async saveChatHistory(userId, messages, sessionId = 'default') {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        action: 'history',
        payload: {
          mode: 'save',
          userId,
          messages,
          sessionId
        }
      })
    })

    if (!response.ok) throw new Error('Failed to save chat history')
    return true
  },

  async loadChatHistory(userId, sessionId = 'default') {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        action: 'history',
        payload: {
          mode: 'load',
          userId,
          sessionId
        }
      })
    })
    if (!response.ok) return []
    const { messages } = await response.json()
    return messages || []
  }
}
