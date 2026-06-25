export const aiService = {
  async chat(message) {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message
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

  async summarize(prompt) {
    return await this.chat(prompt)
  }
}