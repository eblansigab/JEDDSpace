import { getRequestUserContext } from '../server/ai/supabaseClient.js'
import { messageImageService } from '../server/services/messageImageService.js'
import { fail, ok } from '../server/_shared/response.js'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const viewer = await getRequestUserContext(req)
  if (!viewer?.user?.id) {
    return fail(res, 401, 'Authentication is required.')
  }

  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
    const emailId = Number(url.pathname.split('/').pop())

    if (!Number.isFinite(emailId) || emailId <= 0) {
      return fail(res, 400, 'Invalid message ID.')
    }

    if (req.method === 'GET') {
      const result = await messageImageService.getImages({ viewer, emailId })
      if (result?.error) {
        return fail(res, result.status || 500, result.error)
      }
      return ok(res, result?.data || [])
    }

    if (req.method === 'POST') {
      if (!req.body?.file) {
        return fail(res, 400, 'Image file is required.')
      }

      const result = await messageImageService.uploadImage({ viewer, emailId, file: req.body.file })
      if (result?.error) {
        return fail(res, result.status || 500, result.error)
      }
      return ok(res, result?.data || {})
    }

    if (req.method === 'DELETE') {
      const emailAttachmentId = Number(req.body?.emailAttachmentId)
      if (!Number.isFinite(emailAttachmentId) || emailAttachmentId <= 0) {
        return fail(res, 400, 'Invalid image ID.')
      }

      const result = await messageImageService.deleteImage({ viewer, emailAttachmentId })
      if (result?.error) {
        return fail(res, result.status || 500, result.error)
      }
      return ok(res, result?.data || { success: true })
    }

    return fail(res, 405, 'Method not allowed')
  } catch (error) {
    console.error('[MESSAGE_IMAGES] Request failed', { error: error?.message })
    return fail(res, 500, 'Message image service is currently unavailable.')
  }
}
