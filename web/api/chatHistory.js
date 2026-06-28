import { getRequestUserContext, getSupabaseServerClient } from './ai/supabaseClient.js'

const saveChatHistory = async (userId, messages) => {
  const client = getSupabaseServerClient()
  const { error } = await client
    .from('ai_summarization')
    .upsert({
      reference_type: `chat_history_${userId}`,
      content_summary: JSON.stringify(messages),
      raw_data_snapshot: `Last updated: ${new Date().toISOString()}`
    })
  if (error) throw error
}

const getChatHistory = async (userId) => {
  const client = getSupabaseServerClient()
  const { data, error } = await client
    .from('ai_summarization')
    .select('content_summary')
    .eq('reference_type', `chat_history_${userId}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) return null
  try {
    return JSON.parse(data?.content_summary || 'null')
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  const client = getSupabaseServerClient()
  const viewer = await getRequestUserContext(req)

  if (!viewer?.user?.id) {
    return res.status(401).json({ error: 'Authentication is required' })
  }

  if (req.method === 'GET') {
    const { userId, admin } = req.query || {}

    if (admin === 'true') {
      if (!viewer.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' })
      }

      try {
        const { data, error } = await client
          .from('ai_chat_logs')
          .select(`
            chat_id,
            user_id,
            prompt,
            response,
            intent,
            created_at,
            employee:user_id (
              first_name,
              last_name,
              position,
              department
            )
          `)
          .order('created_at', { ascending: false })
          .limit(200)

        if (error) throw error

        return res.status(200).json({ logs: data || [] })
      } catch {
        return res.status(500).json({ error: 'Failed to load chat logs' })
      }
    }

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' })
    }

    if (!viewer.isAdmin && userId !== viewer.user.id) {
      return res.status(403).json({ error: 'Cannot load another user chat history' })
    }

    try {
      const history = await getChatHistory(userId)
      return res.status(200).json({ messages: history || [] })
    } catch {
      return res.status(500).json({ error: 'Failed to load chat history' })
    }
  }

  if (req.method === 'POST') {
    const { userId, messages } = req.body || {}
    if (!userId || !messages) {
      return res.status(400).json({ error: 'User ID and messages required' })
    }

    if (!viewer.isAdmin && userId !== viewer.user.id) {
      return res.status(403).json({ error: 'Cannot save another user chat history' })
    }

    try {
      await saveChatHistory(userId, messages)
      return res.status(200).json({ success: true })
    } catch {
      return res.status(500).json({ error: 'Failed to save chat history' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
