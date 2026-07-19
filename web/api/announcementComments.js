// TEMPORARILY DISABLED: Announcement comments are hidden from the frontend for the final defense.
// This API route remains registered and functional for easy restoration after defense.
// To restore: re-enable comment UI in AnnouncementsPage and remove the early returns in announcementService.js
import { getRequestUserContext } from '../server/ai/supabaseClient.js'
import { announcementCommentService } from '../server/services/announcementCommentService.js'
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
    const pathParts = url.pathname.split('/').filter(Boolean)

    if (pathParts.length >= 2 && pathParts[0] === 'announcement-comments') {
      const announcementId = Number(pathParts[1])

      if (!Number.isFinite(announcementId) || announcementId <= 0) {
        return fail(res, 400, 'Invalid announcement ID.')
      }

      if (req.method === 'GET') {
        const result = await announcementCommentService.getComments({ viewer, announcementId })
        if (result?.error) {
          return fail(res, result.status || 500, result.error)
        }
        return ok(res, result?.data || [])
      }

      if (req.method === 'POST') {
        const commentText = String(req.body?.commentText || '').trim()
        const file = req.body?.file || null

        if (!commentText && !file) {
          return fail(res, 400, 'Comment text or image is required.')
        }

        const result = await announcementCommentService.createComment({ viewer, announcementId, commentText, file })
        if (result?.error) {
          return fail(res, result.status || 500, result.error)
        }
        return ok(res, result?.data || {})
      }
    }

    if (pathParts.length >= 3 && pathParts[0] === 'announcement-comments' && pathParts[2] === 'reactions') {
      const commentId = Number(pathParts[1])

      if (!Number.isFinite(commentId) || commentId <= 0) {
        return fail(res, 400, 'Invalid comment ID.')
      }

      if (req.method === 'GET') {
        const result = await announcementCommentService.getReactions({ viewer, commentId })
        if (result?.error) {
          return fail(res, result.status || 500, result.error)
        }
        return ok(res, result?.data || [])
      }

      if (req.method === 'POST') {
        const reactionType = String(req.body?.reactionType || '').trim()
        if (!reactionType) {
          return fail(res, 400, 'Reaction type is required.')
        }

        const result = await announcementCommentService.addReaction({ viewer, commentId, reactionType })
        if (result?.error) {
          return fail(res, result.status || 500, result.error)
        }
        return ok(res, result?.data || { success: true })
      }
    }

    if (pathParts.length >= 3 && pathParts[0] === 'announcement-comments' && pathParts[2] === 'summary') {
      const commentId = Number(pathParts[1])

      if (!Number.isFinite(commentId) || commentId <= 0) {
        return fail(res, 400, 'Invalid comment ID.')
      }

      if (req.method === 'GET') {
        const result = await announcementCommentService.getReactionSummary({ viewer, commentId })
        if (result?.error) {
          return fail(res, result.status || 500, result.error)
        }
        return ok(res, result?.data || {})
      }
    }

    if (pathParts.length >= 2 && pathParts[0] === 'announcement-comments' && pathParts[1] === 'delete') {
      const commentId = Number(req.body?.commentId)
      if (!Number.isFinite(commentId) || commentId <= 0) {
        return fail(res, 400, 'Invalid comment ID.')
      }

      if (req.method === 'POST') {
        const result = await announcementCommentService.deleteComment({ viewer, commentId })
        if (result?.error) {
          return fail(res, result.status || 500, result.error)
        }
        return ok(res, result?.data || { success: true })
      }
    }

    return fail(res, 404, 'Not found')
  } catch (error) {
    console.error('[ANNOUNCEMENT_COMMENTS] Request failed', { error: error?.message })
    return fail(res, 500, 'Announcement comment service is currently unavailable.')
  }
}
