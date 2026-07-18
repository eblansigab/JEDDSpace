import { getRequestUserContext } from '../server/ai/supabaseClient.js'
import { announcementImageService } from '../server/services/announcementImageService.js'
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
    const announcementId = Number(url.pathname.split('/').pop())

    if (!Number.isFinite(announcementId) || announcementId <= 0) {
      return fail(res, 400, 'Invalid announcement ID.')
    }

    if (req.method === 'GET') {
      const result = await announcementImageService.getImages({ viewer, announcementId })
      if (result?.error) {
        return fail(res, result.status || 500, result.error)
      }
      return ok(res, result?.data || [])
    }

    if (req.method === 'POST') {
      if (!req.body?.file) {
        return fail(res, 400, 'Image file is required.')
      }

      const result = await announcementImageService.uploadImage({ viewer, announcementId, file: req.body.file })
      if (result?.error) {
        return fail(res, result.status || 500, result.error)
      }
      return ok(res, result?.data || {})
    }

    return fail(res, 405, 'Method not allowed')
  } catch (error) {
    console.error('[ANNOUNCEMENT_IMAGES] Request failed', { error: error?.message })
    return fail(res, 500, 'Announcement image service is currently unavailable.')
  }
}
