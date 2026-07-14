import { getSupabaseServerClient } from './supabaseClient.js'
import { permissionService } from '../services/permissionService.js'

const logHistory = (label, meta = {}) => {
  const entry = {
    timestamp: new Date().toISOString(),
    label,
    ...meta,
  }
  console.log('[History]', JSON.stringify(entry))
}

const logHistoryError = (label, error, meta = {}) => {
  const entry = {
    timestamp: new Date().toISOString(),
    label,
    message: error?.message ?? String(error),
    details: error?.details ?? null,
    hint: error?.hint ?? null,
    code: error?.code ?? null,
    stack: error?.stack ?? null,
    error,
    ...meta,
  }
  console.error('[History]', JSON.stringify(entry))
}

const getHistoryKey = (userId, sessionId = 'default') => `chat_history_${userId}_${sessionId || 'default'}`

const saveChatHistory = async (userId, messages, sessionId = 'default') => {
  const client = getSupabaseServerClient()
  const historyKey = getHistoryKey(userId, sessionId)
  const payload = {
    reference_type: historyKey,
    content_summary: JSON.stringify(messages),
    raw_data_snapshot: `Session: ${sessionId || 'default'}\nLast updated: ${new Date().toISOString()}`,
  }

  logHistory('Saving conversation', {
    table: 'ai_summarization',
    sessionId,
    userId,
    messageCount: Array.isArray(messages) ? messages.length : 0,
    payloadSize: JSON.stringify(payload).length,
    payload,
  })

  const start = Date.now()
  const { error } = await client
    .from('ai_summarization')
    .upsert(payload, { onConflict: 'reference_type' })
  const durationMs = Date.now() - start

  if (error) {
    logHistoryError('Upsert failed', error, {
      table: 'ai_summarization',
      sessionId,
      userId,
      durationMs,
      payloadSize: JSON.stringify(payload).length,
    })
    throw error
  }

  logHistory('Upsert completed', {
    table: 'ai_summarization',
    sessionId,
    userId,
    durationMs,
    messageCount: Array.isArray(messages) ? messages.length : 0,
  })
}

const getChatHistory = async (userId, sessionId = 'default') => {
  const client = getSupabaseServerClient()

  logHistory('Loading conversation', {
    table: 'ai_summarization',
    sessionId,
    userId,
  })

  const { data, error } = await client
    .from('ai_summarization')
    .select('content_summary')
    .eq('reference_type', getHistoryKey(userId, sessionId))
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    logHistoryError('Load failed', error, {
      table: 'ai_summarization',
      sessionId,
      userId,
    })
    return null
  }

  try {
    const parsed = JSON.parse(data?.content_summary || 'null')
    logHistory('Load completed', {
      table: 'ai_summarization',
      sessionId,
      userId,
      messageCount: Array.isArray(parsed) ? parsed.length : 0,
    })
    return parsed
  } catch (parseError) {
    logHistoryError('Parse failed', parseError, {
      table: 'ai_summarization',
      sessionId,
      userId,
    })
    return null
  }
}

export const handleHistory = async ({ viewer, payload = {} }) => {
  const { mode = 'load', userId, messages, sessionId = 'default' } = payload

  logHistory('History request received', {
    mode,
    userId,
    sessionId,
    messageCount: Array.isArray(messages) ? messages.length : 0,
    payloadSize: JSON.stringify(payload).length,
  })

  if (!userId) {
    logHistory('Missing userId', { mode, sessionId })
    return { status: 400, error: 'User ID required' }
  }

  if (!viewer.isAdmin && userId !== viewer.user.id) {
    logHistory('Unauthorized access', { mode, sessionId, requestingUserId: userId, authenticatedUserId: viewer.user.id })
    return { status: 403, error: 'Cannot access another user chat history' }
  }

  if (mode === 'save') {
    if (!messages) {
      logHistory('Missing messages for save', { mode, sessionId, userId })
      return { status: 400, error: 'Messages are required' }
    }

    try {
      await saveChatHistory(userId, messages, sessionId)
      return { data: { saved: true } }
    } catch (error) {
      logHistoryError('Save failed', error, { mode, sessionId, userId })
      return { status: 500, error: 'Failed to save chat history' }
    }
  }

  try {
    const history = await getChatHistory(userId, sessionId)
    return { data: { messages: history || [], sessionId } }
  } catch (error) {
    logHistoryError('Load failed', error, { mode, sessionId, userId })
    return { status: 500, error: 'Failed to load chat history' }
  }
}

export const handleChatLogs = async ({ viewer }) => {
  const hasAccess = permissionService.hasPermission(viewer.permissions || [], 'AI_HISTORY')
  if (!hasAccess) {
    logHistory('AI history access required', { userId: viewer.user?.id })
    return { status: 403, error: 'AI history access required' }
  }

  const client = getSupabaseServerClient()

  logHistory('Loading chat logs', { table: 'ai_chat_logs' })

  const { data, error } = await client
    .from('ai_chat_logs')
    .select(`
      chat_id,
      user_id,
      prompt,
      response,
      intent,
      created_at
    `)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    logHistoryError('Chat logs load failed', error, { table: 'ai_chat_logs' })
    throw error
  }

  const userIds = [...new Set((data || []).map((row) => row.user_id).filter(Boolean))]

  let employeeNameMap = {}
  if (userIds.length > 0) {
    const { data: employees } = await client
      .from('employee')
      .select('user_id, first_name, last_name')
      .in('user_id', userIds)

    employeeNameMap = new Map((employees || []).map((emp) => [String(emp.user_id), {
      first_name: emp.first_name,
      last_name: emp.last_name,
    }]))
  }

  const logsWithEmployee = (data || []).map((row) => {
    const emp = employeeNameMap.get(String(row.user_id)) || null
    return { ...row, employee: emp }
  })

  logHistory('Chat logs loaded', { table: 'ai_chat_logs', count: logsWithEmployee.length })
  return { data: { logs: logsWithEmployee } }
}
