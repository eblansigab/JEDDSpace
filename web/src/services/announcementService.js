/* eslint-disable preserve-caught-error */
import { supabaseClient } from '../supabase/supabaseClient'

export const ANNOUNCEMENT_STATUSES = ['Published', 'Draft', 'Archived']
export const ANNOUNCEMENT_VISIBILITY_SCOPES = ['ORGANIZATION', 'DEPARTMENT', 'ROLE']

export const announcementService = {
  async createAnnouncement(data) {
    const payload = {
      title: data.title?.trim(),
      body: data.body?.trim(),
      status: data.status || 'Draft',
      visibility_scope: data.visibilityScope || 'ORGANIZATION',
      visibility_target: data.visibilityTarget || null,
    }

    if (data.userId) {
      payload.user_id = data.userId
    }

    const { data: result, error } = await supabaseClient
      .from('announcement')
      .insert([payload])
      .select()
      .single()

    if (error) {
      throw error
    }

    return result
  },

  async updateAnnouncement(announcementId, updates) {
    const payload = {
      ...updates,
      title: updates.title?.trim(),
      body: updates.body?.trim(),
      ...(updates.visibilityScope ? { visibility_scope: updates.visibilityScope } : {}),
      ...(updates.visibilityTarget !== undefined ? { visibility_target: updates.visibilityTarget } : {}),
    }

    const { data, error } = await supabaseClient
      .from('announcement')
      .update(payload)
      .eq('announcement_id', announcementId)
      .select()
      .single()

    if (error) {
      const fallback = await supabaseClient
        .from('announcement')
        .update(payload)
        .eq('id', announcementId)
        .select()
        .single()

      if (fallback.error) {
        throw error
      }

      return fallback.data
    }

    return data
  },

  async getAnnouncements(viewer) {
    const { data, error } = await supabaseClient
      .from('announcement')
      .select('*')
      .order('created_at', {
        ascending: false
      })

    if (error) {
      throw error
    }

    const announcements = data || []
    if (!viewer) {
      return announcements
    }

    const userDepartment = String(viewer.employee?.department || '').trim().toLowerCase()
    const userRoleId = viewer.employee?.role_id ?? null
    const isAdmin = Boolean(viewer.isAdmin)

    return announcements.filter((item) => {
      const visibilityScope = String(item.visibility_scope || 'ORGANIZATION').toUpperCase()
      const visibilityTarget = item.visibility_target ? String(item.visibility_target).trim() : null

      if (visibilityScope === 'ORGANIZATION') {
        return true
      }

      if (!isAdmin) {
        return false
      }

      if (visibilityScope === 'DEPARTMENT') {
        if (!userDepartment) return false
        if (!visibilityTarget) return true
        return visibilityTarget.toLowerCase() === userDepartment
      }

      if (visibilityScope === 'ROLE') {
        if (!userRoleId) return false
        if (!visibilityTarget) return true
        return String(visibilityTarget) === String(userRoleId)
      }

      return true
    })
  },

  async getAvailableAudiences(viewer) {
    const userDepartment = String(viewer.employee?.department || '').trim()
    const userRoleId = viewer.employee?.role_id ?? null
    const scope = String(viewer.scope || '').trim().toUpperCase()

    const canAccess = (allowed) => allowed.some((s) => s === scope || s === 'ALL')

    const audiences = [{ label: 'Entire Organization', value: 'ORGANIZATION', target: null }]

    if (canAccess(['ALL', 'DEPARTMENT', 'SUBORDINATE'])) {
      if (userDepartment) {
        audiences.push({ label: `Department: ${userDepartment}`, value: 'DEPARTMENT', target: userDepartment })
      }
    }

    if (canAccess(['ALL', 'SUBORDINATE']) && userRoleId) {
      audiences.push({ label: 'My Role', value: 'ROLE', target: String(userRoleId) })
    }

    return audiences
  },

  async markViewed(announcementId, employeeId) {
    const { error } = await supabaseClient
      .from('announcement_views')
      .upsert(
        { announcement_id: announcementId, employee_id: employeeId, viewed_at: new Date().toISOString() },
        { onConflict: ['announcement_id', 'employee_id'] }
      )

    if (error) {
      console.error('[announcementService] markViewed failed', error)
    }
  },

  async getViews(announcementId) {
    const { data, error } = await supabaseClient
      .from('announcement_views')
      .select('announcement_view_id, announcement_id, employee_id, viewed_at, employee:employee_id (first_name, last_name, department)')
      .eq('announcement_id', announcementId)
      .order('viewed_at', { ascending: false })

    if (error) {
      console.error('[announcementService] getViews failed', error)
      return []
    }

    return (data || []).map((view) => {
      const employee = view.employee || {}
      return {
        announcement_view_id: view.announcement_view_id,
        employee_id: view.employee_id,
        viewed_at: view.viewed_at,
        employee_name: `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'Unknown',
        department: employee.department || '',
      }
    })
  },

  async addReaction(announcementId, employeeId, reactionType) {
    const { error } = await supabaseClient
      .from('announcement_reactions')
      .upsert(
        { announcement_id: announcementId, employee_id: employeeId, reaction_type: reactionType, updated_at: new Date().toISOString() },
        { onConflict: ['announcement_id', 'employee_id'] }
      )

    if (error) {
      console.error('[announcementService] addReaction failed', error)
      throw error
    }
  },

  async getReactions(announcementId) {
    const { data, error } = await supabaseClient
      .from('announcement_reactions')
      .select('announcement_reaction_id, announcement_id, employee_id, reaction_type, created_at, updated_at, employee:employee_id (first_name, last_name, department)')
      .eq('announcement_id', announcementId)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('[announcementService] getReactions failed', error)
      return []
    }

    return (data || []).map((reaction) => {
      const employee = reaction.employee || {}
      return {
        announcement_reaction_id: reaction.announcement_reaction_id,
        employee_id: reaction.employee_id,
        reaction_type: reaction.reaction_type,
        created_at: reaction.created_at,
        updated_at: reaction.updated_at,
        employee_name: `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'Unknown',
        department: employee.department || '',
      }
    })
  },

  async getReactionSummary(announcementId) {
    const { data, error } = await supabaseClient
      .from('announcement_reactions')
      .select('reaction_type')
      .eq('announcement_id', announcementId)

    if (error) {
      console.error('[announcementService] getReactionSummary failed', error)
      return {}
    }

    return (data || []).reduce((summary, row) => {
      const type = row.reaction_type || 'unknown'
      summary[type] = (summary[type] || 0) + 1
      return summary
    }, {})
  },

  async getAnnouncementImages(announcementId) {
    const { data: { session } } = await supabaseClient.auth.getSession()
    const token = session?.access_token
    if (!token) throw new Error('No authentication token available.');

    try {
      const response = await fetch(`/api/announcementImages/${announcementId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result?.error || `Failed to load images (${response.status})`)
      }

      return result.data || []
    } catch (error) {
      console.error('[announcementService] API fallback to direct query:', error.message)
      try {
        const { data, error: supabaseError } = await supabaseClient
          .from('announcement_images')
          .select('announcement_image_id, announcement_id, image_url, created_at')
          .eq('announcement_id', announcementId)
          .order('created_at', { ascending: true })

        if (supabaseError) {
          console.warn('[announcementService] announcement_images unavailable:', supabaseError.message)
          return []
        }

        return data || []
      } catch (fallbackError) {
        console.error('[announcementService] Fallback image load failed:', fallbackError.message)
        return []
      }
    }
  },

  async uploadAnnouncementImage(announcementId, file) {
    const { data: { session } } = await supabaseClient.auth.getSession()
    const token = session?.access_token
    if (!token) throw new Error('No authentication token available.');

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`/api/announcementImages/${announcementId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result?.error || `Failed to upload image (${response.status})`)
      }

      return result.data
    } catch (error) {
      console.error('[announcementService] API fallback to direct upload:', error.message)
      const fileName = `announcement_${announcementId}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const { error: uploadError } = await supabaseClient.storage
        .from('document')
        .upload(fileName, file)

      if (uploadError) {
        throw new Error('Failed to upload image.', { cause: uploadError })
      }

      const { data: publicUrlData } = supabaseClient.storage
        .from('document')
        .getPublicUrl(fileName)

      const imageUrl = publicUrlData?.publicUrl || null
      if (!imageUrl) {
        throw new Error('Failed to get image URL.')
      }

      const { error: insertError } = await supabaseClient
        .from('announcement_images')
        .insert({
          announcement_id: announcementId,
          image_url: imageUrl,
        })

      if (insertError) {
        console.warn('[announcementService] announcement_images insert failed:', insertError.message)
      }

      return {
        announcement_image_id: null,
        announcement_id: announcementId,
        image_url: imageUrl,
        created_at: new Date().toISOString(),
      }
    }
  },

  async getComments(announcementId) {
    const { data: { session } } = await supabaseClient.auth.getSession()
    const token = session?.access_token
    if (!token) throw new Error('No authentication token available.');

    try {
      const response = await fetch(`/api/announcementComments/${announcementId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result?.error || `Failed to load comments (${response.status})`)
      }

      return result.data || []
    } catch (error) {
      console.error('[announcementService] API fallback to direct query:', error.message)
      try {
        const { data, error: supabaseError } = await supabaseClient
          .from('announcement_comments')
          .select('comment_id, announcement_id, employee_id, comment_text, image_url, created_at, updated_at, employee:employee_id (first_name, last_name, department)')
          .eq('announcement_id', announcementId)
          .order('created_at', { ascending: true })

        if (supabaseError) {
          console.warn('[announcementService] announcement_comments unavailable:', supabaseError.message)
          return []
        }

        return (data || []).map((row) => {
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
        })
      } catch (fallbackError) {
        console.error('[announcementService] Fallback comments load failed:', fallbackError.message)
        return []
      }
    }
  },

  async createComment(announcementId, commentText, file = null) {
    const { data: { session } } = await supabaseClient.auth.getSession()
    const token = session?.access_token
    if (!token) throw new Error('No authentication token available.');

    const formData = new FormData()
    formData.append('commentText', commentText)
    if (file) {
      formData.append('file', file)
    }

    try {
      const response = await fetch(`/api/announcementComments/${announcementId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result?.error || `Failed to create comment (${response.status})`)
      }

      return result.data
    } catch (error) {
      console.error('[announcementService] API fallback to direct insert:', error.message)
      const { data: { user } } = await supabaseClient.auth.getUser()
      const { data: employee } = await supabaseClient
        .from('employee')
        .select('employee_id')
        .eq('user_id', user?.id)
        .maybeSingle()

      let imageUrl = null
      if (file) {
        const fileName = `comment_${announcementId}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
        const { error: uploadError } = await supabaseClient.storage
          .from('document')
          .upload(fileName, file)

        if (!uploadError) {
          const { data: publicUrlData } = supabaseClient.storage
            .from('document')
            .getPublicUrl(fileName)
          imageUrl = publicUrlData?.publicUrl || null
        }
      }

      const { data, error: insertError } = await supabaseClient
        .from('announcement_comments')
        .insert({
          announcement_id: announcementId,
          employee_id: employee?.employee_id,
          comment_text: commentText,
          image_url: imageUrl,
        })
        .select('comment_id, announcement_id, employee_id, comment_text, image_url, created_at, updated_at, employee:employee_id (first_name, last_name, department)')
        .single()

      if (insertError) {
        throw new Error('Failed to create comment.', { cause: insertError })
      }

      const emp = data.employee || {}
      return {
        comment_id: data.comment_id,
        announcement_id: data.announcement_id,
        employee_id: data.employee_id,
        comment_text: data.comment_text,
        image_url: data.image_url,
        created_at: data.created_at,
        updated_at: data.updated_at,
        employee_name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Unknown',
        department: emp.department || '',
      }
    }
  },

  async deleteComment(commentId) {
    const { data: { session } } = await supabaseClient.auth.getSession()
    const token = session?.access_token
    if (!token) throw new Error('No authentication token available.')

    try {
      const response = await fetch(`/api/announcementComments/delete`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ commentId }),
      })

      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result?.error || `Failed to delete comment (${response.status})`)
      }

      return result.data
    } catch (error) {
      console.error('[announcementService] API fallback to direct delete:', error.message)
      const { data: { user } } = await supabaseClient.auth.getUser()
      const { data: employee } = await supabaseClient
        .from('employee')
        .select('employee_id')
        .eq('user_id', user?.id)
        .maybeSingle()

      const { data: comment } = await supabaseClient
        .from('announcement_comments')
        .select('comment_id, employee_id')
        .eq('comment_id', commentId)
        .maybeSingle()

      if (!comment || comment.employee_id !== employee?.employee_id) {
        throw new Error('You can only delete your own comments.')
      }

      const { error: deleteError } = await supabaseClient
        .from('announcement_comments')
        .delete()
        .eq('comment_id', commentId)

      if (deleteError) {
        throw new Error('Failed to delete comment.', { cause: deleteError })
      }

      return { success: true }
    }
  },

  async addCommentReaction(commentId, reactionType) {
    const { data: { session } } = await supabaseClient.auth.getSession()
    const token = session?.access_token
    if (!token) throw new Error('No authentication token available.')

    try {
      const response = await fetch(`/api/announcementComments/${commentId}/reactions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reactionType }),
      })

      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result?.error || `Failed to add reaction (${response.status})`)
      }

      return result.data
    } catch (error) {
      console.error('[announcementService] API fallback to direct upsert:', error.message)
      const { data: { user } } = await supabaseClient.auth.getUser()
      const { data: employee } = await supabaseClient
        .from('employee')
        .select('employee_id')
        .eq('user_id', user?.id)
        .maybeSingle()

      const { error: upsertError } = await supabaseClient
        .from('comment_reactions')
        .upsert(
          { comment_id: commentId, employee_id: employee?.employee_id, reaction_type: reactionType, updated_at: new Date().toISOString() },
          { onConflict: ['comment_id', 'employee_id'] }
        )

      if (upsertError) {
        throw new Error('Failed to save reaction.', { cause: upsertError })
      }

      return { success: true }
    }
  },

  async getCommentReactions(commentId) {
    const { data: { session } } = await supabaseClient.auth.getSession()
    const token = session?.access_token
    if (!token) throw new Error('No authentication token available.')

    try {
      const response = await fetch(`/api/announcementComments/${commentId}/reactions`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result?.error || `Failed to load reactions (${response.status})`)
      }

      return result.data || []
    } catch (error) {
      console.error('[announcementService] API fallback to direct query:', error.message)
      const { data, error: supabaseError } = await supabaseClient
        .from('comment_reactions')
        .select('comment_reaction_id, comment_id, employee_id, reaction_type, created_at, updated_at, employee:employee_id (first_name, last_name, department)')
        .eq('comment_id', commentId)
        .order('updated_at', { ascending: false })

      if (supabaseError) {
        return []
      }

      return (data || []).map((row) => {
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
      })
    }
  },

  async getCommentReactionSummary(commentId) {
    const { data: { session } } = await supabaseClient.auth.getSession()
    const token = session?.access_token
    if (!token) throw new Error('No authentication token available.')

    try {
      const response = await fetch(`/api/announcementComments/${commentId}/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result?.error || `Failed to load reaction summary (${response.status})`)
      }

      return result.data || {}
    } catch (error) {
      console.error('[announcementService] API fallback to direct query:', error.message)
      const { data, error: supabaseError } = await supabaseClient
        .from('comment_reactions')
        .select('reaction_type')
        .eq('comment_id', commentId)

      if (supabaseError) {
        return {}
      }

      return (data || []).reduce((summary, row) => {
        const type = row.reaction_type || 'unknown'
        summary[type] = (summary[type] || 0) + 1
        return summary
      }, {})
    }
  },
}

