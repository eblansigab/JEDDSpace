import { handleExtract } from '../server/files/extractHandler.js'
import { handleImage } from '../server/files/imageHandler.js'
import { handleSpeech } from '../server/files/speechHandler.js'
import { handleUpload } from '../server/files/uploadHandler.js'
import { getRequestUserContext } from '../server/ai/supabaseClient.js'
import { fail, ok } from '../server/_shared/response.js'

const runAction = async ({ action, viewer, payload }) => {
  switch (action) {
    case 'extract':
    case 'download':
    case 'preview':
      return await handleExtract({ viewer, payload })
    case 'upload':
      return await handleUpload({ viewer, payload })
    case 'ocr':
    case 'image':
      return await handleImage({ viewer, payload })
    case 'speech':
    case 'audio':
      return await handleSpeech({ viewer, payload })
    default:
      return { status: 400, error: 'Unsupported files action.' }
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
      return fail(res, 401, 'Authentication is required.')
    }
    const employeeId = viewer.employee?.employee_id
    if (!employeeId) {
      return fail(res, 403, 'Employee record not found.')
    }

    console.log('[FILES]', 'Action', action, 'Started')
    const result = await runAction({ action, viewer, payload })

    if (result?.error) {
      console.log('[FILES]', 'Action', action, 'Failed')
      return fail(res, result.status || 500, result.error)
    }

    console.log('[FILES]', 'Action', action, 'Completed')
    return ok(res, result?.data || {})
  } catch (error) {
    console.error('[FILES] Request failed', { action, error: error?.message })
    return fail(res, 500, 'File service is currently unavailable.')
  }
}
