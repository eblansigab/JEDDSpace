console.log("GROQ_API_KEY exists:", !!process.env.GROQ_API_KEY);
console.log("All env keys:", Object.keys(process.env).filter(k => k.includes("GROQ")));
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.3-70b-versatile'

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
  async chat(messages) {
    const response = await fetch(GROQ_URL, {
      method: 'POST',
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

    if (!response.ok) {
      throw new Error(await parseErrorMessage(response))
    }

    const data = await response.json()
    return String(data?.choices?.[0]?.message?.content || '').trim()
  },
}
