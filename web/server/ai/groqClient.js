/* global process */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.3-70b-versatile'
const GROQ_VISION_MODEL = process.env.GROQ_VISION_MODEL || ''
const GROQ_TIMEOUT_MS = 30000

const getGroqApiKey = () => {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured.')
  }
  return apiKey
}

const parseErrorMessage = async (response) => {
  try {
    const payload = await response.json()
    if (payload?.error?.message) return payload.error.message
    if (payload?.error) return String(payload.error)
  } catch {
    // ignore parse failures
  }

  return `Groq request failed with status ${response.status}`
}

export const groqClient = {
  async *streamChat(messages) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS)

    let response
    try {
      response = await fetch(GROQ_URL, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${getGroqApiKey()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages,
          temperature: 0.2,
          max_tokens: 900,
          stream: true,
        }),
      })
    } catch (error) {
      clearTimeout(timeoutId)
      if (error?.name === 'AbortError') {
        throw new Error('Groq request timed out.', { cause: error })
      }
      throw error
    }

    if (!response.ok) {
      clearTimeout(timeoutId)
      throw new Error(await parseErrorMessage(response))
    }

    const reader = response.body?.getReader()
    if (!reader) {
      clearTimeout(timeoutId)
      throw new Error('Groq streaming response is unavailable.')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data:')) continue

          const payload = trimmed.slice(5).trim()
          if (payload === '[DONE]') return

          try {
            const parsed = JSON.parse(payload)
            const token = parsed?.choices?.[0]?.delta?.content || ''
            if (token) yield token
          } catch {
            // Ignore malformed event fragments.
          }
        }
      }
    } finally {
      reader.releaseLock()
      clearTimeout(timeoutId)
    }
  },

  async chatWithMetadata(messages) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS)
    const startedAt = Date.now()

    let response
    try {
      response = await fetch(GROQ_URL, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${getGroqApiKey()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages,
          temperature: 0.2,
          max_tokens: 900,
        }),
      })
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new Error('Groq request timed out.', { cause: error })
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
    }

    if (!response.ok) {
      throw new Error(await parseErrorMessage(response))
    }

    const data = await response.json()
    return {
      content: String(data?.choices?.[0]?.message?.content || '').trim(),
      model: data?.model || GROQ_MODEL,
      latencyMs: Date.now() - startedAt,
    }
  },

  async chat(messages) {
    const result = await this.chatWithMetadata(messages)
    return result.content
  },

  async analyzeImage({ dataUrl, prompt = 'Describe this image for a business assistant.' }) {
    if (!GROQ_VISION_MODEL) {
      return {
        content: 'Image understanding is not configured. Set GROQ_VISION_MODEL to enable visual analysis.',
        model: null,
        latencyMs: 0,
        configured: false,
      }
    }

    const startedAt = Date.now()
    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getGroqApiKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_VISION_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
        temperature: 0.2,
        max_tokens: 700,
      }),
    })

    if (!response.ok) {
      throw new Error(await parseErrorMessage(response))
    }

    const data = await response.json()
    return {
      content: String(data?.choices?.[0]?.message?.content || '').trim(),
      model: data?.model || GROQ_VISION_MODEL,
      latencyMs: Date.now() - startedAt,
      configured: true,
    }
  },
}