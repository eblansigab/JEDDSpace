import { detectIntent } from './ai/intentDetector.js'
import { loadDataForIntent } from './ai/dataLoader.js'
import { buildMessages } from './ai/promptBuilder.js'
import { groqClient } from './ai/groqClient.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { message } = req.body || {}

  if (!message) {
    return res.status(400).json({ error: 'Message is required' })
  }

  try {
    const intent = detectIntent(message)
    const data = await loadDataForIntent(intent, message)
    const messages = buildMessages({ intent, message, data })
    const response = await groqClient.chat(messages)

    return res.status(200).json({ response })
  } catch (error) {
    console.error('[api/chat]', error)
    return res.status(500).json({ error: 'AI service is currently unavailable.' })
  }
}