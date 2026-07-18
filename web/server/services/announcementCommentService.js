import { getSupabaseServerClient } from '../ai/supabaseClient.js'
import { permissionService } from './permissionService.js'

const DOCUMENT_BUCKET = 'document'
const MAX_FILE_SIZE = 25 * 1024 * 1024

class AnnouncementCommentService {
  async getComments({ viewer, announcementId }) {
    if (!viewer?.employee?.employee_id) {
      return { status: 401, error: 'Authentication is required.' }
    }

    const client = getSupabaseServerClient()
    const { data, error } = await client
      .from('announcement_comments')
      .select('comment_id, announcement_id, employee_id, comment_text, image_url, created_at, updated_at, employee:employee_id (first_name, last_name, department)')
      .eq('announcement_id', announcementId)
      .order('created_at', { ascending: true })

    if (error) {
      return { status: 500, error: 'Failed to load comments.' }
    }

    return {
      data: (data || []).map((row) => {
        const employee = row.employee || {}
        return {
          comment_id: row.comment_id,
          announcement_id: row.announcement_id,
          employee_id: row.employee_id,
          comment_text: row.comment_text,
          image_url: row.image_url,
          created_at: row.created_at,
          updated_at: row.updated_at,
          employee_name: `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'Unknown',
          department: employee.department || '',
        }
      }),
    }
  }

  async createComment({ viewer, announcementId, commentText, file = null }) {
    if (!viewer?.employee?.employee_id) {
      return { status: 401, error: 'Authentication is required.' }
    }

    const hasCommentPermission = permissionService.hasPermission(viewer.permissions || [], 'ANNOUNCEMENT_COMMENT')
    if (!hasCommentPermission) {
      return { status: 403, error: 'You do not have permission to comment on announcements.' }
    }

    const client = getSupabaseServerClient()
    let imageUrl = null

    if (file) {
      const hasImagePermission = permissionService.hasPermission(viewer.permissions || [], 'ANNOUNCEMENT_COMMENT_IMAGE')
      if (!hasImagePermission) {
        return { status: 403, error: 'You do not have permission to upload images in comments.' }
      }

      if (file.size > MAX_FILE_SIZE) {
        return { status: 400, error: 'Image must be under 25 MB.' }
      }

      const fileName = `comment_${announcementId}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

      const { error: uploadError } = await client.storage
        .from(DOCUMENT_BUCKET)
        .upload(fileName, file, { upsert: false })

      if (uploadError) {
        return { status: 500, error: 'Failed to upload image.' }
      }

      const { data: publicUrlData } = client.storage
        .from(DOCUMENT_BUCKET)
        .getPublicUrl(fileName)

      imageUrl = publicUrlData?.publicUrl || null
      if (!imageUrl) {
        return { status: 500, error: 'Failed to get image URL.' }
      }
    }

    const { data, error } = await client
      .from('announcement_comments')
      .insert({
        announcement_id: announcementId,
        employee_id: viewer.employee.employee_id,
        comment_text: commentText?.trim() || '',
        image_url: imageUrl,
      })
      .select('comment_id, announcement_id, employee_id, comment_text, image_url, created_at, updated_at, employee:employee_id (first_name, last_name, department)')
      .single()

    if (error) {
      return { status: 500, error: 'Failed to create comment.' }
    }

    const employee = data.employee || {}
    return {
      data: {
        comment_id: data.comment_id,
        announcement_id: data.announcement_id,
        employee_id: data.employee_id,
        comment_text: data.comment_text,
        image_url: data.image_url,
        created_at: data.created_at,
        updated_at: data.updated_at,
        employee_name: `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'Unknown',
        department: employee.department || '',
      },
    }
  }

  async deleteComment({ viewer, commentId }) {
    if (!viewer?.employee?.employee_id) {
      return { status: 401, error: 'Authentication is required.' }
    }

    const client = getSupabaseServerClient()
    const { data: comment, error: fetchError } = await client
      .from('announcement_comments')
      .select('comment_id, employee_id')
      .eq('comment_id', commentId)
      .maybeSingle()

    if (fetchError || !comment) {
      return { status: 404, error: 'Comment not found.' }
    }

    if (comment.employee_id !== viewer.employee.employee_id) {
      return { status: 403, error: 'You can only delete your own comments.' }
    }

    const { error: deleteError } = await client
      .from('announcement_comments')
      .delete()
      .eq('comment_id', commentId)

    if (deleteError) {
      return { status: 500, error: 'Failed to delete comment.' }
    }

    return { data: { success: true } }
  }

  async addReaction({ viewer, commentId, reactionType }) {
    if (!viewer?.employee?.employee_id) {
      return { status: 401, error: 'Authentication is required.' }
    }

    const hasPermission = permissionService.hasPermission(viewer.permissions || [], 'ANNOUNCEMENT_COMMENT_REACT')
    if (!hasPermission) {
      return { status: 403, error: 'You do not have permission to react to comments.' }
    }

    const client = getSupabaseServerClient()
    const { error } = await client
      .from('comment_reactions')
      .upsert(
        { comment_id: commentId, employee_id: viewer.employee.employee_id, reaction_type: reactionType, updated_at: new Date().toISOString() },
        { onConflict: ['comment_id', 'employee_id'] }
      )

    if (error) {
      return { status: 500, error: 'Failed to save reaction.' }
    }

    return { data: { success: true } }
  }

  async getReactions({ viewer, commentId }) {
    if (!viewer?.employee?.employee_id) {
      return { status: 401, error: 'Authentication is required.' }
    }

    const client = getSupabaseServerClient()
    const { data, error } = await client
      .from('comment_reactions')
      .select('comment_reaction_id, comment_id, employee_id, reaction_type, created_at, updated_at, employee:employee_id (first_name, last_name, department)')
      .eq('comment_id', commentId)
      .order('updated_at', { ascending: false })

    if (error) {
      return { status: 500, error: 'Failed to load reactions.' }
    }

    return {
      data: (data || []).map((row) => {
        const employee = row.employee || {}
        return {
          comment_reaction_id: row.comment_reaction_id,
          comment_id: row.comment_id,
          employee_id: row.employee_id,
          reaction_type: row.reaction_type,
          created_at: row.created_at,
          updated_at: row.updated_at,
          employee_name: `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'Unknown',
          department: employee.department || '',
        }
      }),
    }
  }

  async getReactionSummary({ viewer, commentId }) {
    if (!viewer?.employee?.employee_id) {
      return { status: 401, error: 'Authentication is required.' }
    }

    const client = getSupabaseServerClient()
    const { data, error } = await client
      .from('comment_reactions')
      .select('reaction_type')
      .eq('comment_id', commentId)

    if (error) {
      return { status: 500, error: 'Failed to load reaction summary.' }
    }

    const summary = (data || []).reduce((acc, row) => {
      const type = row.reaction_type || 'unknown'
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {})

    return { data: summary }
  }
}

export const announcementCommentService = new AnnouncementCommentService()
