import { handleAnalytics } from '../server/admin/analyticsHandler.js'
import { handleLogs } from '../server/admin/logsHandler.js'
import { handleHealth } from '../server/admin/systemHandler.js'
import { authorize } from '../server/middleware/authorize.js'
import { fail, ok } from '../server/_shared/response.js'

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
    const authResult = await authorize(req, 'settings.manage')
    if (!authResult.authorized) {
      return authResult.error
    }
    const viewer = authResult.viewer

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
