import { handleAnalytics } from './admin/analyticsHandler.js'
import { handleLogs } from './admin/logsHandler.js'
import { handleHealth } from './admin/systemHandler.js'
import { getRequestUserContext } from './ai/supabaseClient.js'
import { fail, ok } from './_shared/response.js'

const runAction = async ({ action, viewer, payload }) => {
  switch (action) {
    case 'analytics':
    case 'metrics':
      return await handleAnalytics({ viewer, payload })
    case 'logs':
      return await handleLogs({ viewer, payload })
    case 'health':
    case 'system':
      return await handleHealth({ viewer, payload })
    case 'cache':
      return { data: { cache: 'ai_summarization' } }
    default:
      return { status: 400, error: 'Unsupported admin action.' }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return fail(res, 405, 'Method not allowed')
  }

  const { action, payload = {} } = req.body || {}

  try {
    const viewer = await getRequestUserContext(req)
    if (!viewer?.user?.id) {
      return fail(res, 401, 'Authentication is required')
    }

    console.log('[ADMIN]', 'Action', action, 'Started')
    const result = await runAction({ action, viewer, payload })

    if (result?.error) {
      console.log('[ADMIN]', 'Action', action, 'Failed')
      return fail(res, result.status || 500, result.error)
    }

    console.log('[ADMIN]', 'Action', action, 'Completed')
    return ok(res, result?.data || {})
  } catch (error) {
    console.error('[ADMIN] Request failed', { action, error: error?.message })
    return fail(res, 500, 'Admin service is currently unavailable.')
  }
}
