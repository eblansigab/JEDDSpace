import { handleChat, handleChatStream } from '../server/ai/chatHandler.js'
import { handleDocumentSummary } from '../server/ai/documentHandler.js'
import { handleHistory, handleChatLogs } from '../server/ai/historyHandler.js'
import { handleOperations } from '../server/ai/operationsHandler.js'
import { handleRecommendation } from '../server/ai/recommendationHandler.js'
import { authorize } from '../server/middleware/authorize.js'
import { fail, ok } from '../server/_shared/response.js'

const logAIError = (action, error, meta = {}) => {
  const entry = {
    timestamp: new Date().toISOString(),
    action,
    message: error?.message ?? String(error),
    details: error?.details ?? null,
    hint: error?.hint ?? null,
    code: error?.code ?? null,
    stack: error?.stack ?? null,
    error,
    ...meta,
  }
  console.error('[AI]', JSON.stringify(entry))
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
    const authResult = await authorize(req, 'ai.chat')
    if (!authResult.authorized) {
      return authResult.error
    }
    const viewer = authResult.viewer

    if ((action === 'chat' || action === 'conversation') && payload?.stream) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      })

      const sendEvent = (event, data = {}) => {
        res.write(`event: ${event}\n`)
        res.write(`data: ${JSON.stringify(data)}\n\n`)
      }

      try {
        sendEvent('progress', { message: 'Building context...' })
        await handleChatStream({ viewer, payload, sendEvent })
      } catch (error) {
        logAIError(action, error, { stage: 'streaming', stream: true })
        sendEvent('error', { error: error?.message || 'AI streaming failed.' })
      } finally {
        res.end()
      }
      return
    }

    console.log('[AI]', JSON.stringify({ timestamp: new Date().toISOString(), action, stage: 'Started' }))
    const result = await runAction({ action, viewer, payload })

    if (result?.error) {
      console.log('[AI]', JSON.stringify({ timestamp: new Date().toISOString(), action, stage: 'Failed', error: result.error }))
      return fail(res, result.status || 500, result.error)
    }

    console.log('[AI]', JSON.stringify({ timestamp: new Date().toISOString(), action, stage: 'Completed' }))
    return ok(res, result?.data || {})
  } catch (error) {
    logAIError(action, error, { stage: 'handler' })
    return fail(res, 500, 'AI service is currently unavailable.')
  }
}
