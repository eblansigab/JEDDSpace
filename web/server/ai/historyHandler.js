import { getSupabaseServerClient } from './supabaseClient.js'

const getHistoryKey = (userId, sessionId = 'default') => `chat_history_${userId}_${sessionId || 'default'}`

const saveChatHistory = async (userId, messages, sessionId = 'default') => {
  const client = getSupabaseServerClient()
  const { error } = await client
    .from('ai_summarization')
    .upsert({
      reference_type: getHistoryKey(userId, sessionId),
      content_summary: JSON.stringify(messages),
      raw_data_snapshot: `Session: ${sessionId || 'default'}\nLast updated: ${new Date().toISOString()}`,
    })
  if (error) throw error
}

const getChatHistory = async (userId, sessionId = 'default') => {
  const client = getSupabaseServerClient()
  const { data, error } = await client
    .from('ai_summarization')
    .select('content_summary')
    .eq('reference_type', getHistoryKey(userId, sessionId))
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

export const handleHistory = async ({ viewer, payload = {} }) => {
  const { mode = 'load', userId, messages, sessionId = 'default' } = payload

  if (!userId) {
    return { status: 400, error: 'User ID required' }
  }

  if (!viewer.isAdmin && userId !== viewer.user.id) {
    return { status: 403, error: 'Cannot access another user chat history' }
  }

  if (mode === 'save') {
    if (!messages) {
      return { status: 400, error: 'Messages are required' }
    }

    await saveChatHistory(userId, messages, sessionId)
    return { data: { saved: true } }
  }

  const history = await getChatHistory(userId, sessionId)
  return { data: { messages: history || [], sessionId } }
}

export const handleChatLogs = async ({ viewer }) => {
  if (!viewer.isAdmin) {
    return { status: 403, error: 'Admin access required' }
  }

  const client = getSupabaseServerClient()
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
  return { data: { logs: data || [] } }
}
