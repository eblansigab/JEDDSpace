import { handleChat } from './ai/chatHandler.js'
import { handleDocumentSummary } from './ai/documentHandler.js'
import { handleHistory, handleChatLogs } from './ai/historyHandler.js'
import { handleOperations } from './ai/operationsHandler.js'
import { handleRecommendation } from './ai/recommendationHandler.js'
import { getRequestUserContext } from './ai/supabaseClient.js'
import { fail, ok } from './_shared/response.js'

const logAI = (action, stage) => {
  console.log('[AI]', 'Action', action, stage)
}

const getBody = (req) => req.body || {}

const resolveAction = (body) => {
  if (body.action) return body.action
  if (body.message) return 'chat'
  return ''
}

const runAction = async ({ action, viewer, payload }) => {
  switch (action) {
    case 'chat':
    case 'conversation':
      return await handleChat({ viewer, payload })
    case 'history':
      return await handleHistory({ viewer, payload })
    case 'logs':
      return await handleChatLogs({ viewer, payload })
    case 'summary':
    case 'summarize':
    case 'document':
      return await handleDocumentSummary({ viewer, payload })
    case 'operations':
      return await handleOperations({ viewer, payload })
    case 'recommendation':
      return await handleRecommendation({ viewer, payload })
    case 'image':
      return { status: 501, error: 'Image understanding is not available in the current text-only AI request.' }
    case 'audio':
      return { status: 501, error: 'Audio transcription is not implemented yet.' }
    default:
      return { status: 400, error: 'Unsupported AI action.' }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return fail(res, 405, 'Method not allowed')
  }

  const body = getBody(req)
  const action = resolveAction(body)
  const payload = body.payload || body

  try {
    const viewer = await getRequestUserContext(req)
    if (!viewer?.user?.id) {
      return fail(res, 401, 'Authentication is required')
    }

    logAI(action, 'Started')
    const result = await runAction({ action, viewer, payload })

    if (result?.error) {
      logAI(action, 'Failed')
      return fail(res, result.status || 500, result.error)
    }

    logAI(action, 'Completed')
    return ok(res, result?.data || {})
  } catch (error) {
    console.error('[AI] Request failed', { action, error: error?.message })
    return fail(res, 500, 'AI service is currently unavailable.')
  }
}
