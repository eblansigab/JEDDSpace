import { handleExtract } from '../server/files/extractHandler.js'
import { handleImage } from '../server/files/imageHandler.js'
import { handleSpeech } from '../server/files/speechHandler.js'
import { handleUpload } from '../server/files/uploadHandler.js'
import { authorize } from '../server/middleware/authorize.js'
import { fail, ok } from '../server/_shared/response.js'

const FILE_PERMISSION_MAP = {
  upload: 'document.upload',
  extract: 'document.view',
  download: 'document.download',
  preview: 'document.view',
  ocr: 'document.view',
  image: 'document.view',
  speech: 'document.view',
}

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
  const requiredPermission = FILE_PERMISSION_MAP[action] || 'document.view'

  try {
    const authResult = await authorize(req, requiredPermission)
    if (!authResult.authorized) {
      return authResult.error
    }
    const viewer = authResult.viewer

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
